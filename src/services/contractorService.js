import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";

const CONTRACTOR_SELECT = `
  id,
  profile_id,
  unit_id,
  full_name,
  email,
  phone,
  passport_no,
  address,
  status,
  unit:units (
    id,
    unit_code,
    unit_name,
    property_type,
    total_price,
    currency,
    status
  )
`;

const UNIT_SELECT = "id, unit_code, unit_name, property_type, total_price, currency, status";

export async function getAdminContractors() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("contractors")
    .select(CONTRACTOR_SELECT)
    .order("created_at", { ascending: false });

  return respond(data, error);
}

export async function createContractor(input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("contractors")
    .insert(normalizeContractor(input))
    .select(CONTRACTOR_SELECT)
    .single();

  return respond(data, error);
}

export async function updateContractor(id, input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("contractors")
    .update(normalizeContractor(input))
    .eq("id", id)
    .select(CONTRACTOR_SELECT)
    .single();

  return respond(data, error);
}

export async function getUnits() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase.from("units").select(UNIT_SELECT).order("unit_code", { ascending: true });
  return respond(data, error);
}

export async function createUnit(input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase.from("units").insert(normalizeUnit(input)).select(UNIT_SELECT).single();
  return respond(data, error);
}

export async function updateUnit(id, input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase.from("units").update(normalizeUnit(input)).eq("id", id).select(UNIT_SELECT).single();
  return respond(data, error);
}

export async function getMyContractorSummary() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return fail(userError.message);
  if (!userData.user?.id) return respond(null, null);

  const { data, error } = await supabase
    .from("contractors")
    .select(CONTRACTOR_SELECT)
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  return respond(data, error);
}

function normalizeUnit(input) {
  return {
    unit_code: requiredString(input.unit_code),
    unit_name: optionalString(input.unit_name),
    property_type: optionalString(input.property_type),
    total_price: optionalNumber(input.total_price),
    currency: optionalString(input.currency) || "USD",
    status: optionalString(input.status) || "active",
  };
}

function normalizeContractor(input) {
  return {
    profile_id: optionalString(input.profile_id),
    unit_id: optionalString(input.unit_id),
    full_name: requiredString(input.full_name),
    email: optionalString(input.email),
    phone: optionalString(input.phone),
    passport_no: optionalString(input.passport_no),
    address: optionalString(input.address),
    status: optionalString(input.status) || "active",
  };
}

function requiredString(value) {
  return String(value || "").trim();
}

function optionalString(value) {
  const next = String(value || "").trim();
  return next || null;
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
