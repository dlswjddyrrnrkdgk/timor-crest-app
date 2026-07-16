import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import {
  buildDefaultPaymentItems,
  buildPaymentItemUpdatePayload,
  normalizePaymentItems,
} from "./paymentModel.js";

const PAYMENT_PLAN_SELECT = `
  id,
  contractor_id,
  unit_id,
  total_price,
  currency,
  status,
  contractor:contractors (
    id,
    full_name,
    email,
    phone,
    unit:units (
      id,
      unit_code,
      unit_name,
      total_price,
      currency
    )
  ),
  unit:units (
    id,
    unit_code,
    unit_name,
    total_price,
    currency
  )
`;

const PAYMENT_ITEM_SELECT = "id, payment_plan_id, step_no, title, payment_ratio, required_amount, paid_amount, due_date, paid_date, status, note";

export async function getAdminPaymentPlans() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("payment_plans")
    .select(PAYMENT_PLAN_SELECT)
    .order("created_at", { ascending: false });

  return respond(data, error);
}

export async function getPaymentPlanByContractor(contractorId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!contractorId) return respond(null, null);

  const { data, error } = await supabase
    .from("payment_plans")
    .select(PAYMENT_PLAN_SELECT)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  return respond(data, error);
}

export async function createPaymentPlan(contractorId, unitId, totalPrice, currency = "USD") {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("payment_plans")
    .insert({
      contractor_id: contractorId,
      unit_id: unitId || null,
      total_price: normalizeNumber(totalPrice),
      currency: normalizeText(currency) || "USD",
      status: "active",
    })
    .select(PAYMENT_PLAN_SELECT)
    .single();

  return respond(data, error);
}

export async function updatePaymentPlan(planId, values) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("payment_plans")
    .update({
      total_price: normalizeNumber(values.total_price),
      currency: normalizeText(values.currency) || "USD",
      status: normalizeText(values.status) || "active",
    })
    .eq("id", planId)
    .select(PAYMENT_PLAN_SELECT)
    .single();

  return respond(data, error);
}

export async function createDefaultPaymentItems(paymentPlan) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const paymentPlanId = typeof paymentPlan === "string" ? paymentPlan : paymentPlan?.id;
  const totalPrice = typeof paymentPlan === "string" ? 0 : paymentPlan?.total_price;
  const rows = buildDefaultPaymentItems(paymentPlanId, totalPrice);

  const { data, error } = await supabase
    .from("payment_items")
    .insert(rows)
    .select(PAYMENT_ITEM_SELECT)
    .order("step_no", { ascending: true });

  return respond(data, error);
}

export async function updatePaymentItem(itemId, values, totalPrice = 0) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("payment_items")
    .update(buildPaymentItemUpdatePayload(values, totalPrice))
    .eq("id", itemId)
    .select(PAYMENT_ITEM_SELECT)
    .single();

  return respond(data, error);
}

export async function updatePaymentItems(changes, totalPrice = 0) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const rows = Array.isArray(changes) ? changes : [];
  const updatedRows = [];

  for (const change of rows) {
    const result = await updatePaymentItem(change.id, change.values, totalPrice);
    if (result.error) return fail(result.error);
    if (result.data) updatedRows.push(result.data);
  }

  return respond(updatedRows.sort((a, b) => Number(a.step_no) - Number(b.step_no)), null);
}

export async function getPaymentItems(paymentPlanId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!paymentPlanId) return respond([], null);

  const { data, error } = await supabase
    .from("payment_items")
    .select(PAYMENT_ITEM_SELECT)
    .eq("payment_plan_id", paymentPlanId)
    .order("step_no", { ascending: true });

  return respond(data, error);
}

export async function getMyPaymentSummary() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return fail(userError.message);
  if (!userData.user?.id) return respond(null, null);

  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(`
      id,
      full_name,
      email,
      phone,
      unit:units (
        id,
        unit_code,
        unit_name,
        total_price,
        currency
      )
    `)
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (contractorError) return fail(contractorError.message);
  if (!contractor) return respond(null, null);

  const planResult = await getPaymentPlanByContractor(contractor.id);
  if (planResult.error) return fail(planResult.error);
  if (!planResult.data) return respond({ contractor, unit: contractor.unit, plan: null, items: [], totals: calculatePaymentTotals(null, []) }, null);

  const itemsResult = await getPaymentItems(planResult.data.id);
  if (itemsResult.error) return fail(itemsResult.error);

  const items = normalizePaymentItems(itemsResult.data || [], planResult.data.total_price);
  return respond(
    {
      contractor,
      unit: contractor.unit,
      plan: planResult.data,
      items,
      totals: calculatePaymentTotals(planResult.data, items),
    },
    null,
  );
}

export function calculatePaymentTotals(plan, items) {
  const totalPrice = Number(plan?.total_price ?? 0);
  const rows = normalizePaymentItems(items, totalPrice);
  const totalRequiredAmount = rows.reduce((sum, item) => sum + Number(item.required_amount ?? 0), 0);
  const totalPaidAmount = rows.reduce((sum, item) => sum + Number(item.paid_amount ?? 0), 0);
  const unpaidAmount = Math.max(totalPrice - totalPaidAmount, 0);
  const progressPercent = totalPrice > 0 ? Math.min(Math.round((totalPaidAmount / totalPrice) * 100), 100) : 0;

  return {
    totalPrice,
    totalRequiredAmount,
    totalPaidAmount,
    unpaidAmount,
    progressPercent,
  };
}

function normalizeText(value) {
  const next = String(value || "").trim();
  return next || null;
}

function normalizeDate(value) {
  const next = normalizeText(value);
  return next || null;
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
