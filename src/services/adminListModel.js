export function sortContractors(items) {
  return [...items].sort((a, b) => compareCreatedDesc(a, b) || String(a.full_name || "").localeCompare(String(b.full_name || ""), "ko-KR"));
}

export function sortUnits(items) {
  return [...items].sort((a, b) => compareCreatedDesc(a, b) || String(a.unit_code || "").localeCompare(String(b.unit_code || ""), "ko-KR"));
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
