import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  buildAccountingTransactionPayload,
  calculateAccountingSummary,
  calculateRunningBalance,
  emptyStringToNull,
  filterAccountingTransactions,
  formatAccountingAmount,
  groupTransactionsByDate,
  getAccountCategoryOptions,
  getDirectionLabel,
  getPaymentMethodLabel,
  getTaxCategoryLabel,
  sortAccountingTransactions,
  validateAccountingTransactionForm,
} from "../src/services/accountingModel.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const validForm = {
  transaction_date: "2026-09-02",
  direction: "income",
  account_category: "unit_sale_payment",
  tax_category: "not_reviewed",
  counterparty_name: "Maria Fernandes",
  description: "A-1203 installment",
  payment_method: "bank_transfer",
  amount: "15000.50",
  reference_no: "TRX-1001",
  related_unit_id: "unit-1",
  related_contractor_id: "contractor-1",
  source_type: "manual",
  memo: "September receipt",
};

describe("Accounting model", () => {
  it("builds a project-scoped sanitized payload", () => {
    const payload = buildAccountingTransactionPayload(validForm, projectId);
    assert.equal(payload.project_id, projectId);
    assert.equal(payload.amount, 15000.5);
    assert.equal(payload.description, "A-1203 installment");
  });

  it("validates required fields, allowed direction, and safe amounts", () => {
    assert.equal(validateAccountingTransactionForm(validForm, projectId).valid, true);
    for (const [field, value, error] of [
      ["transaction_date", "", "transaction_date_required"],
      ["direction", "sideways", "direction_invalid"],
      ["account_category", "", "account_category_required"],
      ["description", "", "description_required"],
      ["amount", "", "amount_required"],
      ["amount", "-1", "amount_negative"],
      ["amount", "NaN", "amount_invalid"],
    ]) {
      const result = validateAccountingTransactionForm({ ...validForm, [field]: value }, projectId);
      assert.equal(result.valid, false);
      assert.equal(result.fieldErrors[field], error);
    }
    assert.equal(validateAccountingTransactionForm(validForm, "").fieldErrors.project_id, "project_required");
  });

  it("normalizes empty optional fields to null", () => {
    const payload = buildAccountingTransactionPayload({
      ...validForm,
      counterparty_name: " ",
      memo: "",
      reference_no: null,
      related_unit_id: "",
      related_contractor_id: undefined,
    }, projectId);
    assert.equal(emptyStringToNull("  "), null);
    assert.equal(payload.counterparty_name, null);
    assert.equal(payload.memo, null);
    assert.equal(payload.reference_no, null);
    assert.equal(payload.related_unit_id, null);
    assert.equal(payload.related_contractor_id, null);
  });

  it("calculates income, expense, net flow, date summaries, and current balance", () => {
    const rows = [
      { amount: 1000, direction: "income", transaction_date: "2026-09-02" },
      { amount: 250, direction: "expense", transaction_date: "2026-09-02" },
      { amount: 500, direction: "income", transaction_date: "2026-09-01" },
      { amount: 100, direction: "expense", transaction_date: "2026-08-31" },
    ];
    const summary = calculateAccountingSummary(rows, new Date(2026, 8, 2, 12));
    assert.equal(summary.totalIncome, 1500);
    assert.equal(summary.totalExpense, 350);
    assert.equal(summary.netCashFlow, 1150);
    assert.equal(summary.currentBalance, 1150);
    assert.equal(summary.todayIncome, 1000);
    assert.equal(summary.todayExpense, 250);
    assert.equal(summary.monthIncome, 1500);
    assert.equal(summary.monthExpense, 250);
    assert.equal(summary.incomeCount, 2);
    assert.equal(summary.expenseCount, 2);
  });

  it("returns safe zero summaries for empty or invalid input", () => {
    for (const input of [[], null, undefined]) {
      const summary = calculateAccountingSummary(input, new Date(2026, 8, 2));
      assert.equal(summary.totalIncome, 0);
      assert.equal(summary.totalExpense, 0);
      assert.equal(summary.netCashFlow, 0);
      assert.equal(Number.isFinite(summary.averageIncome), true);
      assert.equal(Number.isFinite(summary.averageExpense), true);
    }
  });

  it("calculates running balances chronologically before latest-first display", () => {
    const balances = calculateRunningBalance([
      { id: "expense", amount: 200, direction: "expense", transaction_date: "2026-09-02", created_at: "2026-09-02T10:00:00Z" },
      { id: "income", amount: 1000, direction: "income", transaction_date: "2026-09-01", created_at: "2026-09-01T10:00:00Z" },
    ], 100);
    assert.deepEqual(balances.map((row) => [row.id, row.runningBalance]), [["income", 1100], ["expense", 900]]);
  });

  it("filters search, categories, payment methods, and date ranges", () => {
    const rows = [
      { ...validForm, id: "income", project_id: projectId, amount: 1000, memo: "September receipt" },
      { ...validForm, id: "expense", project_id: projectId, transaction_date: "2026-08-01", direction: "expense", account_category: "marketing", tax_category: "service_tax_review", payment_method: "card", amount: 200, counterparty_name: "Ad Studio", description: "Campaign", reference_no: "ADS-9" },
    ];
    assert.deepEqual(filterAccountingTransactions(rows, { search: "Maria" }).map((row) => row.id), ["income"]);
    assert.deepEqual(filterAccountingTransactions(rows, { search: "Campaign" }).map((row) => row.id), ["expense"]);
    assert.deepEqual(filterAccountingTransactions(rows, { search: "ADS-9" }).map((row) => row.id), ["expense"]);
    assert.equal(filterAccountingTransactions(rows, { direction: "expense" }).length, 1);
    assert.equal(filterAccountingTransactions(rows, { accountCategory: "marketing" }).length, 1);
    assert.equal(filterAccountingTransactions(rows, { taxCategory: "service_tax_review" }).length, 1);
    assert.equal(filterAccountingTransactions(rows, { paymentMethod: "card" }).length, 1);
    assert.equal(filterAccountingTransactions(rows, { dateFrom: "2026-09-01" }).length, 1);
    assert.equal(filterAccountingTransactions(rows, { period: "this_month" }, new Date(2026, 8, 2)).length, 1);
    assert.equal(filterAccountingTransactions(rows, { period: "this_week" }, new Date(2026, 8, 2)).length, 1);
  });

  it("groups transactions by date without crashing on empty values", () => {
    const grouped = groupTransactionsByDate([
      { id: "a", transaction_date: "2026-09-02" },
      { id: "b", transaction_date: "2026-09-02" },
      { id: "c", transaction_date: "2026-09-01" },
      { id: "missing", transaction_date: null },
    ]);
    assert.equal(grouped["2026-09-02"].length, 2);
    assert.equal(grouped["2026-09-01"].length, 1);
    assert.deepEqual(groupTransactionsByDate(null), {});
  });

  it("sorts latest dates and creation times first", () => {
    const rows = sortAccountingTransactions([
      { id: "old", transaction_date: "2026-09-01", created_at: "2026-09-01T12:00:00Z" },
      { id: "newer-create", transaction_date: "2026-09-02", created_at: "2026-09-02T12:00:00Z" },
      { id: "older-create", transaction_date: "2026-09-02", created_at: "2026-09-02T10:00:00Z" },
    ]);
    assert.deepEqual(rows.map((row) => row.id), ["newer-create", "older-create", "old"]);
  });

  it("provides direction-specific options and bilingual labels", () => {
    assert.ok(getAccountCategoryOptions("income").includes("installment_payment"));
    assert.ok(getAccountCategoryOptions("expense").includes("construction_cost"));
    assert.equal(getDirectionLabel("income", "kr"), "수입");
    assert.equal(getPaymentMethodLabel("bank_transfer", "kr"), "은행이체");
    assert.equal(getTaxCategoryLabel("withholding_tax_review", "en"), "Withholding Tax Review");
    assert.equal(formatAccountingAmount(1234567.89), "$1,234,567.89");
  });

  it("defines the project-scoped migration without exposing contractors", () => {
    const migration = readFileSync(new URL("../supabase/migrations/0012_accounting_foundation.sql", import.meta.url), "utf8");
    assert.match(migration, /project_id uuid not null references public\.projects\(id\) on delete cascade/);
    assert.match(migration, /alter table public\.accounting_transactions enable row level security/);
    assert.match(migration, /for select to authenticated[\s\S]*using \(public\.is_admin\(\)\)/);
    assert.doesNotMatch(migration, /payment_items[\s\S]*project_id/i);
    assert.doesNotMatch(migration, /contractor.*policy/i);
  });

  it("scopes every accounting service mutation to the selected project", () => {
    const service = readFileSync(new URL("../src/services/accountingService.js", import.meta.url), "utf8");
    assert.match(service, /from\("accounting_transactions"\)[\s\S]*eq\("project_id", projectId\)/);
    assert.match(service, /insert\(payload\)/);
    assert.match(service, /const \{ project_id: _projectId, \.\.\.payload \}/);
    assert.match(service, /update\(payload\)[\s\S]*eq\("id", id\)[\s\S]*eq\("project_id", projectId\)/);
    assert.match(service, /delete\(\)[\s\S]*eq\("id", id\)[\s\S]*eq\("project_id", projectId\)/);
    assert.match(service, /getUnits\(projectId\)/);
    assert.match(service, /getAdminContractors\(projectId\)/);
    assert.doesNotMatch(service, /service_role|VITE_SUPABASE_SERVICE/i);
  });

  it("connects Accounting, the Reports redirect, CRUD UI, and bilingual labels", () => {
    const layout = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/components/admin/AccountingPage.jsx", import.meta.url), "utf8");
    const contractorLayout = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const key of [
      "Accounting",
      "Manage single-entry cashbook records, project cash flow, and tax reference categories.",
      "Accounting Summary",
      "Cashbook",
      "Add Transaction",
      "Tax Reference Notice",
      "Unit Payment Excel Export",
      "No accounting transactions yet.",
    ]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
    assert.equal(translations.kr.Accounting, "회계관리");
    assert.match(sidebar, /\["\/admin\/accounting", "Accounting", "payment"\]/);
    assert.match(layout, /<Route path="accounting" element={<AccountingPage \{\.\.\.shell\} \/>} \/>/);
    assert.match(layout, /<Route path="reports" element={<Navigate replace to="\/admin\/accounting" \/>} \/>/);
    assert.match(page, /createAccountingTransaction/);
    assert.match(page, /updateAccountingTransaction/);
    assert.match(page, /deleteAccountingTransaction/);
    assert.match(page, /buildExcelTableHtml/);
    assert.match(page, /crm-accounting__mobile-card/);
    assert.match(page, /current === transaction\.id \? "" : transaction\.id/);
    assert.match(styles, /\.crm-accounting__ledger-layout/);
    assert.match(styles, /\.crm-accounting__mobile-card/);
    assert.doesNotMatch(contractorLayout, /AccountingPage|accounting_transactions|\/contractor\/accounting/);
  });
});
