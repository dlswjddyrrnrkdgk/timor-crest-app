import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  buildExcelTableHtml,
  buildReportsSummary,
  buildUnitPaymentExportRows,
  buildUnitPaymentExportSummary,
  calculateDocumentReport,
  calculateJourneyReport,
  calculatePaymentReport,
  calculateReportKpis,
  calculateSalesReport,
  calculateUnitReport,
  calculateExportStepStatus,
  filterReportsByDateRange,
  getPaymentStepExportColumns,
  getPaymentStatus,
  normalizeProgress,
} from "../src/services/adminReportsModel.js";

const now = new Date("2026-08-09T12:00:00Z");
const contractors = [
  { created_at: "2026-08-08T12:00:00Z", full_name: "Jose Costa", id: "jose", status: "active", unit_id: "unit-1" },
  { created_at: "2026-08-01T12:00:00Z", full_name: "Sarah Lee", id: "sarah", status: "active", unit_id: null },
  { full_name: "Archived Buyer", id: "archived", status: "archived", unit_id: "unit-2" },
];
const units = [
  { id: "unit-1", status: "active", total_price: 100000, unit_code: "A-0501" },
  { id: "unit-2", status: "reserved", total_price: 80000, unit_code: "A-0502" },
  { id: "unit-3", status: "hold", total_price: 0, unit_code: "B-0101" },
  { id: "unit-4", status: "active", total_price: 50000, unit_code: "B-0102" },
];
const paymentItems = [
  { contractor_id: "jose", paid_amount: 25000, required_amount: 100000, step_no: 1, updated_at: "2026-08-08T12:00:00Z" },
  { contractor_id: "jose", paid_amount: 0, required_amount: 0, step_no: 2 },
  { contractor_id: "sarah", paid_amount: 120000, required_amount: 100000, step_no: 1 },
];
const paymentSummaries = {
  jose: {
    plan: { contractor_id: "jose", id: "plan-jose", total_price: 100000, unit_id: "unit-1" },
    items: [
      { paid_amount: 25000, required_amount: 100000, step_no: 1 },
      { paid_amount: 0, required_amount: 0, step_no: 2 },
    ],
  },
};
const documents = [
  { category: "contract", contractor_id: "jose", created_at: "2026-08-07T12:00:00Z", file_name: "contract.pdf" },
  { category: "receipt", contractor_id: "jose", created_at: "2026-07-01T12:00:00Z", file_name: "receipt.pdf" },
];
const journeySteps = [
  { progress_percent: 100, step_no: 1, title: "Contract" },
  { progress_percent: 50, step_no: 2, title: "Design" },
  { progress_percent: 0, step_no: 3, title: "Foundation" },
];

