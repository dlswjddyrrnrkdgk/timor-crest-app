import { useMemo, useRef, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  buildReportsCsv,
  buildReportsSummary,
  filterReportsByDateRange,
  flattenPaymentSummaries,
  REPORT_DATE_RANGES,
} from "../../services/adminReportsModel.js";
import { getJourneyStepDescription, getJourneyStepTitle } from "../../services/journeyModel.js";

const RANGE_LABELS = {
  all: "All Time",
  7: "Last 7 Days",
  30: "Last 30 Days",
  month: "This Month",
  year: "This Year",
};

const UNIT_STATUS_LABELS = {
  available: "Available Units",
  assigned: "Assigned Units",
  reserved: "Reserved",
  hold: "Hold",
};

export default function ReportsPage({ contractors = [], documents = [], journeySteps = [], language = "en", paymentSummaries = {}, t, units = [] }) {
  const [dateRange, setDateRange] = useState("all");
  const [exportMessage, setExportMessage] = useState("");
  const nowRef = useRef(new Date());
  const paymentItems = useMemo(() => flattenPaymentSummaries(paymentSummaries), [paymentSummaries]);
  const paymentPlans = useMemo(
    () => Object.values(paymentSummaries || {}).map((summary) => summary?.plan).filter(Boolean),
    [paymentSummaries],
  );
  const summary = useMemo(() => {
    const filtered = filterReportsByDateRange({ contractors, documents, paymentItems }, dateRange, nowRef.current);
    return buildReportsSummary({
      contractors: filtered.contractors,
      documents: filtered.documents,
      journeySteps,
      paymentItems: filtered.paymentItems,
      paymentPlans,
      units,
      allContractors: contractors,
      paymentContractors: contractors,
    });
  }, [contractors, dateRange, documents, journeySteps, paymentItems, paymentPlans, units]);
  const paymentRows = summary.payments.rows;

  function handleExport() {
    const blob = new Blob([buildReportsCsv(summary)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "timor-crest-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage(t("Report exported successfully."));
    window.setTimeout(() => setExportMessage(""), 3000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="crm-page crm-reports">
      <header className="crm-page-heading crm-reports__header">
        <div>
          <span className="crm-eyebrow">{t("Analytics")}</span>
          <h1>{t("Reports")}</h1>
          <p>{t("Analyze sales, unit inventory, payments, documents, and project progress.")}</p>
        </div>
        <div className="crm-reports__controls">
          <label className="crm-reports__filter">
            <span>{t("Date Range")}</span>
            <select aria-label={t("Date Range")} onChange={(event) => setDateRange(event.target.value)} value={dateRange}>
              {REPORT_DATE_RANGES.map((range) => <option key={range} value={range}>{t(RANGE_LABELS[range])}</option>)}
            </select>
          </label>
          <button className="crm-button crm-button--secondary" onClick={handlePrint} type="button">
            <AdminIcon name="document" size={16} />{t("Print")}
          </button>
          <button className="crm-button crm-button--primary" onClick={handleExport} type="button">
            <AdminIcon name="download" size={16} />{t("Export CSV")}
          </button>
        </div>
      </header>

      {exportMessage ? <p className="crm-reports__feedback" role="status">{exportMessage}</p> : null}
      <div className="crm-reports__active-filter"><AdminIcon name="calendar" size={14} />{t(RANGE_LABELS[dateRange])}</div>

      <section aria-label={t("Reports")} className="crm-reports__kpis">
        <KpiCard icon="customers" label={t("Total Customers")} tone="blue" value={formatNumber(summary.kpis.totalCustomers, language)} />
        <KpiCard icon="building" label={t("Total Units")} tone="purple" value={formatNumber(summary.kpis.totalUnits, language)} />
        <KpiCard icon="journey" label={t("Assigned Units")} tone="green" value={formatNumber(summary.kpis.assignedUnits, language)} />
        <KpiCard icon="payment" label={t("Total Contract Value")} tone="warning" value={formatCurrency(summary.kpis.totalContractValue, language)} />
        <KpiCard icon="trend" label={t("Total Paid")} tone="green" value={formatCurrency(summary.kpis.totalPaid, language)} />
        <KpiCard icon="bell" label={t("Outstanding Balance")} tone="danger" value={formatCurrency(summary.kpis.outstandingBalance, language)} />
      </section>

      <div className="crm-reports__section-grid">
        <ReportCard title={t("Sales Overview")} icon="customers">
          <div className="crm-reports__metric-grid">
            <ReportMetric label={t("Total Customers")} value={formatNumber(summary.sales.totalCustomers, language)} />
            <ReportMetric label={t("Active Customers")} value={formatNumber(summary.sales.activeCustomers, language)} />
            <ReportMetric label={t("Assigned Units")} value={formatNumber(summary.sales.assignedUnits, language)} />
            <ReportMetric label={t("Unassigned Customers")} value={formatNumber(summary.sales.unassignedCustomers, language)} />
          </div>
          <ReportProgress label={t("Assigned Rate")} percent={summary.sales.assignedRate} />
          <div className="crm-reports__subheading">{t("Unit availability summary")}</div>
          <DistributionList distribution={summary.sales.availability} total={summary.units.total} language={language} t={t} />
        </ReportCard>

        <ReportCard title={t("Unit Inventory Report")} icon="building">
          {summary.units.total ? <DistributionList distribution={summary.units.distribution} total={summary.units.total} language={language} t={t} /> : <EmptyState>{t("No report data.")}</EmptyState>}
        </ReportCard>

        <ReportCard title={t("Payment Collection Report")} icon="payment">
          {paymentRows.length ? (
            <>
              <div className="crm-reports__metric-grid crm-reports__metric-grid--three">
                <ReportMetric label={t("Total Required")} value={formatCurrency(summary.payments.totalRequired, language)} />
                <ReportMetric label={t("Total Paid")} value={formatCurrency(summary.payments.totalPaid, language)} tone="success" />
                <ReportMetric label={t("Outstanding Balance")} value={formatCurrency(summary.payments.outstanding, language)} tone="danger" />
              </div>
              <ReportProgress label={t("Collection Rate")} percent={summary.payments.collectionRate} />
              <div className="crm-reports__status-grid">
                <StatusCount label={t("Paid")} value={summary.payments.statusCounts.paid} tone="success" />
                <StatusCount label={t("Partially Paid")} value={summary.payments.statusCounts.partial} tone="warning" />
                <StatusCount label={t("Pending")} value={summary.payments.statusCounts.pending} tone="info" />
                <StatusCount label={t("No Amount")} value={summary.payments.statusCounts.noAmount} tone="neutral" />
              </div>
              <div className="crm-reports__subheading">{t("Top Outstanding Customers")}</div>
              {summary.payments.topOutstandingCustomers.length ? (
                <div className="crm-reports__rank-list">
                  {summary.payments.topOutstandingCustomers.map((customer, index) => <div className="crm-reports__rank-row" key={customer.id}><span>{index + 1}</span><strong>{customer.name || t("Not set")}</strong><b>{formatCurrency(customer.amount, language)}</b></div>)}
                </div>
              ) : <EmptyState>{t("No outstanding customers.")}</EmptyState>}
            </>
          ) : <EmptyState>{t("No payment data.")}</EmptyState>}
        </ReportCard>

        <ReportCard title={t("Documents Report")} icon="document">
          {summary.documents.total ? (
            <>
              <div className="crm-reports__metric-grid">
                <ReportMetric label={t("Total Documents")} value={formatNumber(summary.documents.total, language)} />
                <ReportMetric label={t("Customers With Documents")} value={formatNumber(summary.documents.customersWithDocuments, language)} />
                <ReportMetric label={t("Recently Uploaded")} value={formatNumber(summary.documents.recentlyUploaded, language)} />
              </div>
              <div className="crm-reports__subheading">{t("Category Distribution")}</div>
              <div className="crm-reports__compact-list">
                {summary.documents.categories.map((category) => <div className="crm-reports__compact-row" key={category.key}><span>{formatCategory(category.key, t)}</span><strong>{formatNumber(category.count, language)}</strong></div>)}
              </div>
              <div className="crm-reports__subheading">{t("Recent Documents")}</div>
              {summary.documents.recentDocuments.length ? <div className="crm-reports__compact-list">{summary.documents.recentDocuments.map((document) => <div className="crm-reports__compact-row" key={document.id || document.file_name}><span>{document.file_name || document.title || t("Not set")}</span><small>{formatDate(document.uploaded_at || document.created_at, language)}</small></div>)}</div> : <EmptyState>{t("No document data.")}</EmptyState>}
            </>
          ) : <EmptyState>{t("No document data.")}</EmptyState>}
        </ReportCard>

        <ReportCard title={t("Journey Progress Report")} icon="journey" wide>
          {summary.journey.steps.length ? (
            <>
              <div className="crm-reports__journey-summary">
                <div><strong>{summary.journey.overallProgress}%</strong><span>{t("Overall Progress")}</span></div>
                <div><strong>{summary.journey.completed}</strong><span>{t("Completed Steps")}</span></div>
                <div><strong>{summary.journey.inProgress}</strong><span>{t("In Progress")}</span></div>
                <div><strong>{summary.journey.pending}</strong><span>{t("Pending")}</span></div>
              </div>
              <ReportProgress label={`${t("Current Stage")}: ${getJourneyStepTitle(summary.journey.currentStage, language) || t("Move-in Preparation Complete")}`} percent={summary.journey.overallProgress} />
              <div className="crm-reports__journey-list">
                {summary.journey.steps.map((step) => <JourneyRow key={step.id || step.step_no} language={language} step={step} t={t} />)}
              </div>
            </>
          ) : <EmptyState>{t("No journey data.")}</EmptyState>}
        </ReportCard>
      </div>
    </div>
  );
}

function ReportCard({ children, icon, title, wide = false }) {
  return <section className={`crm-card crm-reports__card${wide ? " crm-reports__card--wide" : ""}`}><div className="crm-reports__section-header"><span className="crm-reports__section-icon"><AdminIcon name={icon} size={17} /></span><h2>{title}</h2></div>{children}</section>;
}

function ReportMetric({ label, tone = "default", value }) {
  return <div className={`crm-reports__metric crm-reports__metric--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function ReportProgress({ label, percent }) {
  return <div className="crm-reports__progress"><div><span>{label}</span><strong>{percent}%</strong></div><span className="crm-reports__bar"><span style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} /></span></div>;
}

function DistributionList({ distribution, language, t, total }) {
  const rows = Array.isArray(distribution) ? distribution : Object.entries(distribution || {}).map(([key, count]) => ({ key, count }));
  return <div className="crm-reports__distribution">{rows.map(({ key, count }) => <div className="crm-reports__distribution-row" key={key}><span className={`crm-reports__dot crm-reports__dot--${key}`} /><span className="crm-reports__distribution-label">{t(UNIT_STATUS_LABELS[key] || key)}</span><strong>{formatNumber(count, language)}</strong><small>{percentOf(count, total)}%</small><span className="crm-reports__distribution-bar"><span style={{ width: `${percentOf(count, total)}%` }} /></span></div>)}</div>;
}

function StatusCount({ label, tone, value }) {
  return <div className={`crm-reports__status-count crm-reports__status-count--${tone}`}><StatusBadge tone={tone}>{label}</StatusBadge><strong>{value}</strong></div>;
}

function JourneyRow({ language, step, t }) {
  const progress = step.normalizedProgress;
  const tone = progress >= 100 ? "success" : progress > 0 ? "warning" : "neutral";
  const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Pending";
  return <div className="crm-reports__journey-row"><span className="crm-reports__step-number">{step.step_no}</span><div className="crm-reports__journey-copy"><strong>{getJourneyStepTitle(step, language)}</strong><small>{getJourneyStepDescription(step, language)}</small></div><div className="crm-reports__journey-meter"><span>{progress}%</span><span className="crm-reports__bar"><span className={`crm-reports__bar-fill crm-reports__bar-fill--${tone}`} style={{ width: `${progress}%` }} /></span></div><StatusBadge tone={tone}>{t(status)}</StatusBadge></div>;
}

function formatCategory(value, t) {
  const labels = { contract: "Contract", invoice: "Invoice", receipt: "Receipt", permit: "Permit", design: "Design", notice: "Notice", identity: "Passport / ID", other: "Other", notSet: "Not set" };
  return t(labels[value] || value || "Not set");
}

function formatCurrency(value, language) {
  return new Intl.NumberFormat(language === "kr" ? "ko-KR" : "en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(Number(value ?? 0));
}

function formatDate(value, language) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium" }).format(date);
}

function formatNumber(value, language) {
  return Number(value ?? 0).toLocaleString(language === "kr" ? "ko-KR" : "en-US");
}

function percentOf(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
