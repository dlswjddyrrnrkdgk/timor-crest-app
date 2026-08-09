import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildCustomerManagementSummary,
  calculateConsultationStats,
  calculateEventStats,
  calculateSearchStats,
  getTopSearchQueries,
  normalizeLeadStatus,
} from "../src/services/adminCustomerManagementModel.js";

const now = new Date("2026-08-09T12:00:00Z");

describe("Customer Management model", () => {
  it("returns safe zero values for empty data", () => {
    const summary = buildCustomerManagementSummary({}, now);
    assert.deepEqual(summary.kpis, { totalLeads: 0, consultationsThisMonth: 0, upcomingMeetings: 0, searchImpressions: 0 });
    assert.equal(summary.search.averagePosition, null);
  });

  it("counts leads and consultations in the current month", () => {
    const summary = buildCustomerManagementSummary({
      salesLeads: [{ id: "lead-1", lead_date: "2026-08-08", status: "new" }, { id: "lead-2", lead_date: "2026-07-31" }],
      consultationNotes: [
        { id: "note-1", consultation_date: "2026-08-01T10:00:00Z" },
        { id: "note-2", consultation_date: "2026-07-31T10:00:00Z" },
      ],
    }, now);
    assert.equal(summary.kpis.totalLeads, 2);
    assert.equal(summary.kpis.consultationsThisMonth, 1);
    assert.equal(normalizeLeadStatus("High Potential"), "high_potential");
  });

  it("counts non-cancelled upcoming events without including past dates", () => {
    const stats = calculateEventStats([
      { event_date: "2026-08-09", status: "scheduled" },
      { event_date: "2026-08-10", status: "cancelled" },
      { event_date: "2026-08-11", status: "scheduled" },
      { event_date: "2026-08-08", status: "scheduled" },
    ], now);
    assert.equal(stats.upcoming.length, 2);
    assert.equal(stats.today.length, 1);
  });

  it("sums search metrics and derives CTR without losing zero values", () => {
    const stats = calculateSearchStats([
      { query: "timor crest", clicks: 10, impressions: 100, average_position: 5 },
      { query: "timor crest", clicks: 0, impressions: 50, average_position: 7 },
      { query: "dili apartments", clicks: 5, impressions: 0, average_position: null },
    ]);
    assert.equal(stats.impressions, 150);
    assert.equal(stats.clicks, 15);
    assert.equal(stats.ctr, 10);
    assert.equal(stats.topQueries[0].impressions, 150);
    assert.equal(getTopSearchQueries([]).length, 0);
  });

  it("handles null and invalid rows without throwing", () => {
    assert.doesNotThrow(() => buildCustomerManagementSummary({ salesLeads: [null], consultationNotes: [undefined], crmEvents: [null], searchSnapshots: [null] }, now));
  });

  it("declares the admin-only migration and new route wiring", () => {
    const migration = readFileSync(new URL("../supabase/migrations/0008_customer_management.sql", import.meta.url), "utf8");
    const route = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
    assert.match(migration, /create table public\.sales_leads/);
    assert.match(migration, /create table public\.consultation_notes/);
    assert.match(migration, /create table public\.crm_events/);
    assert.match(migration, /create table public\.search_performance_snapshots/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /for select to authenticated using \(public\.is_admin\(\)\)/);
    assert.match(route, /path="customer-management"/);
    assert.match(sidebar, /Customer Management/);
  });
});
