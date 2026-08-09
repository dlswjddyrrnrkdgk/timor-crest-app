import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildSettingsSections,
  getEnvironmentStatus,
  getManagementShortcuts,
  getSecurityChecklist,
  maskUserId,
  normalizeRoleLabel,
} from "../src/services/adminSettingsModel.js";

test("masks account identifiers without exposing the full user id", () => {
  assert.equal(maskUserId("1234567890abcdef"), "1234...cdef");
  assert.equal(maskUserId("abc"), "ab...");
  assert.equal(maskUserId(null), "");
});

test("settings sections are null-safe and preserve safe account fields", () => {
  const empty = buildSettingsSections(null, null, "unknown");
  assert.equal(empty.account.sessionActive, false);
  assert.equal(empty.account.email, "");
  assert.equal(empty.preferences.language, "en");

  const sections = buildSettingsSections(
    { display_name: "Admin User", email: "admin@example.com", id: "1234567890abcdef", role: "admin" },
    { user: { email: "auth@example.com", id: "1234567890abcdef", last_sign_in_at: "2026-08-09T00:00:00Z" } },
    "kr",
  );
  assert.equal(sections.account.name, "Admin User");
  assert.equal(sections.account.email, "admin@example.com");
  assert.equal(sections.account.userId, "1234...cdef");
  assert.equal(sections.account.role, "관리자");
  assert.equal(sections.preferences.language, "kr");
});

test("environment status only exposes configured booleans", () => {
  const status = getEnvironmentStatus({
    supabaseAnonKey: "anon-secret",
    serviceRoleExposed: true,
    supabaseUrl: "https://example.supabase.co",
  });
  assert.deepEqual(status, {
    anonKeyConfigured: true,
    productionDomainConfigured: false,
    serviceRoleExposed: true,
    supabaseUrlConfigured: true,
  });
  assert.equal(JSON.stringify(status).includes("anon-secret"), false);
  assert.equal(JSON.stringify(status).includes("supabase.co"), false);
});

test("security checklist marks an exposed privileged key as unsafe", () => {
  const checklist = getSecurityChecklist({ serviceRoleExposed: true });
  assert.equal(checklist.find((item) => item.key === "serviceRole").safe, false);
  assert.equal(checklist.find((item) => item.key === "adminRoutes").safe, true);
});

test("management shortcuts preserve existing admin routes", () => {
  assert.deepEqual(getManagementShortcuts().map((shortcut) => shortcut.route), [
    "/admin/contractors",
    "/admin/units",
    "/admin/payments",
    "/admin/documents",
    "/admin/journey",
    "/admin/reports",
  ]);
});

test("role labels and protected Settings integration remain in source", () => {
  assert.equal(normalizeRoleLabel("admin", "en"), "Admin");
  assert.equal(normalizeRoleLabel("admin", "kr"), "관리자");
  assert.equal(normalizeRoleLabel(null, "en"), "Not set");
  assert.match(fs.readFileSync("src/routes/AdminLayout.jsx", "utf8"), /path=\"settings\"/);
  assert.match(fs.readFileSync("src/components/admin/AdminSidebar.jsx", "utf8"), /\/admin\/settings/);
  const settingsSource = fs.readFileSync("src/components/admin/SettingsPage.jsx", "utf8");
  assert.match(settingsSource, /resolveSessionProfile/);
  assert.match(settingsSource, /getSecurityChecklist\(environmentConfig\)/);
  assert.doesNotMatch(settingsSource, /getSecurityChecklist\(environment\)/);
});
