import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_JOURNEY_STEPS, calculateJourneyOverallProgress, getCurrentJourneyStep } from "../src/services/journeyModel.js";

test("default Journey contains the required 8 shared construction steps", () => {
  assert.equal(DEFAULT_JOURNEY_STEPS.length, 8);
  assert.deepEqual(
    DEFAULT_JOURNEY_STEPS.map((step) => step.title),
    [
      "계약 및 예약 확인",
      "설계 및 인허가 준비",
      "기초공사",
      "골조공사",
      "벽체 및 외장공사",
      "지붕 / 천장 / 전기공사",
      "내부 마감 및 점검",
      "입주 준비 완료",
    ],
  );
});

test("overall Journey progress is the rounded average of step progress", () => {
  assert.equal(calculateJourneyOverallProgress([{ progress_percent: 100 }, { progress_percent: 40 }, { progress_percent: 0 }]), 47);
  assert.equal(calculateJourneyOverallProgress([]), 0);
});

test("current Journey step prefers in_progress, then first incomplete, then final step", () => {
  assert.equal(
    getCurrentJourneyStep([
      { step_no: 2, status: "in_progress", progress_percent: 45, title: "설계 및 인허가 준비" },
      { step_no: 1, status: "completed", progress_percent: 100, title: "계약 및 예약 확인" },
    ]).step_no,
    2,
  );

  assert.equal(
    getCurrentJourneyStep([
      { step_no: 1, status: "completed", progress_percent: 100 },
      { step_no: 2, status: "pending", progress_percent: 0 },
    ]).step_no,
    2,
  );

  assert.equal(
    getCurrentJourneyStep(DEFAULT_JOURNEY_STEPS.map((step) => ({ ...step, status: "completed", progress_percent: 100 }))).step_no,
    8,
  );
});
