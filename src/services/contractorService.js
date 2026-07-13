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
  payment_method,
  bank_name,
  bank_account_number,
  bank_account_holder,
  status,
  created_at,
  unit:units (
    id,
    unit_code,
    unit_name,
    property_type,
    total_price,
    currency,
    status,
    created_at
  )
`;

const UNIT_SELECT = "id, unit_code, unit_name, property_type, total_price, currency, status, created_at";

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

export async function createContractorWithAuth(input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return fail(sessionError.message);

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return fail("관리자 로그인이 필요합니다.");

  try {
    const response = await fetch("/.netlify/functions/create-contractor", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalizeContractorAccount(input)),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) return fail(payload.error || "계약자 계정 생성에 실패했습니다.");

    return respond(payload.data || null, null);
  } catch (error) {
    return fail(error.message || "계약자 계정 생성에 실패했습니다.");
  }
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

export async function updateContractorPaymentMethod(id, input) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("contractors")
    .update(normalizePaymentMethod(input))
    .eq("id", id)
    .select(CONTRACTOR_SELECT)
    .single();

  return respond(data, error);
}

export async function deleteContractor(id) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { error } = await supabase.from("contractors").delete().eq("id", id);
  return error ? fail(error.message) : respond(true, null);
}

export async function getUnits() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase.from("units").select(UNIT_SELECT).order("created_at", { ascending: false });
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
  const unitCode = requiredString(input.unit_code);

  return {
    unit_code: unitCode,
    unit_name: optionalString(input.unit_name) || unitCode,
    property_type: optionalString(input.property_type),
    total_price: optionalNumber(input.total_price),
    currency: optionalString(input.currency) || "USD",
    status: optionalString(input.status) || "active",
  };
}

function normalizeContractor(input) {
  const payload = {
    profile_id: optionalString(input.profile_id),
    unit_id: optionalString(input.unit_id),
    full_name: requiredString(input.full_name),
    email: optionalString(input.email),
    phone: optionalString(input.phone),
    passport_no: optionalString(input.passport_no),
    address: optionalString(input.address),
    status: optionalString(input.status) || "active",
  };

  if ("payment_method" in input || "bank_name" in input || "bank_account_number" in input || "bank_account_holder" in input) {
    const paymentMethod = optionalString(input.payment_method);
    const usesBankTransfer = paymentMethod === "bank_transfer";
    payload.payment_method = paymentMethod;
    payload.bank_name = usesBankTransfer ? optionalString(input.bank_name) : null;
    payload.bank_account_number = usesBankTransfer ? optionalString(input.bank_account_number) : null;
    payload.bank_account_holder = usesBankTransfer ? optionalString(input.bank_account_holder) : null;
  }

  return payload;
}

function normalizePaymentMethod(input) {
  const paymentMethod = optionalString(input.payment_method);
  const usesBankTransfer = paymentMethod === "bank_transfer";

  return {
    payment_method: paymentMethod,
    bank_name: usesBankTransfer ? optionalString(input.bank_name) : null,
    bank_account_number: usesBankTransfer ? optionalString(input.bank_account_number) : null,
    bank_account_holder: usesBankTransfer ? optionalString(input.bank_account_holder) : null,
  };
}

function normalizeContractorAccount(input) {
  return {
    ...normalizeContractor(input),
    temporary_password: requiredString(input.temporary_password),
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

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
