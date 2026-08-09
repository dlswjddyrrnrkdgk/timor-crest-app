import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  buildReportsCsv,
  buildReportsSummary,
  calculateDocumentReport,
  calculateJourneyReport,
  calculatePaymentReport,
  calculateReportKpis,
  calculateSalesReport,
  calculateUnitReport,
  filterReportsByDateRange,
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

  it("builds a summary-only CSV without customer PII", () => {
    const csv = buildReportsCsv(buildReportsSummary({ contractors, units, paymentItems, documents, journeySteps }));
    assert.match(csv, /metric,value/);
    assert.match(csv, /outstanding_balance,75000/);
    assert.doesNotMatch(csv, /Jose Costa/);
  });

  it("connects the protected reports route, sidebar, page, styles, and bilingual labels", () => {
    const layout = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/components/admin/ReportsPage.jsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const key of ["Reports", "Analyze sales, unit inventory, payments, documents, and project progress.", "Export CSV", "Print", "Date Range", "Sales Overview", "Unit Inventory Report", "Payment Collection Report", "Documents Report", "Journey Progress Report", "Outstanding Balance", "Collection Rate", "No report data."]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
    assert.match(layout, /<Route path="reports" element={<ReportsPage \{\.\.\.shell\} \/>} \/>/);
    assert.match(sidebar, /\["\/admin\/reports", "Reports", "trend"\]/);
    assert.match(page, /buildReportsCsv/);
    assert.match(page, /window\.print/);
    assert.match(styles, /\.crm-reports__section-grid/);
  });
});
