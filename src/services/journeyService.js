import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { DEFAULT_JOURNEY_STEPS, buildJourneyStepUpdatePayload, calculateJourneyOverallProgress, getCurrentJourneyStep } from "./journeyModel.js";

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
    .update(buildJourneyStepUpdatePayload(values))
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

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
