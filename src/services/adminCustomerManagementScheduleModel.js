const EVENT_TYPES = ["consultation", "meeting", "follow_up_call", "contract", "site_visit", "payment", "document", "other"];
const EVENT_STATUSES = ["scheduled", "completed", "cancelled", "postponed", "no_show"];

export const CRM_EVENT_TYPE_OPTIONS = EVENT_TYPES;
export const CRM_EVENT_STATUS_OPTIONS = EVENT_STATUSES;

export function buildCrmEventPayload(formState = {}) {
  return {
    lead_id: emptyStringToNull(formState.lead_id),
    contractor_id: emptyStringToNull(formState.contractor_id),
    title: safeTrim(formState.title),
    event_type: normalizeEventType(formState.event_type),
    event_date: emptyStringToNull(formState.event_date),
    start_time: normalizeTime(formState.start_time),
    end_time: normalizeTime(formState.end_time),
    location: emptyStringToNull(formState.location),
    assigned_to: emptyStringToNull(formState.assigned_to),
    memo: emptyStringToNull(formState.memo),
    status: normalizeScheduleStatus(formState.status),
  };
}

export function validateCrmEventForm(formState = {}) {
  const errors = [];
  const title = safeTrim(formState.title);
  const eventDate = safeTrim(formState.event_date);
  const startTime = normalizeTime(formState.start_time);
  const endTime = normalizeTime(formState.end_time);
  if (!title) errors.push("title");
  if (!eventDate || !isValidDateOnly(eventDate)) errors.push("event_date");
  if (startTime && endTime && endTime < startTime) errors.push("end_time");
  return { valid: errors.length === 0, errors };
}

export function filterCrmEvents(events = [], leads = [], contractors = [], filters = {}) {
  const query = safeTrim(filters.query).toLowerCase();
  const eventType = safeTrim(filters.event_type).toLowerCase();
  const status = safeTrim(filters.status).toLowerCase();
  const leadById = new Map(safeRows(leads).map((lead) => [lead.id, lead]));
  const contractorById = new Map(safeRows(contractors).map((contractor) => [contractor.id, contractor]));
  return safeRows(events).filter((event) => {
    const lead = leadById.get(event?.lead_id);
    const contractor = contractorById.get(event?.contractor_id);
    const searchText = [event?.title, event?.location, event?.assigned_to, event?.memo, lead?.full_name, contractor?.full_name]
      .map((value) => safeTrim(value).toLowerCase())
      .join(" ");
    return (!query || searchText.includes(query))
      && (!eventType || eventType === "all" || normalizeEventType(event?.event_type) === eventType)
      && (!status || status === "all" || normalizeScheduleStatus(event?.status) === status);
  });
}

export function sortCrmEvents(events = []) {
  return [...safeRows(events)].sort((left, right) => {
    const dateDifference = compareDateOnly(left?.event_date, right?.event_date);
    if (dateDifference !== 0) return dateDifference;
    const leftTime = normalizeTime(left?.start_time);
    const rightTime = normalizeTime(right?.start_time);
    if (!leftTime && rightTime) return 1;
    if (leftTime && !rightTime) return -1;
    if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
    return compareDateTime(left?.created_at, right?.created_at);
  });
}

export function groupCrmEventsByDate(events = []) {
  const grouped = new Map();
  for (const event of sortCrmEvents(events)) {
    const dateKey = toDateKey(event?.event_date);
    if (!dateKey) continue;
    const rows = grouped.get(dateKey) || [];
    rows.push(event);
    grouped.set(dateKey, rows);
  }
  return grouped;
}

export function getEventsForDate(events = [], date) {
  const dateKey = toDateKey(date);
  return dateKey ? sortCrmEvents(events).filter((event) => toDateKey(event?.event_date) === dateKey) : [];
}

export function getTodayEvents(events = [], now = new Date()) {
  const todayKey = toDateKey(now);
  return safeRows(events).filter((event) => normalizeScheduleStatus(event?.status) !== "cancelled" && toDateKey(event?.event_date) === todayKey);
}

export function getThisWeekEvents(events = [], now = new Date()) {
  const current = toLocalDate(now);
  if (!current) return [];
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - current.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return safeRows(events).filter((event) => {
    if (normalizeScheduleStatus(event?.status) === "cancelled") return false;
    const date = toLocalDate(event?.event_date);
    return Boolean(date && date >= weekStart && date <= weekEnd);
  });
}

export function getUpcomingEvents(events = [], now = new Date()) {
  const todayKey = toDateKey(now);
  return sortCrmEvents(events).filter((event) => normalizeScheduleStatus(event?.status) !== "cancelled" && Boolean(todayKey && toDateKey(event?.event_date) > todayKey));
}

