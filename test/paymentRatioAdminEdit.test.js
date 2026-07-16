import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
const paymentServiceSource = readFileSync(new URL("../src/services/paymentService.js", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/migrations/0007_payment_item_ratios.sql", import.meta.url), "utf8");

test("payment ratio migration adds nullable constrained ratio column", () => {
  assert.match(migrationSource, /add column if not exists payment_ratio numeric\(6,2\)/);
  assert.match(migrationSource, /payment_ratio >= 0 and payment_ratio <= 100/);
  assert.doesNotMatch(migrationSource, /drop table|disable row level security/i);
});

test("payment service selects and updates payment_ratio without omitting zero values", () => {
  assert.match(paymentServiceSource, /payment_ratio/);
  assert.match(paymentServiceSource, /buildPaymentItemUpdatePayload/);
  assert.match(paymentServiceSource, /updatePaymentItems/);
  assert.doesNotMatch(paymentServiceSource, /if\s*\(\s*payment_ratio\s*\)/);
});

test("admin payment schedule uses draft state with one bottom save button", () => {
  assert.match(adminLayoutSource, /paymentOriginalItems/);
  assert.match(adminLayoutSource, /getChangedPaymentItemPayloads/);
  assert.match(adminLayoutSource, /updatePaymentDraftItem/);
  assert.match(adminLayoutSource, /name="payment_ratio"[^>]+step="1"/);
  assert.match(adminLayoutSource, /name="required_amount"[^>]+step="1"/);
  assert.match(adminLayoutSource, /Math\.trunc\(Number\(value \?\? 0\)\)/);
  assert.match(adminLayoutSource, /단계별 납부일정 저장/);
  assert.match(adminLayoutSource, /disabled=\{!hasPaymentItemChanges \|\| status === "saving"\}/);
  assert.doesNotMatch(adminLayoutSource, /step="0\.01"|toFixed\(1\)|maximumFractionDigits:\s*1|minimumFractionDigits/);
});

test("contractor payment cards show ratio, step amount, paid amount, and unpaid amount read-only", () => {
  assert.match(contractorLayoutSource, /normalizePaymentItem/);
  assert.match(contractorLayoutSource, /getPaymentItemUnpaidAmount/);
  assert.match(contractorLayoutSource, /납부 비율/);
  assert.match(contractorLayoutSource, /단계별 납부 금액/);
  assert.match(contractorLayoutSource, /미납 금액/);
  assert.match(contractorLayoutSource, /Math\.trunc\(Number\(value\)\)/);
  assert.doesNotMatch(contractorLayoutSource, /toFixed\(1\)|maximumFractionDigits:\s*1|minimumFractionDigits/);
  assert.doesNotMatch(contractorLayoutSource, /updatePaymentItems|updatePaymentDraftItem|단계별 납부일정 저장/);
});

test("payment ratio work does not add frontend privileged auth paths", () => {
  for (const source of [adminLayoutSource, contractorLayoutSource, paymentServiceSource]) {
    assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp|createUser/);
  }
});
