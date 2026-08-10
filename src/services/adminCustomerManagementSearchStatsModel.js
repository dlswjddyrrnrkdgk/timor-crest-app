const SEARCH_SOURCE_VALUES = ["manual", "csv_import", "google_search_console_manual", "other"];

const HEADER_ALIASES = {
  query: "query",
  search_query: "query",
  top_queries: "query",
  page: "page_url",
  pages: "page_url",
  page_url: "page_url",
  url: "page_url",
  clicks: "clicks",
  impressions: "impressions",
  ctr: "ctr",
  position: "average_position",
  average_position: "average_position",
  avg_position: "average_position",
  date: "report_date",
  report_date: "report_date",
};

export const SEARCH_SOURCE_OPTIONS = SEARCH_SOURCE_VALUES;
export const SEARCH_DATE_RANGE_OPTIONS = ["all", "last_7_days", "last_30_days", "this_month", "this_year"];

export function buildSearchPerformancePayload(formState = {}) {
  const clicks = normalizeInteger(formState.clicks);
  const impressions = normalizeInteger(formState.impressions);
  const providedCtr = formState.ctr === "" || formState.ctr === null || formState.ctr === undefined ? null : normalizeNumber(formState.ctr);
  return {
    report_date: safeTrim(formState.report_date) || null,
    query: safeImportedText(formState.query),
    page_url: safeImportedText(formState.page_url),
    clicks,
    impressions,
    ctr: calculateCtr(clicks, impressions, providedCtr),
    average_position: formState.average_position === "" || formState.average_position === null || formState.average_position === undefined ? null : normalizeNumber(formState.average_position),
    source: normalizeSearchSource(formState.source),
    memo: safeImportedText(formState.memo),
  };
}

export function validateSearchPerformanceForm(formState = {}) {
  const errors = [];
  const warnings = [];
  const reportDate = safeTrim(formState.report_date);
  const clicks = parseRequiredInteger(formState.clicks);
  const impressions = parseRequiredInteger(formState.impressions);
  const ctr = formState.ctr === "" || formState.ctr === null || formState.ctr === undefined ? null : normalizeNumber(formState.ctr);
  const position = formState.average_position === "" || formState.average_position === null || formState.average_position === undefined ? null : normalizeNumber(formState.average_position);
  const pageUrl = safeTrim(formState.page_url);

  if (!reportDate || !isValidDateOnly(reportDate)) errors.push("report_date");
  if (clicks === null || clicks < 0) errors.push("clicks");
  if (impressions === null || impressions < 0) errors.push("impressions");
  if (clicks !== null && impressions !== null && clicks > impressions) errors.push("clicks_greater_than_impressions");
  if (ctr !== null && (ctr < 0 || ctr > 100)) errors.push("ctr");
  if (position !== null && position < 0) errors.push("average_position");
  if (pageUrl && !isValidHttpUrl(pageUrl)) errors.push("page_url");
  if (clicks !== null && impressions !== null && impressions > 0 && clicks / impressions > 1) warnings.push("clicks_greater_than_impressions");
  return { valid: errors.length === 0, errors, warnings };
}

export function calculateCtr(clicks, impressions, providedCtr = null) {
  const supplied = normalizeNumber(providedCtr);
  if (supplied !== null && supplied >= 0 && supplied <= 100) return round(supplied, 4);
  const safeImpressions = Math.max(normalizeInteger(impressions), 0);
  const safeClicks = Math.max(normalizeInteger(clicks), 0);
  return safeImpressions > 0 ? round((safeClicks / safeImpressions) * 100, 4) : 0;
}

export function normalizeSearchSource(source) {
  const value = safeTrim(source).toLowerCase();
  return SEARCH_SOURCE_VALUES.includes(value) ? value : "manual";
}

export function getSearchSourceLabel(source, language = "en") {
  const key = normalizeSearchSource(source);
  const labels = {
    manual: ["Manual", "수동"],
    csv_import: ["CSV Import", "CSV 가져오기"],
    google_search_console_manual: ["Google Search Console Manual", "Google Search Console 수동"],
    other: ["Other", "기타"],
  };
  return labels[key]?.[language === "kr" ? 1 : 0] || key;
}

export function filterSearchPerformanceSnapshots(rows = [], filters = {}, now = new Date()) {
  const query = safeTrim(filters.query).toLowerCase();
  const source = safeTrim(filters.source).toLowerCase();
  return filterByDateRange(Array.isArray(rows) ? rows.filter(Boolean) : [], filters.dateRange || "all", now).filter((row) => {
    if (source && source !== "all" && normalizeSearchSource(row?.source) !== source) return false;
    if (!query) return true;
    return [row?.query, row?.page_url, row?.memo].some((value) => String(value ?? "").toLowerCase().includes(query));
  });
}

