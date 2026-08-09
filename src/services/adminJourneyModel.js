import {
  calculateJourneyOverallProgress,
  getJourneyStepDescription,
  getJourneyStepTitle,
  normalizeProgressPercent,
} from "./journeyModel.js";

export function getJourneyStageProgress(step) {
  return normalizeProgressPercent(step?.progress_percent);
}

export function getJourneyStageStatus(step) {
  const progress = getJourneyStageProgress(step);
  if (progress >= 100) return { key: "completed", tone: "success" };
  if (progress > 0) return { key: "in_progress", tone: "warning" };
  return { key: "pending", tone: "neutral" };
}

export function calculateJourneyKpis(steps = []) {
  const rows = Array.isArray(steps) ? steps : [];
  const completedSteps = rows.filter((step) => getJourneyStageProgress(step) >= 100).length;
  const remainingSteps = rows.filter((step) => getJourneyStageProgress(step) < 100).length;
  const inProgressSteps = rows.filter((step) => {
    const progress = getJourneyStageProgress(step);
    return progress > 0 && progress < 100;
  }).length;

  return {
    completedSteps,
    currentStep: getFirstIncompleteJourneyStep(rows),
    inProgressSteps,
    overallProgress: calculateJourneyOverallProgress(rows),
    remainingSteps,
  };
}

function getFirstIncompleteJourneyStep(steps) {
  const orderedSteps = [...steps].sort((first, second) => Number(first?.step_no || 0) - Number(second?.step_no || 0));
  return orderedSteps.find((step) => getJourneyStageProgress(step) < 100) || orderedSteps[orderedSteps.length - 1] || null;
}

export function getJourneyStageTitle(step, language) {
  return getJourneyStepTitle(step, language);
}

export function getJourneyStageDescription(step, language) {
  return getJourneyStepDescription(step, language);
}
