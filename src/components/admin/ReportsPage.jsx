import { useMemo, useRef, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  buildExcelTableHtml,
  buildOfficeHealthSnapshot,
  buildReportsExecutiveSummary,
  buildTodayOfficeBrief,
  buildUnitPaymentExportRows,
  buildUnitPaymentExportSummary,
  REPORT_OVERVIEW_PERIODS,
  flattenPaymentSummaries,
} from "../../services/adminReportsModel.js";
import { formatCurrencyAmount } from "../../services/formatters.js";
import { useProject } from "../../context/ProjectContext.jsx";

const OVERVIEW_PERIOD_LABELS = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
};

export default function ReportsPage({ contractors = [], customerManagementData = {}, documents = [], journeySteps = [], language = "en", paymentSummaries = {}, t, units = [] }) {
  const { selectedProject } = useProject();
  const [overviewPeriod, setOverviewPeriod] = useState("all");
  const [exportMessage, setExportMessage] = useState("");
  const nowRef = useRef(new Date());
  const paymentItems = useMemo(() => flattenPaymentSummaries(paymentSummaries), [paymentSummaries]);
  const paymentPlans = useMemo(
    () => Object.values(paymentSummaries || {}).map((summary) => summary?.plan).filter(Boolean),
    [paymentSummaries],
  );
  const reportData = useMemo(() => ({
    contractors,
    customerManagementError: customerManagementData.error || "",
    documents,
    events: customerManagementData.events || [],
    leads: customerManagementData.leads || [],
    consultations: customerManagementData.consultations || [],
    searchSnapshots: customerManagementData.searchSnapshots || [],
    journeySteps,
    paymentItems,
    paymentPlans,
    paymentSummaries,
    units,
  }), [customerManagementData, contractors, documents, journeySteps, paymentItems, paymentPlans, paymentSummaries, units]);
  const executiveSummary = useMemo(() => buildReportsExecutiveSummary(reportData, overviewPeriod, nowRef.current), [overviewPeriod, reportData]);
  const officeBrief = useMemo(() => buildTodayOfficeBrief(reportData, nowRef.current), [reportData]);
  const officeHealth = useMemo(() => buildOfficeHealthSnapshot(reportData, nowRef.current), [reportData]);
  const exportRows = useMemo(
    () => buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, language),
    [contractors, language, paymentSummaries, units],
  );
  const exportSummary = useMemo(
    () => buildUnitPaymentExportSummary({ contractors, paymentSummaries, units }, language, exportRows),
    [contractors, exportRows, language, paymentSummaries, units],
  );

  function handleExport() {
    const html = buildExcelTableHtml(exportSummary, exportRows, language);
    const blob = new Blob([`\ufeff${html}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timor-crest-unit-payment-report-${getLocalDateStamp()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setExportMessage(t("Excel report downloaded successfully."));
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
          <h1>{t("Reports Center")}</h1>
          <p>{t("View sales, payments, office tasks, and project status in one place.")}</p>
          <span className="crm-project-scope-note">{t("Current Project")}: {selectedProject?.name || t("Not available")} · {t("Showing project-specific data.")}</span>
        </div>
        <div className="crm-reports__controls">
          <label className="crm-reports__filter">
            <span>{t("Date Range")}</span>
            <select aria-label={t("Date Range")} onChange={(event) => {
              const nextPeriod = event.target.value;
              setOverviewPeriod(nextPeriod);
            }} value={overviewPeriod}>
              {REPORT_OVERVIEW_PERIODS.map((period) => <option key={period} value={period}>{t(OVERVIEW_PERIOD_LABELS[period])}</option>)}
            </select>
          </label>
          <button className="crm-button crm-button--secondary" onClick={handlePrint} type="button">
            <AdminIcon name="document" size={16} />{t("Print")}
          </button>
        </div>
      </header>

      {exportMessage ? <p className="crm-reports__feedback" role="status">{exportMessage}</p> : null}
      {reportData.customerManagementError ? <p className="crm-reports__data-warning" role="status">{t("Some report data could not be loaded.")}</p> : null}
      <div className="crm-reports__active-filter"><AdminIcon name="calendar" size={14} />{t("Summary period")}: {t(OVERVIEW_PERIOD_LABELS[overviewPeriod])}</div>

      <section aria-labelledby="unit-payment-export-title" className="crm-card crm-reports__export-preview">
        <div className="crm-reports__export-preview-heading">
          <div>
            <span className="crm-reports__section-icon"><AdminIcon name="download" size={17} /></span>
            <div>
              <h2 id="unit-payment-export-title">{t("Unit Payment Excel Export")}</h2>
              <p>{t("Export unit-by-unit payment status including installment details.")}</p>
            </div>
          </div>
          <div className="crm-reports__export-preview-actions">
            <StatusBadge tone="info">.xls</StatusBadge>
            <button className="crm-button crm-button--primary" onClick={handleExport} type="button">
              <AdminIcon name="download" size={16} />{t("Export Excel")}
            </button>
          </div>
        </div>
        <div className="crm-reports__export-preview-stats">
          <ReportMetric label={t("Export rows")} value={formatNumber(exportSummary.rowCount, language)} />
          <ReportMetric label={t("Total Units")} value={formatNumber(exportSummary.totalUnits, language)} />
          <ReportMetric label={t("Assigned Units")} value={formatNumber(exportSummary.assignedUnits, language)} />
          <ReportMetric label={t("Total Paid")} value={formatCurrency(exportSummary.totalPaid, language)} tone="success" />
          <ReportMetric label={t("Outstanding Balance")} value={formatCurrency(exportSummary.outstandingBalance, language)} tone="danger" />
        </div>
      </section>

      <section aria-labelledby="reports-executive-summary" className="crm-reports__overview-section">
        <div className="crm-reports__overview-heading"><div><span className="crm-eyebrow">{t("Reports Center")}</span><h2 id="reports-executive-summary">{t("Executive Summary")}</h2></div><span className="crm-reports__overview-period">{t("Summary period")}: {t(OVERVIEW_PERIOD_LABELS[overviewPeriod])}</span></div>
        <div className="crm-reports__kpis crm-reports__kpis--overview">
          <KpiCard icon="building" label={t("Total Units")} tone="purple" value={formatNumber(executiveSummary.totalUnits, language)} />
          <KpiCard icon="journey" label={t("Sold or Assigned Units")} tone="green" value={formatNumber(executiveSummary.soldOrAssignedUnits, language)} />
          <KpiCard icon="building" label={t("Available Units")} tone="blue" value={formatNumber(executiveSummary.availableUnits, language)} />
          <KpiCard icon="trend" label={t("Sales Rate")} tone="success" value={`${executiveSummary.salesRate}%`} />
          <KpiCard icon="payment" label={t("Total Contract Value")} tone="warning" value={formatCurrency(executiveSummary.totalContractValue, language)} />
          <KpiCard icon="trend" label={t("Total Paid")} tone="green" value={formatCurrency(executiveSummary.totalPaid, language)} />
          <KpiCard icon="bell" label={t("Total Outstanding")} tone="danger" value={formatCurrency(executiveSummary.totalOutstanding, language)} />
          <KpiCard icon="calendar" label={t("Today Office Tasks")} tone="purple" value={formatNumber(executiveSummary.todayOfficeTasks, language)} />
        </div>
      </section>

      <section aria-labelledby="today-office-brief" className="crm-reports__overview-section">
        <div className="crm-reports__overview-heading"><div><span className="crm-eyebrow">{t("Daily Operations")}</span><h2 id="today-office-brief">{t("Today Office Brief")}</h2></div><span className="crm-reports__overview-date">{formatDate(nowRef.current, language)}</span></div>
        <div className="crm-reports__brief-grid">
          <OfficeBriefCard icon="customers" title={`${t("Customer Management")} · ${t("Today Consultations")}`} empty={t("No consultations today.")} items={officeBrief.consultations} renderItem={(item) => <OfficeActivityItem item={item} meta={`${formatActivityTime(item.time)}${item.method ? ` · ${t(getActivityLabel(item.method))}` : ""}`} title={item.customerName || t("Unlinked")} detail={item.result ? t(getActivityLabel(item.result)) : item.summary} />} />
          <OfficeBriefCard icon="calendar" title={`${t("Schedule Management")} · ${t("Today Schedules")}`} empty={t("No schedules today.")} items={officeBrief.schedules} renderItem={(item) => <OfficeActivityItem item={item} meta={`${formatActivityTime(item.time)}${item.event_type ? ` · ${t(getActivityLabel(item.event_type))}` : ""}`} title={item.customerName ? `${item.title} · ${item.customerName}` : item.title} detail={item.status ? t(getActivityLabel(item.status)) : item.location} />} />
          <OfficeBriefCard icon="journey" title={`${t("Customer Management")} · ${t("Today Follow-ups")}`} empty={t("No follow-ups today.")} items={officeBrief.followUps} renderItem={(item) => <OfficeActivityItem item={item} meta={item.result ? t(getActivityLabel(item.result)) : t("Follow-up")} title={item.customerName || t("Unlinked")} detail={item.next_action || item.summary} />} />
          <OfficeBriefCard icon="bell" title={t("Office Attention")} empty={t("No attention items.")} items={officeBrief.attention} renderItem={(item) => <OfficeActivityItem item={item} meta={item.unitCode || t("Not available")} title={item.customerName ? `${item.unitCode || t("Unit")} · ${item.customerName}` : item.unitCode || t("Needs payment follow-up")} detail={`${t("Needs payment follow-up")} · ${formatCurrency(item.amount, language)}`} danger />} />
        </div>
      </section>

      <section aria-labelledby="office-health-snapshot" className="crm-reports__overview-section">
        <div className="crm-reports__overview-heading"><div><span className="crm-eyebrow">{t("Operations")}</span><h2 id="office-health-snapshot">{t("Office Health Snapshot")}</h2></div></div>
        <div className="crm-reports__health-grid">
          <HealthCard title={t("Payment Collection Health")} value={`${officeHealth.payment.collectionRate}%`} detail={`${formatCurrency(officeHealth.payment.outstanding, language)} · ${formatNumber(officeHealth.payment.unpaidSteps, language)} ${t("Unpaid steps")}`} percent={officeHealth.payment.collectionRate} tone="success" />
          <HealthCard title={t("Sales Inventory Health")} value={`${officeHealth.inventory.salesRate}%`} detail={`${formatNumber(officeHealth.inventory.availableUnits, language)} ${t("Available Units")} · ${formatNumber(officeHealth.inventory.reservedOrHold, language)} ${t("Reserved / Hold")}`} percent={officeHealth.inventory.salesRate} tone="blue" />
          <HealthCard title={t("Customer Pipeline Health")} value={formatNumber(officeHealth.pipeline.newLeads, language)} detail={`${formatNumber(officeHealth.pipeline.consultations, language)} ${t("Consultations This Month")} · ${formatNumber(officeHealth.pipeline.highPotential, language)} ${t("High Potential")}`} percent={Math.min(100, officeHealth.pipeline.newLeads ? Math.round((officeHealth.pipeline.converted / officeHealth.pipeline.newLeads) * 100) : 0)} tone="purple" />
          <HealthCard title={t("Document Health")} value={formatNumber(officeHealth.documents.total, language)} detail={`${formatNumber(officeHealth.documents.customersWithDocuments, language)} ${t("Customers With Documents")} · ${formatNumber(officeHealth.documents.customersWithoutDocuments, language)} ${t("Without Documents")}`} percent={officeHealth.documents.customersWithDocuments + officeHealth.documents.customersWithoutDocuments > 0 ? Math.round((officeHealth.documents.customersWithDocuments / (officeHealth.documents.customersWithDocuments + officeHealth.documents.customersWithoutDocuments)) * 100) : 0} tone="warning" />
        </div>
      </section>

    </div>
  );
}

function OfficeBriefCard({ empty, icon, items, renderItem, title }) {
  return <section className="crm-card crm-reports__brief-card"><div className="crm-reports__section-header"><span className="crm-reports__section-icon"><AdminIcon name={icon} size={17} /></span><h3>{title}</h3></div>{items.length ? <div className="crm-reports__brief-list">{items.map((item, index) => <div key={item.id || `${title}-${index}`}>{renderItem(item)}</div>)}</div> : <EmptyState>{empty}</EmptyState>}</section>;
}

function OfficeActivityItem({ danger = false, detail, meta, title }) {
  return <div className={`crm-reports__office-item${danger ? " crm-reports__office-item--danger" : ""}`}><div className="crm-reports__office-item-copy"><strong>{title}</strong><small>{meta}</small>{detail ? <span>{detail}</span> : null}</div></div>;
}

function HealthCard({ detail, percent, title, tone, value }) {
  return <section className="crm-card crm-reports__health-card"><div className="crm-reports__health-card-heading"><h3>{title}</h3><strong>{value}</strong></div><span className="crm-reports__bar"><span className={`crm-reports__bar-fill crm-reports__bar-fill--${tone}`} style={{ width: `${Math.min(Math.max(Number(percent) || 0, 0), 100)}%` }} /></span><p>{detail}</p></section>;
}

function ReportMetric({ label, tone = "default", value }) {
  return <div className={`crm-reports__metric crm-reports__metric--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function getActivityLabel(value) {
  const labels = {
    consultation: "Consultation",
    meeting: "Meeting",
    follow_up_call: "Follow-up Call",
    phone: "Phone",
    visit: "Visit",
    video_call: "Video Call",
    completed: "Completed",
    scheduled: "Scheduled",
    high_interest: "High Interest",
    needs_follow_up: "Needs Follow-up",
    converted: "Converted",
    cancelled: "Cancelled",
  };
  return labels[value] || value || "Not available";
}

function formatActivityTime(value) {
  return value || "All day";
}

function formatCurrency(value, language) {
  return formatCurrencyAmount(value, "USD", language);
}

function formatDate(value, language) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium" }).format(date);
}

function formatNumber(value, language) {
  return Number(value ?? 0).toLocaleString(language === "kr" ? "ko-KR" : "en-US");
}

function getLocalDateStamp(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
