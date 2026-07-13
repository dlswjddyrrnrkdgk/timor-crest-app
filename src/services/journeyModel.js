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

export function getJourneyStepTitle(step, language = "kr") {
  if (language === "en") {
    return ENGLISH_JOURNEY_STEP_TITLES[Number(step?.step_no)] || step?.title || "";
  }

  return step?.title || "";
}

export function calculateJourneyOverallProgress(steps) {
  const rows = Array.isArray(steps) ? steps : [];
  if (!rows.length) return 0;

  const total = rows.reduce((sum, step) => sum + Number(step.progress_percent || 0), 0);
  return Math.round(total / rows.length);
}

export function getCurrentJourneyStep(steps) {
  const rows = normalizeStepOrder(steps);
  if (!rows.length) return null;

  return (
    rows.find((step) => step.status === "in_progress") ||
    rows.find((step) => Number(step.progress_percent || 0) < 100) ||
    rows[rows.length - 1]
  );
}

function normalizeStepOrder(steps) {
  return Array.isArray(steps)
    ? [...steps].sort((first, second) => Number(first.step_no || 0) - Number(second.step_no || 0))
    : [];
}
