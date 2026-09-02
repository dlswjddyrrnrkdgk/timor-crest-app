import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { DEFAULT_JOURNEY_STEPS, buildJourneyStepUpdatePayload, calculateJourneyOverallProgress, getCurrentJourneyStep } from "./journeyModel.js";

const JOURNEY_STEP_SELECT = "id, project_id, step_no, title, subtitle, description, status, progress_percent, target_date, completed_date, note";

export { calculateJourneyOverallProgress, getCurrentJourneyStep };

export async function getJourneySteps(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!projectId || String(projectId).startsWith("local-")) return respond([], null);

  const { data, error } = await supabase
    .from("journey_template_steps")
    .select(JOURNEY_STEP_SELECT)
    .eq("project_id", projectId)
    .order("step_no", { ascending: true });

  return respond(data, error);
}

export async function updateJourneyStep(stepId, values, projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!stepId || !projectId || String(projectId).startsWith("local-")) return fail("프로젝트를 선택해 주세요.");

  const { data, error } = await supabase
    .from("journey_template_steps")
    .update(buildJourneyStepUpdatePayload(values))
    .eq("id", stepId)
    .eq("project_id", projectId)
    .select(JOURNEY_STEP_SELECT)
    .single();

  return respond(data, error);
}

export async function ensureDefaultJourneySteps(projectId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!projectId || String(projectId).startsWith("local-")) return fail("프로젝트를 선택해 주세요.");

  const defaultSteps = DEFAULT_JOURNEY_STEPS.map((step) => ({ ...step, project_id: projectId }));

  const { error } = await supabase
    .from("journey_template_steps")
    .upsert(defaultSteps, { ignoreDuplicates: true, onConflict: "project_id,step_no" });

  if (error) return fail(error.message);

  return getJourneySteps(projectId);
}

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
