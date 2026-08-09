import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildConsultationPayload,
  buildCustomerManagementSummary,
  buildSalesLeadPayload,
  calculateConsultationStats,
  calculateEventStats,
  calculateSearchStats,
  filterConsultationNotes,
  filterSalesLeads,
  getConsultationMethodLabel,
  getConsultationResultLabel,
  getLeadSourceLabel,
  getLeadStatusLabel,
  getTopSearchQueries,
  normalizeLeadStatus,
  sortConsultationNotes,
  sortSalesLeads,
  validateConsultationForm,
  validateSalesLeadForm,
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

  it("builds and validates a sales lead payload", () => {
    const payload = buildSalesLeadPayload({ lead_date: "2026-08-09", full_name: "  Maria Fernandes ", email: "maria@example.com", source: "google_ads", status: "high potential", phone: "", memo: "" });
    assert.deepEqual(payload, { lead_date: "2026-08-09", full_name: "Maria Fernandes", phone: null, email: "maria@example.com", source: "google_ads", interested_unit: null, assigned_to: null, status: "high_potential", memo: null });
    assert.equal(validateSalesLeadForm(payload).valid, true);
    assert.equal(validateSalesLeadForm({ lead_date: "2026-08-09", full_name: "Maria", email: "invalid" }).valid, false);
    assert.deepEqual(validateSalesLeadForm({}).errors, ["lead_date", "full_name"]);
  });

  it("filters and sorts leads across all requested search fields", () => {
    const leads = [
      { id: "old", lead_date: "2026-08-01", full_name: "Old Lead", phone: "7000", source: "website", status: "new", memo: "sea view" },
      { id: "new", lead_date: "2026-08-09", full_name: "Maria Fernandes", phone: "7777", email: "maria@example.com", interested_unit: "A-1203", assigned_to: "Daniel", source: "google_ads", status: "high_potential" },
    ];
    assert.deepEqual(sortSalesLeads(leads).map((lead) => lead.id), ["new", "old"]);
    assert.equal(filterSalesLeads(leads, { query: "a-1203", status: "all", source: "all" }).length, 1);
    assert.equal(filterSalesLeads(leads, { query: "", status: "high_potential", source: "google_ads" }).length, 1);
    assert.equal(filterSalesLeads(leads, { query: "sea view", status: "all", source: "all" }).length, 1);
  });

  it("builds and validates consultation payloads with optional links", () => {
    const payload = buildConsultationPayload({ lead_id: "lead-1", contractor_id: "", consultation_date: "2026-08-09T14:30", method: "video call", summary: "  Discussed unit layout. ", customer_interest: "", result: "high interest" });
    assert.equal(payload.lead_id, "lead-1");
    assert.equal(payload.contractor_id, null);
    assert.equal(payload.method, "video_call");
    assert.equal(payload.summary, "Discussed unit layout.");
    assert.equal(payload.customer_interest, null);
    assert.equal(validateConsultationForm(payload).valid, true);
    assert.deepEqual(validateConsultationForm({}).errors, ["consultation_date", "summary"]);
  });

  it("maps, filters, and sorts consultations when a lead is unlinked", () => {
    const leads = [{ id: "lead-1", full_name: "Maria Fernandes" }];
    const notes = [
      { id: "note-old", lead_id: "lead-1", consultation_date: "2026-08-01", method: "phone", result: "on_hold", summary: "Old call", consultant: "Ana" },
      { id: "note-new", lead_id: null, consultation_date: "2026-08-09", method: "video_call", result: "high_interest", summary: "Unlinked discussion", consultant: "Daniel", next_action: "Send plan" },
    ];
    assert.deepEqual(sortConsultationNotes(notes).map((note) => note.id), ["note-new", "note-old"]);
    assert.equal(filterConsultationNotes(notes, leads, { query: "send plan", method: "all", result: "all" }).length, 1);
    assert.equal(filterConsultationNotes(notes, leads, { query: "maria", method: "phone", result: "on_hold" }).length, 1);
    assert.equal(getConsultationMethodLabel("video_call", "kr"), "화상 미팅");
    assert.equal(getConsultationResultLabel("high_interest", "en"), "High Interest");
    assert.equal(getLeadStatusLabel("high_potential", "kr"), "계약 가능성 높음");
    assert.equal(getLeadSourceLabel("google_search", "en"), "Google Search");
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
