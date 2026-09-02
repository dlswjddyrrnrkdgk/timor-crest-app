import { useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  calculateJourneyKpis,
  getJourneyStageDescription,
  getJourneyStageProgress,
  getJourneyStageStatus,
  getJourneyStageTitle,
} from "../../services/adminJourneyModel.js";
import { useProject } from "../../context/ProjectContext.jsx";

const QUICK_PROGRESS_VALUES = [0, 25, 50, 75, 100];

export default function JourneyPage({
  ensureJourneyDefaults,
  hasJourneyChanges,
  journeyMessage,
  journeySteps,
  language,
  resetJourneyChanges,
  status,
  submitJourneyChanges,
  t,
  updateJourneyDraftStep,
}) {
  const { selectedProject } = useProject();
  const steps = useMemo(
    () => [...(Array.isArray(journeySteps) ? journeySteps : [])].sort((first, second) => Number(first.step_no || 0) - Number(second.step_no || 0)),
    [journeySteps],
  );
  const kpis = calculateJourneyKpis(steps);
  const [selectedStepId, setSelectedStepId] = useState("");
  const selectedStep = steps.find((step) => step.id === selectedStepId) || kpis.currentStep || steps[0] || null;
  const isSaving = status === "saving";

  useEffect(() => {
    if (!steps.length) {
      setSelectedStepId("");
      return;
    }
    if (!selectedStepId || !steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId((kpis.currentStep || steps[0]).id);
    }
  }, [kpis.currentStep, selectedStepId, steps]);

  function updateProgress(value) {
    if (!selectedStep) return;
    updateJourneyDraftStep(selectedStep.id, "progress_percent", value);
  }

  function updateSelectedField(event) {
    if (!selectedStep) return;
    updateJourneyDraftStep(selectedStep.id, event.target.name, event.target.value);
  }

  return (
    <div className="crm-dashboard crm-journey">
      <section className="crm-page-heading crm-journey__heading">
        <div>
          <span className="crm-eyebrow">PROJECT JOURNEY</span>
          <h1>{t("Journey")}</h1>
          <p>{t("Manage the shared project journey and construction progress.")}</p>
          <span className="crm-project-scope-note">{t("Current Project")}: {selectedProject?.name || t("Not available")} · {t("Showing project-specific data.")}</span>
        </div>
        {steps.length < 8 ? (
          <button className="crm-button crm-button--secondary" disabled={isSaving} onClick={ensureJourneyDefaults} type="button">
            <AdminIcon name="journey" size={16} />
            {t("Create / Repair Journey Steps")}
          </button>
        ) : null}
      </section>

      {journeyMessage ? <p className="crm-journey__message crm-journey__message--error">{t(journeyMessage)}</p> : null}

      <section className="crm-kpi-grid crm-journey__kpis" aria-label={t("Journey KPIs")}>
        <KpiCard helper={`${kpis.completedSteps} / ${steps.length || 8} ${t("stages")}`} icon="trend" label={t("Overall Progress")} tone="blue" value={`${kpis.overallProgress}%`} />
        <KpiCard helper={kpis.currentStep ? formatStageStatus(kpis.currentStep, t) : t("Not set")} icon="building" label={t("Current Stage")} tone="purple" value={kpis.currentStep ? getJourneyStageTitle(kpis.currentStep, language) : t("Not set")} />
        <KpiCard helper={t("of all stages")} icon="journey" label={t("Completed Steps")} tone="success" value={kpis.completedSteps} />
        <KpiCard helper={t("Need attention")} icon="calendar" label={t("Remaining Steps")} tone="warning" value={kpis.remainingSteps} />
      </section>

      {!steps.length ? (
        <section className="crm-card crm-journey__empty-card">
          <EmptyState>{t("No journey data.")}</EmptyState>
          <button className="crm-button crm-button--primary" disabled={isSaving} onClick={ensureJourneyDefaults} type="button">
            {t("Create / Repair Journey Steps")}
          </button>
        </section>
      ) : (
        <section className="crm-journey__workspace">
          <article className="crm-card crm-journey__timeline-card">
            <header className="crm-card__header">
              <div>
                <h2>{t("Project Timeline")}</h2>
                <p>{t("Journey stages")}</p>
              </div>
              <strong className="crm-journey__overall-value">{kpis.overallProgress}%</strong>
            </header>
            <div className="crm-journey__timeline" role="list">
              {steps.map((step) => {
                const progress = getJourneyStageProgress(step);
                const stageStatus = getJourneyStageStatus(step);
                const isSelected = selectedStep?.id === step.id;
                return (
                  <div className="crm-journey__step-item" key={step.id || step.step_no} role="listitem">
                    <button
                      aria-pressed={isSelected}
                      className={`crm-journey__step crm-journey__step--${stageStatus.key}${isSelected ? " is-selected" : ""}`}
                      onClick={() => setSelectedStepId(step.id)}
                      type="button"
                    >
                      <span className="crm-journey__step-number">{step.step_no}</span>
                      <span className="crm-journey__step-icon"><AdminIcon name="journey" size={17} /></span>
                      <span className="crm-journey__step-copy">
                        <strong>{getJourneyStageTitle(step, language)}</strong>
                        <small>{getJourneyStageDescription(step, language)}</small>
                      </span>
                      <span className="crm-journey__step-progress">
                        <span><b>{t("Progress")}</b><strong>{progress}%</strong></span>
                        <span className="crm-journey__progress-track"><i style={{ width: `${progress}%` }} /></span>
                      </span>
                      <StatusBadge tone={stageStatus.tone}>{formatStageStatus(step, t)}</StatusBadge>
                      <span className="crm-journey__step-date">{formatJourneyDate(step, t)}</span>
                      <AdminIcon name="chevron" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="crm-journey__aside">
            <article className="crm-card crm-journey__editor-card">
              <header className="crm-card__header">
                <div>
                  <h2>{t("Progress Board")}</h2>
                  <p>{selectedStep ? getJourneyStageTitle(selectedStep, language) : t("Select a stage to edit progress.")}</p>
                </div>
                {selectedStep ? <span className="crm-journey__editor-step">{t("Step")} {selectedStep.step_no}</span> : null}
              </header>
              {selectedStep ? (
                <div className="crm-journey__editor-body">
                  <div className="crm-journey__editor-summary">
                    <strong>{getJourneyStageTitle(selectedStep, language)}</strong>
                    <span>{getJourneyStageDescription(selectedStep, language)}</span>
                  </div>
                  <label className="crm-journey__field">
                    <span>{t("Progress")}</span>
                    <div className="crm-journey__progress-inputs">
                      <input aria-label={`${t("Progress")} ${selectedStep.step_no}`} max="100" min="0" onChange={(event) => updateProgress(event.target.value)} step="1" type="range" value={getJourneyStageProgress(selectedStep)} />
                      <input aria-label={`${t("Progress")} ${selectedStep.step_no} ${t("number")}`} max="100" min="0" name="progress_percent" onChange={(event) => updateProgress(event.target.value)} step="1" type="number" value={getJourneyStageProgress(selectedStep)} />
                      <b>%</b>
                    </div>
                  </label>
                  <div className="crm-journey__quick-progress">
                    <span>{t("Quick Progress")}</span>
                    <div>
                      {QUICK_PROGRESS_VALUES.map((value) => <button className={getJourneyStageProgress(selectedStep) === value ? "is-active" : ""} key={value} onClick={() => updateProgress(value)} type="button">{value}%</button>)}
                    </div>
                  </div>
                  <div className="crm-journey__editor-meta">
                    <div className="crm-journey__field"><span>{t("Status")}</span><StatusBadge tone={getJourneyStageStatus(selectedStep).tone}>{formatStageStatus(selectedStep, t)}</StatusBadge></div>
                    <label className="crm-journey__field"><span>{t("Target Date")}</span><input name="target_date" onChange={updateSelectedField} type="date" value={selectedStep.target_date || ""} /></label>
                    <label className="crm-journey__field"><span>{t("Completed Date")}</span><input name="completed_date" onChange={updateSelectedField} type="date" value={selectedStep.completed_date || ""} /></label>
                  </div>
                </div>
              ) : <EmptyState>{t("Select a stage to edit progress.")}</EmptyState>}
            </article>

            <article className="crm-card crm-journey__preview-card">
              <header className="crm-card__header"><div><h2>{t("Contractor Preview")}</h2><p>{t("Public Journey Preview")}</p></div><AdminIcon name="dashboard" size={18} /></header>
              <div className="crm-journey__preview-body">
                <div className="crm-journey__preview-progress"><strong>{kpis.overallProgress}%</strong><span>{t("Overall Progress")}</span><i><b style={{ width: `${kpis.overallProgress}%` }} /></i></div>
                <div className="crm-journey__preview-list">
                  {steps.map((step) => { const stageStatus = getJourneyStageStatus(step); return <div key={step.id || step.step_no}><span>{step.step_no}</span><strong>{getJourneyStageTitle(step, language)}</strong><StatusBadge tone={stageStatus.tone}>{formatStageStatus(step, t)}</StatusBadge></div>; })}
                </div>
              </div>
            </article>
          </aside>
        </section>
      )}

      <section className={`crm-card crm-journey__save-bar${hasJourneyChanges ? " is-dirty" : ""}`}>
        <div className="crm-journey__save-copy"><span className="crm-journey__save-dot" /><strong>{hasJourneyChanges ? t("Unsaved changes") : t("Journey progress saved.")}</strong><small>{hasJourneyChanges ? t("Review your journey updates before saving.") : t("Last updated")}</small></div>
        <div className="crm-journey__save-actions"><button className="crm-button crm-button--secondary" disabled={!hasJourneyChanges || isSaving} onClick={resetJourneyChanges} type="button">{t("Reset")}</button><button className="crm-button crm-button--primary" disabled={!hasJourneyChanges || isSaving} onClick={submitJourneyChanges} type="button">{isSaving ? t("Saving...") : t("Save Changes")}</button></div>
      </section>
    </div>
  );
}

function formatStageStatus(step, t) {
  const status = getJourneyStageStatus(step).key;
  return { completed: t("Completed"), in_progress: t("In Progress"), pending: t("Pending") }[status] || t("Pending");
}

function formatJourneyDate(step, t) {
  const date = step.updated_at || step.completed_date || step.target_date;
  return date ? `${t("Last updated")}: ${String(date).slice(0, 10)}` : t("Not set");
}
