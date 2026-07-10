import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";

const JOURNEY_STEP_SELECT = "id, step_no, title, subtitle, description, status, progress_percent, target_date, completed_date, note";

export async function getJourneySteps() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("journey_template_steps")
    .select(JOURNEY_STEP_SELECT)
    .order("step_no", { ascending: true });

  return respond(data, error);
}

export async function updateJourneyStep(stepId, values) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("journey_template_steps")
    .update({
      title: requiredText(values.title),
      subtitle: optionalText(values.subtitle),
      description: optionalText(values.description),
      status: optionalText(values.status) || "pending",
      progress_percent: normalizeProgress(values.progress_percent),
      target_date: optionalText(values.target_date),
      completed_date: optionalText(values.completed_date),
      note: optionalText(values.note),
    })
    .eq("id", stepId)
    .select(JOURNEY_STEP_SELECT)
    .single();

  return respond(data, error);
}

export function calculateJourneyOverallProgress(steps) {
  const rows = Array.isArray(steps) ? steps : [];
  if (!rows.length) return 0;

  const total = rows.reduce((sum, step) => sum + Number(step.progress_percent || 0), 0);
  return Math.round(total / rows.length);
}

function requiredText(value) {
  return String(value || "").trim();
}

function optionalText(value) {
  const next = requiredText(value);
  return next || null;
}

function normalizeProgress(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(next, 100));
}

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
