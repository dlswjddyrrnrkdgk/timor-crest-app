export const DEFAULT_JOURNEY_STEPS = [
  {
    step_no: 1,
    title: "계약 및 예약 확인",
    subtitle: "Contract confirmation",
    description: "계약 및 예약 정보 확인이 완료된 단계입니다.",
    status: "completed",
    progress_percent: 100,
    target_date: "2026-07-01",
    completed_date: "2026-07-01",
  },
  {
    step_no: 2,
    title: "설계 및 인허가 준비",
    subtitle: "Design and permits",
    description: "설계 검토와 인허가 준비를 진행하는 단계입니다.",
    status: "in_progress",
    progress_percent: 45,
    target_date: "2026-08-30",
    completed_date: null,
  },
  {
    step_no: 3,
    title: "기초공사",
    subtitle: "Foundation works",
    description: "현장 기초공사 착수와 완료 현황을 안내합니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2026-10-20",
    completed_date: null,
  },
  {
    step_no: 4,
    title: "골조공사",
    subtitle: "Structural frame",
    description: "건물 골조공사의 주요 진행 상황을 안내합니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2026-12-20",
    completed_date: null,
  },
  {
    step_no: 5,
    title: "벽체 및 외장공사",
    subtitle: "Walls and exterior",
    description: "벽체 시공과 외장 공정 진행 상황을 안내합니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2027-02-20",
    completed_date: null,
  },
  {
    step_no: 6,
    title: "지붕 / 천장 / 전기공사",
    subtitle: "Roof, ceiling and electrical",
    description: "지붕, 천장, 전기 설비 공정 진행 상황을 안내합니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2027-04-20",
    completed_date: null,
  },
  {
    step_no: 7,
    title: "내부 마감 및 점검",
    subtitle: "Interior finishing and inspection",
    description: "내부 마감과 품질 점검 진행 상황을 안내합니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2027-06-20",
    completed_date: null,
  },
  {
    step_no: 8,
    title: "입주 준비 완료",
    subtitle: "Move-in preparation",
    description: "입주 전 최종 준비와 안내가 제공되는 단계입니다.",
    status: "pending",
    progress_percent: 0,
    target_date: "2027-08-31",
    completed_date: null,
  },
];

const ENGLISH_JOURNEY_STEP_TITLES = {
  1: "Contract & Booking Confirmation",
  2: "Design & Permit Preparation",
  3: "Foundation Work",
  4: "Structural Frame Work",
  5: "Wall & Exterior Work",
  6: "Roof, Ceiling & Electrical Work",
  7: "Interior Finishing & Inspection",
  8: "Move-in Preparation Complete",
};

const ENGLISH_JOURNEY_STEP_DESCRIPTIONS = {
  1: "Contract and booking information has been confirmed.",
  2: "Design and permit preparation is in progress.",
  3: "Foundation work has been completed.",
  4: "Structural frame work has been completed.",
  5: "Wall and exterior work has been completed.",
  6: "Roof, ceiling, and electrical work has been completed.",
  7: "Interior finishing and inspection have been completed.",
  8: "Move-in preparation is complete.",
};

const JOURNEY_STEP_EDIT_FIELDS = [
  "title",
  "subtitle",
  "description",
  "status",
  "progress_percent",
  "target_date",
  "completed_date",
  "note",
];

export function getJourneyStepTitle(step, language = "kr") {
  if (language === "en") {
    return ENGLISH_JOURNEY_STEP_TITLES[Number(step?.step_no)] || step?.title || "";
  }

  return step?.title || "";
}

export function getJourneyStepDescription(step, language = "kr") {
  if (language === "en") {
    return ENGLISH_JOURNEY_STEP_DESCRIPTIONS[Number(step?.step_no)] || step?.description || "";
  }

  return step?.description || "";
}

export function calculateJourneyOverallProgress(steps) {
  const rows = Array.isArray(steps) ? steps : [];
  if (!rows.length) return 0;

  const total = rows.reduce((sum, step) => sum + normalizeProgressPercent(step.progress_percent), 0);
  return Math.round(total / rows.length);
}

export function getCurrentJourneyStep(steps) {
  const rows = normalizeStepOrder(steps);
  if (!rows.length) return null;

  return (
    rows.find((step) => step.status === "in_progress") ||
    rows.find((step) => normalizeProgressPercent(step.progress_percent) < 100) ||
    rows[rows.length - 1]
  );
}

export function normalizeProgressPercent(value) {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(Math.round(next), 100));
}

export function buildJourneyStepUpdatePayload(step) {
  return {
    title: normalizeRequiredText(step.title),
    subtitle: normalizeOptionalText(step.subtitle),
    description: normalizeOptionalText(step.description),
    status: normalizeOptionalText(step.status) || "pending",
    progress_percent: normalizeProgressPercent(step.progress_percent),
    target_date: normalizeOptionalText(step.target_date),
    completed_date: normalizeOptionalText(step.completed_date),
    note: normalizeOptionalText(step.note),
  };
}

export function normalizeJourneyStepDraft(step) {
  return {
    id: step?.id || "",
    step_no: Number(step?.step_no ?? 0),
    ...buildJourneyStepUpdatePayload(step || {}),
  };
}

export function hasJourneyStepChanges(originalStep, draftStep) {
  const original = normalizeJourneyStepDraft(originalStep);
  const draft = normalizeJourneyStepDraft(draftStep);
  return JOURNEY_STEP_EDIT_FIELDS.some((field) => original[field] !== draft[field]);
}

export function getChangedJourneyStepPayloads(originalSteps, draftSteps) {
  const originalById = new Map((Array.isArray(originalSteps) ? originalSteps : []).map((step) => [step.id, step]));
  return (Array.isArray(draftSteps) ? draftSteps : [])
    .filter((step) => step.id && hasJourneyStepChanges(originalById.get(step.id), step))
    .map((step) => ({ id: step.id, values: buildJourneyStepUpdatePayload(step) }));
}

function normalizeStepOrder(steps) {
  return Array.isArray(steps)
    ? [...steps].sort((first, second) => Number(first.step_no || 0) - Number(second.step_no || 0))
    : [];
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim();
}

function normalizeOptionalText(value) {
  const next = normalizeRequiredText(value);
  return next || null;
}
