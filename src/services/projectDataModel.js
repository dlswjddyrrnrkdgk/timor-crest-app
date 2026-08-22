export function filterRowsByProject(rows, projectId) {
  const values = Array.isArray(rows) ? rows : [];
  if (!projectId || projectId.startsWith("local-")) return values;

  const hasProjectScope = values.some((row) => row && Object.prototype.hasOwnProperty.call(row, "project_id"));
  return hasProjectScope ? values.filter((row) => row?.project_id === projectId) : values;
}
