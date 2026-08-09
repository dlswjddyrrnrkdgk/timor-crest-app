import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  calculateJourneyKpis,
  getJourneyStageStatus,
} from "../src/services/adminJourneyModel.js";
import {
  getChangedJourneyStepPayloads,
  normalizeProgressPercent,
} from "../src/services/journeyModel.js";

const steps = [
  { id: "step-1", step_no: 1, title: "계약 및 예약 확인", status: "completed", progress_percent: 100 },
  { id: "step-2", step_no: 2, title: "설계 및 인허가 준비", status: "in_progress", progress_percent: 50 },
  { id: "step-3", step_no: 3, title: "기초공사", status: "pending", progress_percent: 0 },
  { id: "step-4", step_no: 4, title: "골조공사", status: "pending", progress_percent: 0 },
];

describe("Admin Journey CRM model", () => {
  it("calculates overall progress and stage KPIs from shared steps", () => {
    assert.deepEqual(calculateJourneyKpis(steps), {
      completedSteps: 1,
      currentStep: steps[1],
      inProgressSteps: 1,
      overallProgress: 38,
      remainingSteps: 3,
    });
    assert.deepEqual(calculateJourneyKpis(null), {
      completedSteps: 0,
      currentStep: null,
      inProgressSteps: 0,
      overallProgress: 0,
      remainingSteps: 0,
    });
  });

  it("derives completed, in-progress, and pending status from progress", () => {
    assert.deepEqual(getJourneyStageStatus({ progress_percent: 100 }), { key: "completed", tone: "success" });
    assert.deepEqual(getJourneyStageStatus({ progress_percent: 35 }), { key: "in_progress", tone: "warning" });
    assert.deepEqual(getJourneyStageStatus({ progress_percent: 0 }), { key: "pending", tone: "neutral" });
    assert.equal(normalizeProgressPercent(0), 0);
    assert.equal(normalizeProgressPercent(150), 100);
  });

  it("keeps zero-valued progress changes in save payloads", () => {
    const fiftyToZero = getChangedJourneyStepPayloads(
      [{ id: "step-1", title: "A", status: "pending", progress_percent: 50 }],
      [{ id: "step-1", title: "A", status: "pending", progress_percent: 0 }],
    );
    const zeroToThirty = getChangedJourneyStepPayloads(
      [{ id: "step-2", title: "B", status: "pending", progress_percent: 0 }],
      [{ id: "step-2", title: "B", status: "pending", progress_percent: 30 }],
    );

    assert.equal(fiftyToZero[0].values.progress_percent, 0);
    assert.equal(zeroToThirty[0].values.progress_percent, 30);
  });

  it("connects the CRM route, editor controls, reset flow, preview, and bilingual labels", () => {
    const layoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const pageSource = readFileSync(new URL("../src/components/admin/JourneyPage.jsx", import.meta.url), "utf8");
    for (const key of ["Journey", "Manage the shared project journey and construction progress.", "Overall Progress", "Current Stage", "Completed Steps", "Remaining Steps", "Project Timeline", "Progress Board", "Contractor Preview", "Save Changes", "Reset", "Unsaved changes", "No journey data."]) {
      assert.ok(translations.en[key], "Missing EN translation: " + key);
      assert.ok(translations.kr[key], "Missing KR translation: " + key);
    }
    assert.ok(layoutSource.includes('<Route path="journey" element={<JourneyCrmPage {...shell} />} />'));
    assert.match(layoutSource, /resetJourneyChanges/);
    assert.match(pageSource, /crm-journey__save-bar/);
    assert.match(pageSource, /updateJourneyDraftStep/);
    assert.match(pageSource, /type="range"/);
    assert.match(pageSource, /type="number"/);
    assert.match(pageSource, /Progress Board/);
  });
});
