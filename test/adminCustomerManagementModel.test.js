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
  buildCalendarMonth,
  buildCustomerManagementCalendarActivities,
  buildCrmEventPayload,
  buildScheduleSummary,
  filterCustomerManagementCalendarActivities,
  filterCrmEvents,
  formatEventTimeRange,
  getEventStatusLabel,
  getEventTypeLabel,
  getCalendarActivitiesForDate,
  getCalendarDayDots,
  getEventsForDate,
  getThisWeekEvents,
  getTodayEvents,
  getUpcomingEvents,
  sortCalendarActivities,
  sortCrmEvents,
  validateCrmEventForm,
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
const customerManagementPageSource = readFileSync(new URL("../src/components/admin/CustomerManagementPage.jsx", import.meta.url), "utf8");

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

  it("builds and validates schedule payloads without losing optional nulls", () => {
    const payload = buildCrmEventPayload({
      title: "  Maria consultation ",
      lead_id: "lead-1",
      contractor_id: "",
      event_type: "site visit",
      event_date: "2026-08-12",
      start_time: "09:00:00",
      end_time: "10:00",
      location: "  Timor Crest Office ",
      assigned_to: "",
      status: "scheduled",
      memo: "",
    });
    assert.deepEqual(payload, {
      title: "Maria consultation",
      lead_id: "lead-1",
      contractor_id: null,
      event_type: "site_visit",
      event_date: "2026-08-12",
      start_time: "09:00",
      end_time: "10:00",
      location: "Timor Crest Office",
      assigned_to: null,
      status: "scheduled",
      memo: null,
    });
    assert.equal(validateCrmEventForm(payload).valid, true);
    assert.deepEqual(validateCrmEventForm({}).errors, ["title", "event_date"]);
    assert.deepEqual(validateCrmEventForm({ title: "Meeting", event_date: "2026-08-12", start_time: "10:00", end_time: "09:00" }).errors, ["end_time"]);
  });

  it("filters, sorts, and maps linked schedules safely", () => {
    const leads = [{ id: "lead-1", full_name: "Maria Fernandes", phone: "7777" }];
    const contractors = [{ id: "contractor-1", full_name: "Jose da Costa" }];
    const events = [
      { id: "later", event_date: "2026-08-12", start_time: "11:00", title: "Payment follow-up", lead_id: "lead-1", event_type: "payment", status: "scheduled" },
      { id: "earlier", event_date: "2026-08-12", start_time: "09:00", title: "Maria consultation", lead_id: "lead-1", event_type: "consultation", status: "completed" },
      { id: "unlinked", event_date: "2026-08-13", title: "Site visit", contractor_id: "contractor-1", location: "Site Office", event_type: "site_visit", status: "scheduled" },
    ];
    assert.deepEqual(sortCrmEvents(events).map((event) => event.id), ["earlier", "later", "unlinked"]);
    assert.equal(filterCrmEvents(events, leads, contractors, { query: "maria", event_type: "all", status: "all" }).length, 2);
    assert.equal(filterCrmEvents(events, leads, contractors, { query: "site office", event_type: "site_visit", status: "scheduled" }).length, 1);
    assert.equal(getEventsForDate(events, "2026-08-12").length, 2);
    assert.equal(getEventTypeLabel("site_visit", "kr"), "현장 방문");
    assert.equal(getEventStatusLabel("no_show", "en"), "No Show");
    assert.equal(formatEventTimeRange(null, null, "kr"), "종일");
  });

  it("calculates schedule summaries for today, this week, upcoming, and completed", () => {
    const events = [
      { id: "today", event_date: "2026-08-09", status: "scheduled" },
      { id: "tomorrow", event_date: "2026-08-10", status: "scheduled" },
      { id: "cancelled", event_date: "2026-08-11", status: "cancelled" },
      { id: "completed", event_date: "2026-08-08", status: "completed" },
      { id: "next-month", event_date: "2026-09-01", status: "scheduled" },
    ];
    assert.equal(getTodayEvents(events, now).length, 1);
    assert.equal(getThisWeekEvents(events, now).length, 2);
    assert.equal(getUpcomingEvents(events, now).length, 2);
    assert.deepEqual(buildScheduleSummary(events, now).counts, { today: 1, thisWeek: 2, upcoming: 2, completed: 1, total: 4 });
  });

  it("builds a complete calendar month grid", () => {
    const calendar = buildCalendarMonth(2026, 7);
    assert.equal(calendar.daysInMonth, 31);
    assert.equal(calendar.cells.length % 7, 0);
    assert.equal(calendar.cells.filter(Boolean).length, 31);
  });

  it("builds one calendar activity stream from schedules and consultations", () => {
    const leads = [{ id: "lead-1", full_name: "Maria Updated", phone: "7999" }];
    const activities = buildCustomerManagementCalendarActivities({
      events: [{ id: "event-1", lead_id: "lead-1", title: "Unit tour", event_date: "2026-08-12", start_time: "10:00", event_type: "site_visit", status: "scheduled" }],
      consultations: [{ id: "note-1", lead_id: "lead-1", consultation_date: "2026-08-10T14:00", next_follow_up_date: "2026-08-12", summary: "Discussed floor plan", next_action: "Send brochure", method: "phone", result: "high_interest" }],
      leads,
    });
    assert.deepEqual(activities.map((activity) => activity.id), ["consultation:note-1:date", "event:event-1", "consultation:note-1:follow-up"]);
    assert.equal(activities[0].customer_name, "Maria Updated");
    assert.equal(activities[0].customer_phone, "7999");
    assert.equal(activities[0].is_read_only, true);
    assert.equal(activities[0].activity_type, "consultation_date");
    assert.equal(activities[2].activity_type, "next_follow_up");
    assert.equal(activities[2].next_action, "Send brochure");
    assert.equal(getCalendarActivitiesForDate(activities, "2026-08-12").length, 2);
    assert.equal(getCalendarDayDots(activities, "2026-08-12").length, 2);
  });

  it("filters and sorts calendar activities without losing read-only links", () => {
    const activities = buildCustomerManagementCalendarActivities({
      events: [{ id: "event-1", title: "Payment review", event_date: "2026-08-12", start_time: "11:00", status: "scheduled" }],
      consultations: [{ id: "note-1", consultation_date: "2026-08-12", summary: "Call about payment", next_action: "Send payment plan" }],
    });
    assert.deepEqual(sortCalendarActivities(activities).map((activity) => activity.id), ["event:event-1", "consultation:note-1:date"]);
    assert.equal(filterCustomerManagementCalendarActivities(activities, { query: "payment plan", event_type: "all", status: "all" }).length, 1);
    assert.equal(filterCustomerManagementCalendarActivities(activities, { query: "", event_type: "follow_up_call", status: "all" }).length, 0);
    const unlinked = buildCustomerManagementCalendarActivities({ consultations: [{ id: "note-2", consultation_date: "2026-08-13" }] })[0];
    assert.equal(unlinked.customer_name, null);
    assert.equal(unlinked.title, "Consultation: Unlinked");
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
    assert.match(sidebar, /Customer\/Schedule/);
  });

  it("toggles lead and consultation details when the same row is selected again", () => {
    assert.match(customerManagementPageSource, /function toggleLeadSelection\(leadId\)/);
    assert.match(customerManagementPageSource, /current === leadId \? \"\" : leadId/);
    assert.match(customerManagementPageSource, /function toggleConsultationSelection\(consultationId\)/);
    assert.match(customerManagementPageSource, /current === consultationId \? \"\" : consultationId/);
    assert.match(customerManagementPageSource, /onSelect=\{\(\) => toggleLeadSelection\(lead\.id\)\}/);
    assert.match(customerManagementPageSource, /onSelect=\{\(\) => toggleConsultationSelection\(note\.id\)\}/);
  });
});
