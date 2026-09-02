import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { getAdminContractors } from "./contractorService.js";
import {
  buildConsultationPayload,
  buildCrmEventPayload,
  buildSalesLeadPayload,
  buildSearchPerformancePayload,
  validateConsultationForm,
  validateCrmEventForm,
  validateSalesLeadForm,
  validateSearchPerformanceForm,
} from "./adminCustomerManagementModel.js";

const SALES_LEADS_SELECT = "id, project_id, lead_date, full_name, phone, email, source, interested_unit, assigned_to, status, memo, created_at, updated_at";
const CONSULTATION_NOTES_SELECT = "id, project_id, lead_id, contractor_id, consultation_date, method, consultant, summary, customer_interest, next_action, next_follow_up_date, result, created_at, updated_at";
const CRM_EVENTS_SELECT = "id, project_id, lead_id, contractor_id, title, event_type, event_date, start_time, end_time, location, assigned_to, memo, status, created_at, updated_at";
const SEARCH_SNAPSHOTS_SELECT = "id, project_id, report_date, query, page_url, clicks, impressions, ctr, average_position, source, memo, created_at, updated_at";

export async function listSalesLeads(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return respond([], null);
  const { data, error } = await supabase.from("sales_leads").select(SALES_LEADS_SELECT).eq("project_id", projectId).order("lead_date", { ascending: false }).order("created_at", { ascending: false });
  return respond(data, error);
}

export async function listConsultationNotes(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return respond([], null);
  const { data, error } = await supabase.from("consultation_notes").select(CONSULTATION_NOTES_SELECT).eq("project_id", projectId).order("consultation_date", { ascending: false }).order("created_at", { ascending: false });
  return respond(data, error);
}

export async function createSalesLead(input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateSalesLeadForm(input);
  if (!validation.valid) return fail(`Lead validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("sales_leads").insert({ ...buildSalesLeadPayload(input), project_id: projectId }).select(SALES_LEADS_SELECT).single();
  return respond(data, error);
}

export async function updateSalesLead(id, input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateSalesLeadForm(input);
  if (!id) return fail("Lead id is required.");
  if (!validation.valid) return fail(`Lead validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("sales_leads").update(buildSalesLeadPayload(input)).eq("id", id).eq("project_id", projectId).select(SALES_LEADS_SELECT).single();
  return respond(data, error);
}

export async function deleteSalesLead(id, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Lead id and project are required.");

  const { error } = await supabase.from("sales_leads").delete().eq("id", id).eq("project_id", projectId);
  return error ? fail(error.message) : respond(true, null);
}

export async function createConsultationNote(input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateConsultationForm(input);
  if (!validation.valid) return fail(`Consultation validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("consultation_notes").insert({ ...buildConsultationPayload(input), project_id: projectId }).select(CONSULTATION_NOTES_SELECT).single();
  return respond(data, error);
}

export async function updateConsultationNote(id, input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateConsultationForm(input);
  if (!id) return fail("Consultation id is required.");
  if (!validation.valid) return fail(`Consultation validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("consultation_notes").update(buildConsultationPayload(input)).eq("id", id).eq("project_id", projectId).select(CONSULTATION_NOTES_SELECT).single();
  return respond(data, error);
}

export async function deleteConsultationNote(id, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Consultation id and project are required.");

  const { error } = await supabase.from("consultation_notes").delete().eq("id", id).eq("project_id", projectId);
  return error ? fail(error.message) : respond(true, null);
}

export async function listCrmEvents(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return respond([], null);
  const { data, error } = await supabase.from("crm_events").select(CRM_EVENTS_SELECT).eq("project_id", projectId).order("event_date", { ascending: true }).order("start_time", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
  return respond(data, error);
}

export async function createCrmEvent(input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateCrmEventForm(input);
  if (!validation.valid) return fail(`Schedule validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("crm_events").insert({ ...buildCrmEventPayload(input), project_id: projectId }).select(CRM_EVENTS_SELECT).single();
  return respond(data, error);
}

export async function updateCrmEvent(id, input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Schedule id and project are required.");
  const validation = validateCrmEventForm(input);
  if (!validation.valid) return fail(`Schedule validation failed: ${validation.errors.join(", ")}`);

  const { data, error } = await supabase.from("crm_events").update(buildCrmEventPayload(input)).eq("id", id).eq("project_id", projectId).select(CRM_EVENTS_SELECT).single();
  return respond(data, error);
}

export async function deleteCrmEvent(id, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Schedule id and project are required.");

  const { error } = await supabase.from("crm_events").delete().eq("id", id).eq("project_id", projectId);
  return error ? fail(error.message) : respond(true, null);
}

export async function getCrmEventLeadOptions(projectId) {
  return listSalesLeads(projectId);
}

export async function getCrmEventContractorOptions(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  return getAdminContractors(projectId);
}

export async function listSearchPerformanceSnapshots(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return respond([], null);
  const { data, error } = await supabase.from("search_performance_snapshots").select(SEARCH_SNAPSHOTS_SELECT).eq("project_id", projectId).order("report_date", { ascending: false }).order("created_at", { ascending: false });
  return respond(data, error);
}

export async function createSearchPerformanceSnapshot(input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const validation = validateSearchPerformanceForm(input);
  if (!validation.valid) return fail(`Search data validation failed: ${validation.errors.join(", ")}`);
  const { data, error } = await supabase.from("search_performance_snapshots").insert({ ...buildSearchPerformancePayload(input), project_id: projectId }).select(SEARCH_SNAPSHOTS_SELECT).single();
  return respond(data, error);
}

export async function updateSearchPerformanceSnapshot(id, input, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Search performance id and project are required.");
  const validation = validateSearchPerformanceForm(input);
  if (!validation.valid) return fail(`Search data validation failed: ${validation.errors.join(", ")}`);
  const { data, error } = await supabase.from("search_performance_snapshots").update(buildSearchPerformancePayload(input)).eq("id", id).eq("project_id", projectId).select(SEARCH_SNAPSHOTS_SELECT).single();
  return respond(data, error);
}

export async function deleteSearchPerformanceSnapshot(id, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Search performance id and project are required.");
  const { error } = await supabase.from("search_performance_snapshots").delete().eq("id", id).eq("project_id", projectId);
  return error ? fail(error.message) : respond(true, null);
}

export async function bulkCreateSearchPerformanceSnapshots(inputs, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return fail("프로젝트를 선택해 주세요.");
  const payloads = Array.isArray(inputs) ? inputs.map((input) => ({ ...buildSearchPerformancePayload(input), project_id: projectId })) : [];
  if (!payloads.length) return fail("No import rows found.");
  const invalid = payloads.find((payload) => !validateSearchPerformanceForm(payload).valid);
  if (invalid) return fail("Some rows have errors.");
  const { data, error } = await supabase.from("search_performance_snapshots").insert(payloads).select(SEARCH_SNAPSHOTS_SELECT);
  return respond(data, error);
}

export async function loadCustomerManagementDashboard(projectId) {
  if (!isSupabaseConfigured) return { data: emptyDashboard(), error: SUPABASE_CONFIG_MESSAGE };

  const [leadsResult, consultationsResult, eventsResult, searchResult, contractorsResult] = await Promise.all([
    listSalesLeads(projectId),
    listConsultationNotes(projectId),
    listCrmEvents(projectId),
    listSearchPerformanceSnapshots(projectId),
    getAdminContractors(projectId),
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

function hasProjectId(projectId) {
  return Boolean(projectId && !String(projectId).startsWith("local-"));
}
