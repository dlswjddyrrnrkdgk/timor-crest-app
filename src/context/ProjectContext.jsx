import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getDefaultProject, LOCAL_FALLBACK_PROJECT, resolveSelectedProjectId, sortProjects } from "../services/projectModel.js";
import { listProjects } from "../services/projectService.js";

export const PROJECT_STORAGE_KEY = "timorcrest_selected_project_id";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => readStoredProjectId());
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const refreshProjects = useCallback(async () => {
    setIsProjectsLoading(true);
    try {
      const loadedProjects = sortProjects(await listProjects());
      const nextProjects = loadedProjects.length ? loadedProjects : [LOCAL_FALLBACK_PROJECT];
      setProjects(nextProjects);
      setSelectedProjectIdState((currentId) => resolveSelectedProjectId(nextProjects, currentId));
      setProjectsError(loadedProjects.length ? "" : "Projects could not be loaded.");
    } catch (error) {
      const fallbackProjects = [LOCAL_FALLBACK_PROJECT];
      setProjects(fallbackProjects);
      setSelectedProjectIdState(LOCAL_FALLBACK_PROJECT.id);
      setProjectsError(error?.message || "Projects could not be loaded.");
    } finally {
      setIsProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || getDefaultProject(projects),
    [projects, selectedProjectId],
  );

  const setSelectedProjectId = useCallback((projectId) => {
    setSelectedProjectIdState((currentId) => {
      const nextId = resolveSelectedProjectId(projects, projectId || currentId);
      writeStoredProjectId(nextId);
      return nextId;
    });
  }, [projects]);

  useEffect(() => {
    if (selectedProject?.id) writeStoredProjectId(selectedProject.id);
  }, [selectedProject?.id]);

  const value = useMemo(() => ({
    isProjectsLoading,
    projects,
    projectsError,
    refreshProjects,
    selectedProject,
    selectedProjectId: selectedProject?.id || selectedProjectId || "",
    setSelectedProjectId,
  }), [isProjectsLoading, projects, projectsError, refreshProjects, selectedProject, selectedProjectId, setSelectedProjectId]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used inside ProjectProvider");
  return context;
}

function readStoredProjectId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PROJECT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredProjectId(projectId) {
  if (!projectId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  } catch {
    return undefined;
  }
  return undefined;
}
