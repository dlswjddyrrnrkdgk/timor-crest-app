import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { DEFAULT_JOURNEY_STEPS, calculateJourneyOverallProgress, getCurrentJourneyStep } from "./journeyModel.js";

const JOURNEY_STEP_SELECT = "id, step_no, title, subtitle, description, status, progress_percent, target_date, completed_date, note";

export { calculateJourneyOverallProgress, getCurrentJourneyStep };

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

export async function ensureDefaultJourneySteps() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { error } = await supabase
    .from("journey_template_steps")
    .upsert(DEFAULT_JOURNEY_STEPS, { ignoreDuplicates: true, onConflict: "step_no" });

  if (error) return fail(error.message);

  return getJourneySteps();
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