export function buildScheduleSummary(events = [], now = new Date()) {
  const rows = safeRows(events);
  const active = rows.filter((event) => normalizeScheduleStatus(event?.status) !== "cancelled");
  const today = getTodayEvents(rows, now);
  const thisWeek = getThisWeekEvents(rows, now);
  const upcoming = getUpcomingEvents(rows, now);
  const completed = rows.filter((event) => normalizeScheduleStatus(event?.status) === "completed");
  return { today, thisWeek, upcoming, completed, counts: { today: today.length, thisWeek: thisWeek.length, upcoming: upcoming.length, completed: completed.length, total: active.length } };
}

export function buildCalendarMonth(year, month) {
  const safeYear = Number.isInteger(Number(year)) ? Number(year) : new Date().getFullYear();
  const safeMonth = Number.isInteger(Number(month)) ? Number(month) : new Date().getMonth();
  const firstDay = new Date(safeYear, safeMonth, 1).getDay();
  const daysInMonth = new Date(safeYear, safeMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  while (cells.length % 7 !== 0) cells.push(null);
  return { year: safeYear, month: safeMonth, firstDay, daysInMonth, cells };
}

export function getCalendarDayDots(events = [], date) {
  const unique = new Map();
  for (const event of getEventsForDate(events, date)) {
    const type = normalizeEventType(event?.event_type);
    const status = normalizeScheduleStatus(event?.status);
    unique.set(`${type}-${status}`, { type, status });
  }
  return [...unique.values()].slice(0, 3);
}

export function formatEventDateKey(value) {
  return toDateKey(value);
}

export function getEventTypeLabel(type, language = "en") {
  const labels = {
    consultation: ["Consultation", "상담"],
    meeting: ["Meeting", "미팅"],
    follow_up_call: ["Follow-up Call", "후속 전화"],
    contract: ["Contract", "계약"],
    site_visit: ["Site Visit", "현장 방문"],
    payment: ["Payment", "납부"],
    document: ["Document", "문서"],
    other: ["Other", "기타"],
  };
  const raw = safeTrim(type);
  return labels[normalizeEventType(raw)]?.[language === "kr" ? 1 : 0] || raw || labels.other[language === "kr" ? 1 : 0];
}

export function getEventStatusLabel(status, language = "en") {
  const labels = {
    scheduled: ["Scheduled", "예정됨"],
    completed: ["Completed", "완료"],
    cancelled: ["Cancelled", "취소됨"],
    postponed: ["Postponed", "연기됨"],
    no_show: ["No Show", "미방문"],
  };
  const raw = safeTrim(status);
  return labels[normalizeScheduleStatus(raw)]?.[language === "kr" ? 1 : 0] || raw || labels.scheduled[language === "kr" ? 1 : 0];
}

export function formatEventDate(value, language = "en") {
  const date = toLocalDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { dateStyle: "medium" }).format(date);
}

export function formatEventTime(value) {
  const normalized = normalizeTime(value);
  return normalized || "";
}

export function formatEventTimeRange(startTime, endTime, language = "en") {
  const start = formatEventTime(startTime);
  const end = formatEventTime(endTime);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return language === "kr" ? "종일" : "All day";
}

export function normalizeEventType(type) {
  const normalized = normalizeStatus(type);
  return EVENT_TYPES.includes(normalized) ? normalized : "other";
}

export function normalizeScheduleStatus(status) {
  const normalized = normalizeStatus(status);
  return EVENT_STATUSES.includes(normalized) ? normalized : "scheduled";
}

function safeTrim(value) {
  return String(value ?? "").trim();
}

function emptyStringToNull(value) {
  const trimmed = safeTrim(value);
  return trimmed || null;
}

function safeRows(rows) {
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}

function normalizeTime(value) {
  const trimmed = safeTrim(value);
  if (!trimmed) return null;
  return /^\d{2}:\d{2}/.test(trimmed) ? trimmed.slice(0, 5) : trimmed;
}

function isValidDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toLocalDate(value) !== null;
}

function toLocalDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const raw = safeTrim(value);
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toDateKey(value) {
  const date = toLocalDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function compareDateOnly(left, right) {
  return (toLocalDate(left)?.getTime() || 0) - (toLocalDate(right)?.getTime() || 0);
}

function compareDateTime(left, right) {
  return (new Date(left || 0).getTime() || 0) - (new Date(right || 0).getTime() || 0);
}

function normalizeStatus(value) {
  return safeTrim(value).toLowerCase().replace(/\s+/g, "_");
}