export function filterByDateRange(rows = [], range = "all", now = new Date()) {
  const values = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!range || range === "all") return values;
  const current = toDate(now) || new Date();
  const start = startOfDay(current);
  if (range === "last_7_days") start.setDate(start.getDate() - 6);
  if (range === "last_30_days") start.setDate(start.getDate() - 29);
  if (range === "this_month") start.setDate(1);
  if (range === "this_year") {
    start.setMonth(0, 1);
  }
  return values.filter((row) => {
    const date = toDate(row?.report_date);
    if (!date) return false;
    const day = startOfDay(date);
    if (range === "this_month" && (day.getFullYear() !== current.getFullYear() || day.getMonth() !== current.getMonth())) return false;
    if (range === "this_year" && day.getFullYear() !== current.getFullYear()) return false;
    return day >= start && day <= startOfDay(current);
  });
}

export function sortSearchPerformanceSnapshots(rows = []) {
  return [...(Array.isArray(rows) ? rows.filter(Boolean) : [])].sort((left, right) => {
    const dateDelta = (toDate(right?.report_date)?.getTime() || 0) - (toDate(left?.report_date)?.getTime() || 0);
    if (dateDelta) return dateDelta;
    const impressionDelta = normalizeInteger(right?.impressions) - normalizeInteger(left?.impressions);
    if (impressionDelta) return impressionDelta;
    return (toDate(right?.created_at)?.getTime() || 0) - (toDate(left?.created_at)?.getTime() || 0);
  });
}

export function calculateSearchStats(rows = []) {
  const values = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const impressions = values.reduce((sum, row) => sum + normalizeInteger(row?.impressions), 0);
  const clicks = values.reduce((sum, row) => sum + normalizeInteger(row?.clicks), 0);
  const positions = values.map((row) => normalizeNumber(row?.average_position)).filter((value) => value !== null && value >= 0);
  return {
    count: values.length,
    impressions,
    clicks,
    ctr: calculateCtr(clicks, impressions),
    averagePosition: positions.length ? round(positions.reduce((sum, value) => sum + value, 0) / positions.length, 2) : null,
    queryCount: new Set(values.map((row) => safeTrim(row?.query).toLowerCase()).filter(Boolean)).size,
    pageCount: new Set(values.map((row) => safeTrim(row?.page_url).toLowerCase()).filter(Boolean)).size,
  };
}

export function getTopSearchQueries(rows = [], limit = 10) {
  return aggregateBy(rows, (row) => safeTrim(row?.query).toLowerCase() || "__unknown__", (row) => safeTrim(row?.query) || null, limit);
}

export function getTopPages(rows = [], limit = 10) {
  return aggregateBy(rows, (row) => safeTrim(row?.page_url).toLowerCase() || "__unknown__", (row) => safeTrim(row?.page_url) || null, limit);
}

export function buildSearchTrendData(rows = [], limit = 30) {
  const byDate = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const date = safeTrim(row?.report_date);
    if (!isValidDateOnly(date)) continue;
    const current = byDate.get(date) || { date, clicks: 0, impressions: 0 };
    current.clicks += normalizeInteger(row?.clicks);
    current.impressions += normalizeInteger(row?.impressions);
    byDate.set(date, current);
  }
  const points = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)).slice(-limit);
  const maxClicks = Math.max(...points.map((point) => point.clicks), 0);
  const maxImpressions = Math.max(...points.map((point) => point.impressions), 0);
  return points.map((point) => ({ ...point, clicksHeight: maxClicks ? Math.max((point.clicks / maxClicks) * 100, point.clicks ? 6 : 0) : 0, impressionsHeight: maxImpressions ? Math.max((point.impressions / maxImpressions) * 100, point.impressions ? 6 : 0) : 0 }));
}

export function normalizeImportHeader(header) {
  const normalized = safeTrim(header).toLowerCase().replace(/[\s./()-]+/g, "_").replace(/_+/g, "_");
  return HEADER_ALIASES[normalized] || null;
}

export function parseImportNumber(value) {
  const cleaned = safeTrim(value).replace(/,/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function parseImportPercent(value) {
  const cleaned = safeTrim(value).replace(/%$/, "");
  return parseImportNumber(cleaned);
}

export function parseSearchPerformanceImportText(text, options = {}) {
  const lines = String(text ?? "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { previewRows: [], validRows: [], errorRows: [], totalRows: 0 };
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const rawHeaders = parseDelimitedLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeImportHeader);
  const validRows = [];
  const errorRows = [];
  const previewRows = [];
  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = alignImportCells(parseDelimitedLine(line, delimiter), headers);
    const source = normalizeSearchSource(options.source || "csv_import");
    const form = {
      report_date: getImportCell(cells, headers, "report_date") || options.defaultReportDate || toDateOnly(new Date()),
      query: getImportCell(cells, headers, "query"),
      page_url: getImportCell(cells, headers, "page_url"),
      clicks: getImportCell(cells, headers, "clicks") || "0",
      impressions: getImportCell(cells, headers, "impressions") || "0",
      ctr: getImportCell(cells, headers, "ctr"),
      average_position: getImportCell(cells, headers, "average_position"),
      source,
      memo: options.memo || "",
    };
    const validation = validateImportRow(form);
    const preview = validation.valid ? { rowNumber, payload: buildSearchPerformancePayload(form), error: "" } : { rowNumber, payload: null, error: validation.error };
    previewRows.push(preview);
    if (preview.payload) validRows.push(preview.payload);
    else errorRows.push(preview);
  });
  return { previewRows, validRows, errorRows, totalRows: previewRows.length };
}

