import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { getAdminContractors } from "./contractorService.js";

const SALES_LEADS_SELECT = "id, lead_date, full_name, phone, email, source, interested_unit, assigned_to, status, memo, created_at, updated_at";
const CONSULTATION_NOTES_SELECT = "id, lead_id, contractor_id, consultation_date, method, consultant, summary, customer_interest, next_action, next_follow_up_date, result, created_at, updated_at";
const CRM_EVENTS_SELECT = "id, lead_id, contractor_id, title, event_type, event_date, start_time, end_time, location, assigned_to, memo, status, created_at, updated_at";
const SEARCH_SNAPSHOTS_SELECT = "id, report_date, query, page_url, clicks, impressions, ctr, average_position, source, memo, created_at, updated_at";

export async function listSalesLeads() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("sales_leads").select(SALES_LEADS_SELECT).order("lead_date", { ascending: false });
  return respond(data, error);
}

export async function listConsultationNotes() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("consultation_notes").select(CONSULTATION_NOTES_SELECT).order("consultation_date", { ascending: false });
  return respond(data, error);
}

export async function listCrmEvents() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("crm_events").select(CRM_EVENTS_SELECT).order("event_date", { ascending: true });
  return respond(data, error);
}

export async function listSearchPerformanceSnapshots() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("search_performance_snapshots").select(SEARCH_SNAPSHOTS_SELECT).order("report_date", { ascending: false });
  return respond(data, error);
}

export async function loadCustomerManagementDashboard() {
  if (!isSupabaseConfigured) return { data: emptyDashboard(), error: SUPABASE_CONFIG_MESSAGE };

  const [leadsResult, consultationsResult, eventsResult, searchResult, contractorsResult] = await Promise.all([
    listSalesLeads(),
    listConsultationNotes(),
    listCrmEvents(),
    listSearchPerformanceSnapshots(),
    getAdminContractors(),
  ]);

  return {
    data: {
      salesLeads: leadsResult.data || [],
      consultationNotes: consultationsResult.data || [],
      crmEvents: eventsResult.data || [],
      searchSnapshots: searchResult.data || [],
      contractors: contractorsResult.data || [],
    },
    error: leadsResult.error || consultationsResult.error || eventsResult.error || searchResult.error || contractorsResult.error || null,
  };
}

function emptyDashboard() {
  return { salesLeads: [], consultationNotes: [], crmEvents: [], searchSnapshots: [], contractors: [] };
}

function respond(data, error) {
  return { data: data || [], error: error?.message || null };
}

function fail(error) {
  return { data: [], error };
}
