import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  getDefaultProject,
  getProjectById,
  LOCAL_FALLBACK_PROJECT,
  normalizeProject,
  resolveSelectedProjectId,
  sortProjects,
} from "../src/services/projectModel.js";
import { translations } from "../src/i18n/translations.js";

const topbarSource = readFileSync(new URL("../src/components/admin/AdminTopbar.jsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const contextSource = readFileSync(new URL("../src/context/ProjectContext.jsx", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/migrations/0009_projects_foundation.sql", import.meta.url), "utf8");

describe("Project foundation model", () => {
  it("normalizes project fields and safely falls back for missing values", () => {
    assert.deepEqual(normalizeProject({ id: "p-1", name: "  Dili Heights ", status: "planning", is_default: true }), {
      id: "p-1",
      name: "Dili Heights",
      slug: "dili-heights",
      location: "",
      description: "",
      status: "planning",
      is_default: true,
      created_at: null,
      updated_at: null,
      is_fallback: false,
    });
    assert.equal(normalizeProject(null).name, "Timor Crest");
    assert.equal(normalizeProject({ status: "unknown" }).status, "active");
  });

  it("prioritizes default, active status, and name when sorting", () => {
    const projects = sortProjects([
      { id: "archived", name: "A Project", status: "archived" },
      { id: "active", name: "Z Project", status: "active" },
      { id: "default", name: "Timor Crest", status: "paused", is_default: true },
    ]);
    assert.deepEqual(projects.map((project) => project.id), ["default", "active", "archived"]);
  });

  it("selects a stored project when valid and falls back safely when invalid", () => {
    const projects = [
      { id: "p-1", name: "Planning", status: "planning" },
      { id: "p-2", name: "Timor Crest", status: "active", is_default: true },
    ];
    assert.equal(getProjectById(projects, "p-1")?.name, "Planning");
    assert.equal(resolveSelectedProjectId(projects, "p-1"), "p-1");
    assert.equal(resolveSelectedProjectId(projects, "missing"), "p-2");
    assert.equal(getDefaultProject([{ id: "p-3", name: "Active", status: "active" }])?.id, "p-3");
    assert.equal(getDefaultProject([]), null);
    assert.equal(LOCAL_FALLBACK_PROJECT.is_fallback, true);
  });

  it("connects admin-only provider, selector, translations, and migration", () => {
    assert.match(appSource, /<ProjectProvider>/);
    assert.match(contextSource, /timorcrest_selected_project_id/);
    assert.match(contextSource, /readStoredProjectId/);
    assert.match(contextSource, /writeStoredProjectId/);
    assert.match(topbarSource, /ProjectSelector/);
    assert.match(topbarSource, /Select Project/);
    assert.match(topbarSource, /setSelectedProjectId\(event\.target\.value\)/);
    assert.equal(translations.en.Project, "Project");
    assert.equal(translations.kr.Project, "프로젝트");
    assert.equal(translations.en["Pending migration"], "Pending migration");
    assert.equal(translations.kr["Pending migration"], "마이그레이션 대기 중");
    assert.match(migrationSource, /create table public\.projects/);
    assert.match(migrationSource, /projects_status_check/);
    assert.match(migrationSource, /projects_admin_select/);
    assert.match(migrationSource, /public\.is_admin\(\)/);
    assert.match(migrationSource, /on conflict \(slug\) do update/);
    assert.doesNotMatch(migrationSource, /project_id/);
  });
});
