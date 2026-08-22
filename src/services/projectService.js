import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import { normalizeProject, sortProjects } from "./projectModel.js";

const PROJECT_SELECT = "id, name, slug, location, description, status, is_default, created_at, updated_at";

export async function listProjects() {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("is_default", { ascending: false })
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return sortProjects((data || []).map(normalizeProject));
}

export { getDefaultProject, getProjectById, normalizeProject, sortProjects } from "./projectModel.js";