export function buildImportPreviewRows(parsedRows) {
  return parsedRows?.previewRows || [];
}

export function buildSearchPerformanceBulkPayloads(previewRows = []) {
  return (Array.isArray(previewRows) ? previewRows : []).filter((row) => row?.payload && !row.error).map((row) => row.payload);
}

export function formatSearchPerformanceDate(value, language = "en") {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { dateStyle: "medium" }).format(date);
}

export function formatPercent(value, language = "en") {
  return `${new Intl.NumberFormat(language === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 2 }).format(normalizeNumber(value) ?? 0)}%`;
}

export function formatPosition(value, language = "en") {
  if (normalizeNumber(value) === null) return "";
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 2 }).format(value);
}

export function formatInteger(value, language = "en") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 0 }).format(normalizeInteger(value));
}

export function safeTrim(value) {
  return String(value ?? "").trim();
}

export function emptyStringToNull(value) {
  const trimmed = safeTrim(value);
  return trimmed || null;
}

function aggregateBy(rows, keyer, labeler, limit) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = keyer(row);
    const current = groups.get(key) || { query: labeler(row), page_url: labeler(row), clicks: 0, impressions: 0, positions: [] };
    current.clicks += normalizeInteger(row?.clicks);
    current.impressions += normalizeInteger(row?.impressions);
    const position = normalizeNumber(row?.average_position);
    if (position !== null && position >= 0) current.positions.push(position);
    groups.set(key, current);
  }
  return [...groups.values()].map((group) => ({ ...group, ctr: calculateCtr(group.clicks, group.impressions), averagePosition: group.positions.length ? round(group.positions.reduce((sum, value) => sum + value, 0) / group.positions.length, 2) : null })).sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks).slice(0, limit);
}

function validateImportRow(form) {
  const clicks = parseImportNumber(form.clicks);
  const impressions = parseImportNumber(form.impressions);
  if (clicks === null || clicks < 0 || !Number.isInteger(clicks)) return { valid: false, error: "clicks" };
  if (impressions === null || impressions < 0 || !Number.isInteger(impressions)) return { valid: false, error: "impressions" };
  if (clicks > impressions) return { valid: false, error: "clicks_greater_than_impressions" };
  if (form.ctr !== null && form.ctr !== undefined && safeTrim(form.ctr) && (parseImportPercent(form.ctr) < 0 || parseImportPercent(form.ctr) > 100)) return { valid: false, error: "ctr" };
  if (form.average_position !== null && form.average_position !== undefined && safeTrim(form.average_position) && (parseImportNumber(form.average_position) < 0 || parseImportNumber(form.average_position) === null)) return { valid: false, error: "average_position" };
  if (!isValidDateOnly(form.report_date)) return { valid: false, error: "report_date" };
  return { valid: true };
}

function alignImportCells(cells, headers) {
  if (cells.length <= headers.length) return [...cells, ...Array(headers.length - cells.length).fill("")];
  const aligned = [];
  let cursor = 0;
  headers.forEach((header, index) => {
    const remainingHeaders = headers.length - index - 1;
    const remainingCells = cells.length - cursor;
    const extra = remainingCells - remainingHeaders - 1;
    const take = extra > 0 && ["clicks", "impressions", "ctr", "average_position"].includes(header) ? extra + 1 : 1;
    aligned.push(cells.slice(cursor, cursor + take).join(header === "ctr" ? "" : ""));
    cursor += take;
  });
  return aligned;
}

function getImportCell(cells, headers, key) {
  const index = headers.indexOf(key);
  return index >= 0 ? cells[index] ?? "" : "";
}

function parseDelimitedLine(line, delimiter) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function safeImportedText(value) {
  const text = emptyStringToNull(value);
  if (!text) return null;
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function parseRequiredInteger(value) {
  const text = safeTrim(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) ? number : null;
}

function normalizeInteger(value) {
  const number = normalizeNumber(value);
  return number === null ? 0 : Math.trunc(number);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(number) ? number : null;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

function toDateOnly(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
