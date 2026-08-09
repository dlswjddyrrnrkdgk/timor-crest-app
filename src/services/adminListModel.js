export function sortContractors(items) {
  return [...items].sort((a, b) => compareCreatedDesc(a, b) || String(a.full_name || "").localeCompare(String(b.full_name || ""), "ko-KR"));
}

export function sortUnits(items) {
  return [...items].sort((a, b) => compareCreatedDesc(a, b) || String(a.unit_code || "").localeCompare(String(b.unit_code || ""), "ko-KR"));
}

export function clampPage(page, totalPages) {
  const safeTotalPages = Math.max(Math.trunc(Number(totalPages) || 0), 0);
  if (!safeTotalPages) return 1;

  return Math.min(Math.max(Math.trunc(Number(page) || 1), 1), safeTotalPages);
}

export function getPaginationWindow(currentPage, totalPages, windowSize = 5) {
  const safeTotalPages = Math.max(Math.trunc(Number(totalPages) || 0), 0);
  if (!safeTotalPages) return [];

  const safeWindowSize = Math.max(Math.trunc(Number(windowSize) || 5), 1);
  const safeCurrentPage = clampPage(currentPage, safeTotalPages);
  const groupStart = Math.floor((safeCurrentPage - 1) / safeWindowSize) * safeWindowSize + 1;
  const groupEnd = Math.min(groupStart + safeWindowSize - 1, safeTotalPages);

  return Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index);
}

function compareCreatedDesc(a, b) {
  const left = Date.parse(a.created_at || "");
  const right = Date.parse(b.created_at || "");
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (leftValid && rightValid && left !== right) return right - left;
  if (leftValid && !rightValid) return -1;
  if (!leftValid && rightValid) return 1;
  return 0;
}
