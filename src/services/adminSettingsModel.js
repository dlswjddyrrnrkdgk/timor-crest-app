const DEFAULT_PORTAL = {
  name: "Timor Crest",
  productionDomain: "apptimorcrest.com",
  adminPortal: "/admin",
};

const DEFAULT_SYSTEM = {
  appName: "Timor Crest",
  frontend: "Vite / React",
  hosting: "Netlify",
  backend: "Supabase",
  documentsBucket: "timorcrest-documents",
  languageStorageKey: "timorcrest_language",
};

export function maskUserId(userId) {
  const value = String(userId ?? "").trim();
  if (!value) return "";
  if (value.length <= 6) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function normalizeRoleLabel(role, language = "en") {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  if (normalizedRole === "admin") return language === "kr" ? "관리자" : "Admin";
  if (normalizedRole === "contractor") return language === "kr" ? "분양자" : "Contractor";
  return language === "kr" ? "미설정" : "Not set";
}

export function getEnvironmentStatus(env = {}) {
  return {
    supabaseUrlConfigured: Boolean(env.supabaseUrl),
    anonKeyConfigured: Boolean(env.supabaseAnonKey),
    serviceRoleExposed: Boolean(env.serviceRoleExposed),
    productionDomainConfigured: Boolean(env.productionDomain),
  };
}

export function getSecurityChecklist(env = {}) {
  const status = getEnvironmentStatus(env);
  return [
    { key: "supabaseUrl", safe: status.supabaseUrlConfigured },
    { key: "supabaseAnonKey", safe: status.anonKeyConfigured },
    { key: "serviceRole", safe: !status.serviceRoleExposed },
    { key: "adminRoutes", safe: true },
    { key: "publicSignup", safe: true },
    { key: "privateStorage", safe: true },
    { key: "signedUrls", safe: true },
  ];
}

export function buildSettingsSections(profile = null, session = null, language = "en") {
  const user = session?.user || null;
  const account = {
    name: profile?.display_name ?? user?.user_metadata?.display_name ?? "",
    email: profile?.email ?? user?.email ?? "",
    role: normalizeRoleLabel(profile?.role, language),
    userId: maskUserId(profile?.id ?? user?.id),
    sessionActive: Boolean(session),
    lastSignIn: user?.last_sign_in_at ?? null,
  };

  return {
    account,
    portal: { ...DEFAULT_PORTAL },
    system: { ...DEFAULT_SYSTEM },
    preferences: { language: language === "kr" ? "kr" : "en" },
  };
}

export function getManagementShortcuts() {
  return [
    { key: "customers", route: "/admin/contractors", icon: "customers" },
    { key: "units", route: "/admin/units", icon: "building" },
    { key: "payments", route: "/admin/payments", icon: "payment" },
    { key: "documents", route: "/admin/documents", icon: "document" },
    { key: "journey", route: "/admin/journey", icon: "journey" },
    { key: "reports", route: "/admin/reports", icon: "trend" },
  ];
}
