import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

export const UNREGISTERED_ACCOUNT_MESSAGE = "등록되지 않은 계정입니다. 관리자에게 문의하세요.";
export const SUPABASE_CONFIG_MESSAGE = "Supabase 환경변수가 설정되지 않았습니다.";

const ROLE_REDIRECTS = {
  admin: "/admin",
  contractor: "/contractor",
};

export function getRoleRedirect(role) {
  return ROLE_REDIRECTS[role] || "/login";
}

export function isKnownRole(role) {
  return role === "admin" || role === "contractor";
}

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured) {
    return { ok: false, error: SUPABASE_CONFIG_MESSAGE };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const profileResult = await loadProfileForUser(data.user?.id);
  if (!profileResult.ok) {
    await signOut();
    return profileResult;
  }

  return { ok: true, session: data.session, profile: profileResult.profile };
}

export async function resolveSessionProfile() {
  if (!isSupabaseConfigured) {
    return { ok: false, error: SUPABASE_CONFIG_MESSAGE, session: null, profile: null };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) return { ok: false, error: error.message, session: null, profile: null };
  if (!data.session?.user) return { ok: true, session: null, profile: null };

  const profileResult = await loadProfileForUser(data.session.user.id);
  if (!profileResult.ok) {
    await signOut();
    return { ...profileResult, session: null, profile: null };
  }

  return { ok: true, session: data.session, profile: profileResult.profile };
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

async function loadProfileForUser(userId) {
  if (!userId) return { ok: false, error: UNREGISTERED_ACCOUNT_MESSAGE };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data || !isKnownRole(data.role)) return { ok: false, error: UNREGISTERED_ACCOUNT_MESSAGE };

  return { ok: true, profile: data };
}
