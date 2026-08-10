const EMPTY_STATS = { count: 0, recent: [] };

export function buildCustomerManagementSummary(data = {}, now = new Date()) {
  const salesLeads = Array.isArray(data.salesLeads) ? data.salesLeads : [];
  const consultationNotes = Array.isArray(data.consultationNotes) ? data.consultationNotes : [];
  const crmEvents = Array.isArray(data.crmEvents) ? data.crmEvents : [];
  const searchSnapshots = Array.isArray(data.searchSnapshots) ? data.searchSnapshots : [];
  const sales = calculateLeadStats(salesLeads);
  const consultations = calculateConsultationStats(consultationNotes, now);
  const events = calculateEventStats(crmEvents, now);
  const search = calculateSearchStats(searchSnapshots);
  return {
    kpis: { totalLeads: sales.count, consultationsThisMonth: consultations.thisMonth, upcomingMeetings: events.upcoming.length, searchImpressions: search.impressions },
    sales,
    consultations,
    events,
    search,
  };
}

export function calculateLeadStats(leads = []) {
  const rows = Array.isArray(leads) ? leads.filter(Boolean) : [];
  return { ...EMPTY_STATS, count: rows.length, recent: [...rows].sort(compareRecent).slice(0, 5) };
}

export function calculateConsultationStats(notes = [], now = new Date()) {
  const rows = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const current = toDate(now) || new Date();
  return { ...EMPTY_STATS, count: rows.length, thisMonth: rows.filter((note) => isSameMonth(note?.consultation_date, current)).length, recent: [...rows].sort(compareRecent).slice(0, 5) };
}

export function calculateEventStats(events = [], now = new Date()) {
  const rows = Array.isArray(events) ? events.filter(Boolean) : [];
  const current = toDate(now) || new Date();
  const upcoming = rows.filter((event) => normalizeEventStatus(event?.status) !== "cancelled").filter((event) => isOnOrAfterDate(event?.event_date, current)).sort(compareEventDate);
  return { ...EMPTY_STATS, count: rows.length, today: upcoming.filter((event) => isSameDay(event?.event_date, current)), upcoming, recent: [...rows].sort(compareEventDate).slice(0, 5) };
}

export function calculateSearchStats(snapshots = []) {
  const rows = Array.isArray(snapshots) ? snapshots.filter(Boolean) : [];
  const impressions = rows.reduce((sum, row) => sum + nonNegativeNumber(row?.impressions), 0);
  const clicks = rows.reduce((sum, row) => sum + nonNegativeNumber(row?.clicks), 0);
  const weightedPosition = rows.reduce((sum, row) => {
    const position = finiteNumber(row?.average_position);
    const weight = nonNegativeNumber(row?.impressions);
    return position === null ? sum : sum + (weight > 0 ? position * weight : position);
  }, 0);
  const positionWeight = rows.reduce((sum, row) => {
    const weight = nonNegativeNumber(row?.impressions);
    return sum + (weight > 0 ? weight : finiteNumber(row?.average_position) === null ? 0 : 1);
  }, 0);
  return {
    count: rows.length,
    impressions,
    clicks,
    ctr: impressions > 0 ? roundPercent((clicks / impressions) * 100) : 0,
    averagePosition: positionWeight > 0 ? roundNumber(weightedPosition / positionWeight, 2) : null,
    latestDate: [...rows].sort(compareRecent)[0]?.report_date || null,
    topQueries: getTopSearchQueries(rows),
  };
}

export function getTopSearchQueries(snapshots = []) {
  const byQuery = new Map();
  for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
    const query = String(snapshot?.query ?? "").trim();
    if (!query) continue;
    const current = byQuery.get(query) || { query, impressions: 0, clicks: 0 };
    current.impressions += nonNegativeNumber(snapshot?.impressions);
    current.clicks += nonNegativeNumber(snapshot?.clicks);
    byQuery.set(query, current);
  }
  return [...byQuery.values()].sort((left, right) => right.impressions - left.impressions).slice(0, 5);
}

export function normalizeLeadStatus(status) {
  return normalizeStatus(status) || "unknown";
}

export function normalizeEventStatus(status) {
  return normalizeStatus(status) || "scheduled";
}

export function formatCustomerManagementDate(value, language = "en") {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { dateStyle: "medium" }).format(date);
}

export function getCalendarMonth(now = new Date()) {
  const current = toDate(now) || new Date();
  const year = current.getFullYear();
  const month = current.getMonth();
  return { year, month, firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate() };
}

export function formatCustomerManagementDateTime(value, language = "en") {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isSameMonth(value, current) {
  const date = toDate(value);
  return Boolean(date && date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth());
}

function isSameDay(value, current) {
  const date = toDate(value);
  return Boolean(date && date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth() && date.getDate() === current.getDate());
}

function isOnOrAfterDate(value, current) {
  const date = toDate(value);
  if (!date) return false;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() >= new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
}

function compareRecent(left, right) {
  return (toDate(right?.lead_date || right?.report_date || right?.consultation_date || right?.created_at)?.getTime() || 0) - (toDate(left?.lead_date || left?.report_date || left?.consultation_date || left?.created_at)?.getTime() || 0);
}

function compareEventDate(left, right) {
  return (toDate(`${right?.event_date || ""}T${right?.start_time || "00:00:00"}`)?.getTime() || 0) - (toDate(`${left?.event_date || ""}T${left?.start_time || "00:00:00"}`)?.getTime() || 0);
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeNumber(value) {
  return Math.max(finiteNumber(value) ?? 0, 0);
}

function roundPercent(value) {
  return Math.round(value * 100) / 100;
}

function roundNumber(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export * from "./adminCustomerManagementCrudModel.js";
export * from "./adminCustomerManagementScheduleModel.js";
