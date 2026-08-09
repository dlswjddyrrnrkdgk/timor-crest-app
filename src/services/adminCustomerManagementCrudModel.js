export function normalizeLeadSource(source) {
  return normalizeStatus(source) || "other";
}

export function normalizeConsultationMethod(method) {
  return normalizeStatus(method) || "other";
}

export function normalizeConsultationResult(result) {
  return normalizeStatus(result) || "unknown";
}

export function safeTrim(value) {
  return String(value ?? "").trim();
}

export function emptyStringToNull(value) {
  const trimmed = safeTrim(value);
  return trimmed || null;
}

export function buildSalesLeadPayload(formState = {}) {
  return {
    lead_date: emptyStringToNull(formState.lead_date),
    full_name: safeTrim(formState.full_name),
    phone: emptyStringToNull(formState.phone),
    email: emptyStringToNull(formState.email),
    source: emptyStringToNull(formState.source ? normalizeLeadSource(formState.source) : ""),
    interested_unit: emptyStringToNull(formState.interested_unit),
    assigned_to: emptyStringToNull(formState.assigned_to),
    status: formState.status ? normalizeLeadStatus(formState.status) : "new",
    memo: emptyStringToNull(formState.memo),
  };
}

export function validateSalesLeadForm(formState = {}) {
  const errors = [];
  if (!safeTrim(formState.lead_date)) errors.push("lead_date");
  if (!safeTrim(formState.full_name)) errors.push("full_name");
  const email = safeTrim(formState.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("email");
  return { valid: errors.length === 0, errors };
}

export function filterSalesLeads(leads = [], filters = {}) {
  const query = safeTrim(filters.query).toLowerCase();
  const status = safeTrim(filters.status).toLowerCase();
  const source = safeTrim(filters.source).toLowerCase();
  return (Array.isArray(leads) ? leads : []).filter((lead) => {
    const searchText = [lead?.full_name, lead?.phone, lead?.email, lead?.interested_unit, lead?.memo, lead?.assigned_to].map((value) => safeTrim(value).toLowerCase()).join(" ");
    return (!query || searchText.includes(query)) && (!status || status === "all" || normalizeLeadStatus(lead?.status) === status) && (!source || source === "all" || normalizeLeadSource(lead?.source) === source);
  });
}

export function sortSalesLeads(leads = []) {
  return [...(Array.isArray(leads) ? leads : [])].sort((left, right) => compareDateFields(right, left, ["lead_date", "created_at"]));
}

export function getLeadStatusLabel(status, language = "en") {
  const labels = { new: ["New", "신규"], scheduled: ["Scheduled", "예정"], consulted: ["Consulted", "상담 완료"], high_potential: ["High Potential", "계약 가능성 높음"], converted: ["Converted", "계약 전환"], on_hold: ["On Hold", "보류"], cancelled: ["Cancelled", "취소"] };
  return labels[normalizeLeadStatus(status)]?.[language === "kr" ? 1 : 0] || emptyStringToNull(status) || "—";
}

export function getLeadSourceLabel(source, language = "en") {
  const labels = { google_search: ["Google Search", "Google 검색"], google_ads: ["Google Ads", "Google 광고"], instagram: ["Instagram", "Instagram"], facebook: ["Facebook", "Facebook"], referral: ["Referral", "지인 소개"], walk_in: ["Walk-in", "현장 방문"], phone: ["Phone", "전화"], whatsapp: ["WhatsApp", "WhatsApp"], website: ["Website", "웹사이트"], other: ["Other", "기타"] };
  const rawSource = safeTrim(source);
  return labels[normalizeLeadSource(rawSource)]?.[language === "kr" ? 1 : 0] || rawSource || "—";
}

export function buildConsultationPayload(formState = {}) {
  return {
    lead_id: emptyStringToNull(formState.lead_id),
    contractor_id: emptyStringToNull(formState.contractor_id),
    consultation_date: normalizeDateTimeValue(formState.consultation_date),
    method: normalizeConsultationMethod(formState.method),
    consultant: emptyStringToNull(formState.consultant),
    summary: safeTrim(formState.summary),
    customer_interest: emptyStringToNull(formState.customer_interest),
    next_action: emptyStringToNull(formState.next_action),
    next_follow_up_date: emptyStringToNull(formState.next_follow_up_date),
    result: emptyStringToNull(formState.result ? normalizeConsultationResult(formState.result) : ""),
  };
}

export function validateConsultationForm(formState = {}) {
  const errors = [];
  if (!safeTrim(formState.consultation_date) || !toDate(formState.consultation_date)) errors.push("consultation_date");
  if (!safeTrim(formState.summary)) errors.push("summary");
  return { valid: errors.length === 0, errors };
}

export function filterConsultationNotes(notes = [], leads = [], filters = {}) {
  const query = safeTrim(filters.query).toLowerCase();
  const method = safeTrim(filters.method).toLowerCase();
  const result = safeTrim(filters.result).toLowerCase();
  const leadById = new Map((Array.isArray(leads) ? leads : []).filter(Boolean).map((lead) => [lead.id, lead]));
  return (Array.isArray(notes) ? notes : []).filter((note) => {
    const lead = leadById.get(note?.lead_id);
    const searchText = [lead?.full_name, note?.consultant, note?.summary, note?.customer_interest, note?.next_action, note?.result].map((value) => safeTrim(value).toLowerCase()).join(" ");
    return (!query || searchText.includes(query)) && (!method || method === "all" || normalizeConsultationMethod(note?.method) === method) && (!result || result === "all" || normalizeConsultationResult(note?.result) === result);
  });
}

export function sortConsultationNotes(notes = []) {
  return [...(Array.isArray(notes) ? notes : [])].sort((left, right) => compareDateFields(right, left, ["consultation_date", "created_at"]));
}

export function getConsultationMethodLabel(method, language = "en") {
  const labels = { phone: ["Phone", "전화"], visit: ["Visit", "방문"], video_call: ["Video Call", "화상 미팅"], whatsapp: ["WhatsApp", "WhatsApp"], email: ["Email", "이메일"], other: ["Other", "기타"] };
  return labels[normalizeConsultationMethod(method)]?.[language === "kr" ? 1 : 0] || emptyStringToNull(method) || "—";
}

export function getConsultationResultLabel(result, language = "en") {
  const labels = { needs_follow_up: ["Needs Follow-up", "추가 상담 필요"], sent_materials: ["Sent Materials", "자료 전달"], reviewing_contract: ["Reviewing Contract", "계약 검토"], high_interest: ["High Interest", "관심 높음"], converted: ["Converted", "계약 전환"], low_interest: ["Low Interest", "관심 낮음"], on_hold: ["On Hold", "보류"] };
  return labels[normalizeConsultationResult(result)]?.[language === "kr" ? 1 : 0] || emptyStringToNull(result) || "—";
}

function compareDateFields(left, right, fields) {
  for (const field of fields) {
    const difference = (toDate(left?.[field])?.getTime() || 0) - (toDate(right?.[field])?.getTime() || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeLeadStatus(status) {
  return normalizeStatus(status) || "unknown";
}

function normalizeDateTimeValue(value) {
  const trimmed = safeTrim(value);
  if (!trimmed) return null;
  const date = toDate(trimmed);
  return date ? date.toISOString() : trimmed;
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
