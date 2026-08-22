export const PROJECT_STATUS_VALUES = ["active", "planning", "paused", "archived"];

export const LOCAL_FALLBACK_PROJECT = Object.freeze({
  id: "local-timor-crest",
  name: "Timor Crest",
  slug: "timor-crest",
  location: "Dili, Timor-Leste",
  description: "Timor Crest primary development project",
  status: "active",
  is_default: true,
  created_at: null,
  updated_at: null,
  is_fallback: true,
});

export function normalizeProject(row) {
  const source = row && typeof row === "object" ? row : {};
  const name = safeText(source.name, "Timor Crest");
  const slug = safeText(source.slug, slugify(name));
  const status = PROJECT_STATUS_VALUES.includes(source.status) ? source.status : "active";

  return {
    id: safeText(source.id, `project-${slug}`),
    name,
    slug,
    location: safeText(source.location),
    description: safeText(source.description),
    status,
    is_default: source.is_default === true,
    created_at: source.created_at ?? null,
    updated_at: source.updated_at ?? null,
    is_fallback: source.is_fallback === true,
  };
}

export function sortProjects(projects) {
  const statusRank = { active: 0, planning: 1, paused: 2, archived: 3 };
  return (Array.isArray(projects) ? projects : [])
    .map(normalizeProject)
    .sort((left, right) => {
      if (left.is_default !== right.is_default) return left.is_default ? -1 : 1;
      const statusDifference = (statusRank[left.status] ?? 99) - (statusRank[right.status] ?? 99);
      if (statusDifference !== 0) return statusDifference;
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
}

export function getDefaultProject(projects) {
  const sorted = sortProjects(projects);
  return sorted.find((project) => project.is_default) || sorted.find((project) => project.status === "active") || sorted[0] || null;
}

export function getProjectById(projects, projectId) {
  if (!projectId || !Array.isArray(projects)) return null;
  return projects.find((project) => project?.id === projectId) || null;
}

export function resolveSelectedProjectId(projects, storedProjectId) {
  const normalizedProjects = sortProjects(projects);
  const storedProject = getProjectById(normalizedProjects, storedProjectId);
  return (storedProject || getDefaultProject(normalizedProjects))?.id || "";
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function slugify(value) {
  return safeText(value, "timor-crest")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "timor-crest";
}
