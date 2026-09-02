import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { getAdminContractors, getUnits } from "./contractorService.js";
import {
  buildAccountingTransactionPayload,
  filterAccountingTransactions,
  normalizeAccountingTransaction,
  sortAccountingTransactions,
  validateAccountingTransactionForm,
} from "./accountingModel.js";

const ACCOUNTING_SELECT = "id, project_id, transaction_date, direction, account_category, tax_category, counterparty_name, description, payment_method, amount, reference_no, related_unit_id, related_contractor_id, source_type, memo, created_at, updated_at, unit:units(id, unit_code), contractor:contractors(id, full_name)";

export async function listAccountingTransactions({ projectId, filters = {} } = {}) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!hasProjectId(projectId)) return respond([], null);

  const { data, error } = await supabase
    .from("accounting_transactions")
    .select(ACCOUNTING_SELECT)
    .eq("project_id", projectId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return fail(error.message);
  const rows = sortAccountingTransactions((data || []).map(normalizeAccountingTransaction));
  return respond(filterAccountingTransactions(rows, { ...filters, projectId }), null);
}

export async function createAccountingTransaction(input, projectId = input?.project_id) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  const validation = validateAccountingTransactionForm(input, projectId);
  if (!validation.valid) return fail(validation.errors.join(", "), validation.fieldErrors);
  const payload = buildAccountingTransactionPayload(input, projectId);
  const { data, error } = await supabase
    .from("accounting_transactions")
    .insert(payload)
    .select(ACCOUNTING_SELECT)
    .single();
  return respond(data ? normalizeAccountingTransaction(data) : null, error);
}

export async function updateAccountingTransaction(id, input, projectId = input?.project_id) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id) return fail("Transaction id is required.");
  const validation = validateAccountingTransactionForm(input, projectId);
  if (!validation.valid) return fail(validation.errors.join(", "), validation.fieldErrors);
  const { project_id: _projectId, ...payload } = buildAccountingTransactionPayload(input, projectId);
  const { data, error } = await supabase
    .from("accounting_transactions")
    .update(payload)
    .eq("id", id)
    .eq("project_id", projectId)
    .select(ACCOUNTING_SELECT)
    .single();
  return respond(data ? normalizeAccountingTransaction(data) : null, error);
}

export async function deleteAccountingTransaction(id, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!id || !hasProjectId(projectId)) return fail("Transaction id and project are required.");
  const { error } = await supabase
    .from("accounting_transactions")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);
  return error ? fail(error.message) : respond(true, null);
}

export async function listAccountingReferenceData({ projectId } = {}) {
  if (!hasProjectId(projectId)) return { data: { units: [], contractors: [] }, error: null };
  const [unitsResult, contractorsResult] = await Promise.all([
    getUnits(projectId),
    getAdminContractors(projectId),
  ]);
  return {
    data: {
      units: unitsResult.data || [],
      contractors: contractorsResult.data || [],
    },
    error: unitsResult.error || contractorsResult.error || null,
  };
}

function respond(data, error, fieldErrors = {}) {
  return { data: data ?? null, error: error?.message || error || null, fieldErrors };
}

function fail(error, fieldErrors = {}) {
  return respond(null, error, fieldErrors);
}

function hasProjectId(projectId) {
  return Boolean(projectId && !String(projectId).startsWith("local-"));
}