describe("Admin Reports CRM model", () => {
  it("calculates KPI totals without losing zero values", () => {
    const kpis = calculateReportKpis({ contractors, units, paymentItems, documents, journeySteps });
    assert.equal(kpis.totalCustomers, 3);
    assert.equal(kpis.totalUnits, 4);
    assert.equal(kpis.assignedUnits, 1);
    assert.equal(kpis.totalContractValue, 230000);
    assert.equal(kpis.totalPaid, 145000);
    assert.equal(kpis.outstandingBalance, 75000);
    assert.equal(kpis.journeyProgress, 50);
  });

  it("calculates unit availability from active assignments and status", () => {
    assert.deepEqual(calculateUnitReport(units, contractors), {
      assigned: 1,
      available: 1,
      distribution: [
        { count: 1, key: "available" },
        { count: 1, key: "assigned" },
        { count: 1, key: "reserved" },
        { count: 1, key: "hold" },
      ],
      hold: 1,
      reserved: 1,
      total: 4,
    });
  });

  it("exposes the sales fields consumed by the report cards", () => {
    const sales = calculateSalesReport(contractors, calculateUnitReport(units, contractors));
    assert.equal(sales.assignedUnits, 1);
    assert.equal(sales.assignedCustomers, 1);
    assert.equal(sales.availability.available, 1);
  });

  it("calculates payment collection, statuses, and non-negative outstanding", () => {
    const report = calculatePaymentReport(paymentItems, contractors);
    assert.equal(report.totalRequired, 200000);
    assert.equal(report.totalPaid, 145000);
    assert.equal(report.outstanding, 75000);
    assert.equal(report.collectionRate, 73);
    assert.deepEqual(report.statusCounts, { noAmount: 1, paid: 1, partial: 1, pending: 0 });
    assert.equal(getPaymentStatus(0, 0), "noAmount");
    assert.equal(getPaymentStatus(100, 0), "pending");
    assert.equal(getPaymentStatus(100, 20), "partial");
    assert.equal(getPaymentStatus(100, 100), "paid");
    assert.equal(calculatePaymentReport([{ paid_amount: 100, required_amount: 50 }]).outstanding, 0);
    assert.equal(calculatePaymentReport([{ paid_amount: 0, required_amount: 0 }]).collectionRate, 0);
  });

  it("calculates recent documents and journey progress from actual rows", () => {
    assert.equal(calculateDocumentReport(documents, now).total, 2);
    assert.equal(calculateDocumentReport(documents, now).customersWithDocuments, 1);
    assert.equal(calculateDocumentReport(documents, now).recentlyUploaded, 1);
    const journey = calculateJourneyReport(journeySteps);
    assert.equal(journey.overallProgress, 50);
    assert.equal(journey.completed, 1);
    assert.equal(journey.inProgress, 1);
    assert.equal(journey.pending, 1);
    assert.equal(journey.remaining, 2);
    assert.equal(journey.currentStage.title, "Design");
    assert.equal(journey.steps[2].normalizedProgress, 0);
    assert.equal(normalizeProgress(-10), 0);
    assert.equal(normalizeProgress(110), 100);
  });

  it("keeps date-less rows visible and filters dated rows safely", () => {
    const filtered = filterReportsByDateRange({ contractors, documents, paymentItems }, "7", now);
    assert.equal(filtered.contractors.length, 2);
    assert.equal(filtered.documents.length, 1);
    assert.equal(filtered.paymentItems.length, 3);
  });

  it("builds one export row per unit and preserves unassigned buyers", () => {
    const rows = buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, "en");
    assert.equal(rows.length, 5);
    assert.equal(rows.filter((row) => !row.isOrphan).length, 4);
    assert.equal(rows.find((row) => row.unitCode === "A-0501").buyerName, "Jose Costa");
    assert.equal(rows.find((row) => row.unitCode === "A-0502").unitStatus, "Reserved");
    assert.equal(rows.find((row) => row.unitCode === "B-0101").buyerName, "");
    assert.equal(rows.at(-1).buyerName, "Sarah Lee");
    assert.equal(rows.at(-1).unitCode, "Unassigned");
  });

  it("flattens eight payment steps and keeps zero amounts and non-negative outstanding", () => {
    const rows = buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, "en");
    const jose = rows.find((row) => row.unitCode === "A-0501");
    assert.equal(jose.steps.length, 8);
    assert.equal(jose.steps[0].requiredAmount, 100000);
    assert.equal(jose.steps[0].paidAmount, 25000);
    assert.equal(jose.steps[0].outstandingAmount, 75000);
    assert.equal(jose.steps[0].status, "Partially Paid");
    assert.equal(jose.steps[1].requiredAmount, 0);
    assert.equal(jose.steps[1].paidAmount, 0);
    assert.equal(jose.steps[1].status, "No Amount");
    assert.equal(jose.steps[7].title, "Before Move-in");
    assert.equal(calculateExportStepStatus(100, 100), "Paid");
    assert.equal(calculateExportStepStatus(100, 25), "Partially Paid");
    assert.equal(calculateExportStepStatus(100, 0), "Pending");
    assert.equal(calculateExportStepStatus(0, 0), "No Amount");
    assert.equal(rows.every((row) => row.outstandingBalance >= 0), true);
  });

  it("calculates export summary totals from the same rows", () => {
    const rows = buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, "en");
    const summary = buildUnitPaymentExportSummary({ contractors, paymentSummaries, units }, "en", rows);
    assert.equal(summary.totalUnits, 4);
    assert.equal(summary.assignedUnits, 1);
    assert.equal(summary.unassignedUnits, 3);
    assert.equal(summary.totalContractValue, 230000);
    assert.equal(summary.totalRequired, 100000);
    assert.equal(summary.totalPaid, 25000);
    assert.equal(summary.outstandingBalance, 75000);
    assert.equal(summary.collectionRate, 25);
  });

  it("builds a single-sheet Excel-compatible HTML export with safe bilingual cells", () => {
    const rows = buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, "en");
    rows[0].buyerName = "=CMD()";
    const html = buildExcelTableHtml(buildUnitPaymentExportSummary({ contractors, paymentSummaries, units }, "en", rows), rows, "en");
    assert.match(html, /meta charset="UTF-8"/);
    assert.match(html, /Timor Crest Unit Payment Report/);
    assert.match(html, /1st Step Title/);
    assert.match(html, /8th Status/);
    assert.match(html, /A-0501/);
    assert.match(html, /&#39;=CMD\(\)/);
    assert.equal(getPaymentStepExportColumns("en").length, 55);
    assert.equal(getPaymentStepExportColumns("kr").length, 55);
    assert.match(buildExcelTableHtml({}, rows, "kr"), /세대 코드/);
  });

  it("connects the protected reports route, sidebar, page, styles, and bilingual labels", () => {
    const layout = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/components/admin/ReportsPage.jsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const key of ["Reports", "Analyze sales, unit inventory, payments, documents, and project progress.", "Export Excel", "Unit Payment Export", "This Excel file includes all units, assigned buyers, and installment payment details in one sheet.", "Print", "Date Range", "Sales Overview", "Unit Inventory Report", "Payment Collection Report", "Documents Report", "Journey Progress Report", "Outstanding Balance", "Collection Rate", "No report data."]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
    assert.match(layout, /<Route path="reports" element={<ReportsPage \{\.\.\.shell\} \/>} \/>/);
    assert.match(sidebar, /\["\/admin\/reports", "Reports", "trend"\]/);
    assert.doesNotMatch(page, /buildReportsCsv|Export CSV|\.csv/);
    assert.match(page, /buildExcelTableHtml/);
    assert.match(page, /\.xls/);
    assert.match(page, /crm-reports__export-preview/);
    assert.match(page, /window\.print/);
    assert.match(styles, /\.crm-reports__section-grid/);
    assert.match(styles, /\.crm-reports__export-preview/);
  });
});
