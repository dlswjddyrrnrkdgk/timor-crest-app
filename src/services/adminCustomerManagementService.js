import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { getAdminContractors } from "./contractorService.js";
import {
  buildConsultationPayload,
  buildSalesLeadPayload,
  validateConsultationForm,
  validateSalesLeadForm,
} from "./adminCustomerManagementModel.js";

const SALES_LEADS_SELECT = "id, lead_date, full_name, phone, email, source, interested_unit, assigned_to, status, memo, created_at, updated_at";
const CONSULTATION_NOTES_SELECT = "id, lead_id, contractor_id, consultation_date, method, consultant, summary, customer_interest, next_action, next_follow_up_date, result, created_at, updated_at";
const CRM_EVENTS_SELECT = "id, lead_id, contractor_id, title, event_type, event_date, start_time, end_time, location, assigned_to, memo, status, created_at, updated_at";
const SEARCH_SNAPSHOTS_SELECT = "id, report_date, query, page_url, clicks, impressions, ctr, average_position, source, memo, created_at, updated_at";

export async function listSalesLeads() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("sales_leads").select(SALES_LEADS_SELECT).order("lead_date", { ascending: false }).order("created_at", { ascending: false });
  return respond(data, error);
}

export async function listConsultationNotes() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const { data, error } = await supabase.from("consultation_notes").select(CONSULTATION_NOTES_SELECT).order("consultation_date", { ascending: false }).order("created_at", { ascending: false });
  return respond(data, error);
}

export async function createSalesLead(input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const validation = validateSalesLeadForm(input);
  if (!validation.valid) return fail(`Lead validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("sales_leads").insert(buildSalesLeadPayload(input)).select(SALES_LEADS_SELECT).single();
  return respond(data, error);
}

export async function updateSalesLead(id, input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const validation = validateSalesLeadForm(input);
  if (!id) return fail("Lead id is required.");
  if (!validation.valid) return fail(`Lead validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("sales_leads").update(buildSalesLeadPayload(input)).eq("id", id).select(SALES_LEADS_SELECT).single();
  return respond(data, error);
}

export async function deleteSalesLead(id) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id) return fail("Lead id is required.");

  const { error } = await supabase.from("sales_leads").delete().eq("id", id);
  return error ? fail(error.message) : respond(true, null);
}

export async function createConsultationNote(input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const validation = validateConsultationForm(input);
  if (!validation.valid) return fail(`Consultation validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("consultation_notes").insert(buildConsultationPayload(input)).select(CONSULTATION_NOTES_SELECT).single();
  return respond(data, error);
}

export async function updateConsultationNote(id, input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const validation = validateConsultationForm(input);
  if (!id) return fail("Consultation id is required.");
  if (!validation.valid) return fail(`Consultation validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("consultation_notes").update(buildConsultationPayload(input)).eq("id", id).select(CONSULTATION_NOTES_SELECT).single();
  return respond(data, error);
}

export async function deleteConsultationNote(id) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id) return fail("Consultation id is required.");

  const { error } = await supabase.from("consultation_notes").delete().eq("id", id);
  return error ? fail(error.message) : respond(true, null);
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
  return { data: data ?? null, error: error?.message || null };
}

function fail(error) {
  return { data: null, error };
}
