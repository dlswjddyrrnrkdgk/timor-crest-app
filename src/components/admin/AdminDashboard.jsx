import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  buildDashboardAlertDetailRows,
  buildDashboardAlertReason,
  buildDashboardOfficeSummary,
  getPaymentAlerts,
  getRecentCustomers,
  getRecentDocuments,
  getUnitStatusSummary,
} from "../../services/adminDashboardModel.js";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import AdminIcon from "./AdminIcon.jsx";
import { formatCurrencyAmount } from "../../services/formatters.js";

export default function AdminDashboard({ contractors, customerManagementData = {}, documents, language, paymentSummaries, stats, t, units }) {
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const recentCustomers = getRecentCustomers(contractors);
  const paymentAlerts = getPaymentAlerts(paymentSummaries, contractors);
  const unitSummary = getUnitStatusSummary(units, contractors);
  const recentDocuments = getRecentDocuments(documents);
  const officeSummary = buildDashboardOfficeSummary({ ...customerManagementData });

  return (
    <div className="crm-dashboard">
      <div className="crm-page-heading">
        <div><span className="crm-eyebrow">TIMOR CREST CRM</span><h1>{t("Dashboard")}</h1><p>{t("Welcome back, Admin. Here is what's happening with your sales today.")}</p></div>
        <button className="crm-date-button" type="button"><AdminIcon name="calendar" size={17} />{new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date())}<span>⌄</span></button>
      </div>

      <section className="crm-kpi-grid" aria-label={t("Dashboard KPIs")}>
        <KpiCard icon="customers" label={t("Total Customers")} tone="blue" value={stats.totalCustomers.toLocaleString()} />
        <KpiCard icon="building" label={t("Total Units")} tone="blue" value={stats.totalUnits.toLocaleString()} />
        <KpiCard helper={t("Currently unassigned")} icon="building" label={t("Available Units")} tone="success" value={stats.availableUnits.toLocaleString()} />
        <KpiCard helper={t("Assigned or contracted")} icon="customers" label={t("Contracted Units")} tone="blue" value={stats.assignedUnits.toLocaleString()} />
        <KpiCard className="crm-kpi-card--amount" helper={t("Across payment schedules")} icon="payment" label={t("Outstanding Balance")} tone="warning" value={formatMoney(stats.outstandingBalance)} />
        <KpiCard helper={`${formatCurrencyAmount(stats.paidAmount)} / ${formatCurrencyAmount(stats.requiredAmount)}`} icon="trend" label={t("Payment Progress")} tone="success" value={`${stats.paymentProgress}%`} />
        <KpiCard helper={t("Average template progress")} icon="journey" label={t("Journey Progress")} tone="purple" value={`${stats.journeyProgress}%`} />
      </section>

      <section className="crm-dashboard-grid crm-dashboard-grid--middle">
        <DashboardCard action={t("View All")} actionTo="/admin/contractors" title={t("Recent Customers")}>
          {recentCustomers.length ? <div className="crm-customer-list">{recentCustomers.map((customer) => <CustomerRow customer={customer} key={customer.id} t={t} />)}</div> : <EmptyState>{t("No recent customers yet.")}</EmptyState>}
        </DashboardCard>
        <DashboardCard action={t("View All")} actionTo="/admin/payments" title={t("Payment Alerts")}>
          {paymentAlerts.length ? <div className="crm-alert-list">{paymentAlerts.map((alert) => <PaymentAlert alert={alert} expanded={selectedAlertId === alert.id} key={alert.id} language={language} onToggle={() => setSelectedAlertId((current) => current === alert.id ? null : alert.id)} t={t} />)}</div> : <EmptyState>{t("No payment alerts.")}</EmptyState>}
        </DashboardCard>
        <DashboardCard action={t("Manage")} actionTo="/admin/units" title={t("Unit Status Summary")}>
          <UnitSummary summary={unitSummary} t={t} />
        </DashboardCard>
      </section>

      <section className="crm-dashboard-grid crm-dashboard-grid--lower">
        <DashboardCard action={t("View All")} actionTo="/admin/documents" title={t("Recent Documents")}>
          {recentDocuments.length ? <div className="crm-document-list">{recentDocuments.map((document) => <DocumentRow document={document} key={document.id} t={t} />)}</div> : <EmptyState>{t("No recent documents.")}</EmptyState>}
        </DashboardCard>
        <DashboardCard title={t("Office Shortcuts")}>
          <div className="crm-office-shortcuts">
            <OfficeShortcutCard icon="customers" label={t("Customer Management")} t={t} to="/admin/customer-management">
              <ShortcutStat label={t("New Leads Today")} value={officeSummary.customers.todayLeads} />
              <ShortcutStat label={t("New Leads This Month")} value={officeSummary.customers.monthLeads} />
              <ShortcutStat label={t("High Potential Leads")} value={officeSummary.customers.highPotential} />
              <ShortcutStat label={t("Follow-ups Needed")} value={officeSummary.customers.followUpsNeeded} />
            </OfficeShortcutCard>
            <OfficeShortcutCard icon="calendar" label={t("Schedule Management")} t={t} to="/admin/customer-management">
              <ShortcutStat label={t("Today Schedules")} value={officeSummary.schedules.todaySchedules} />
              <ShortcutStat label={t("Today Consultations")} value={officeSummary.schedules.todayConsultations} />
              <ShortcutStat label={t("Today Follow-ups")} value={officeSummary.schedules.todayFollowUps} />
            </OfficeShortcutCard>
          </div>
        </DashboardCard>
      </section>
      <footer className="crm-footer"><span>© {new Date().getFullYear()} Timor Crest CRM</span><span>{t("Internal admin workspace")}</span></footer>
    </div>
  );
}

function DashboardCard({ action, actionTo, children, title }) {
  return <section className="crm-card crm-dashboard-card"><header className="crm-card__header"><h2>{title}</h2>{actionTo ? <NavLink to={actionTo}>{action}<AdminIcon name="chevron" size={14} /></NavLink> : null}</header>{children}</section>;
}

function OfficeShortcutCard({ children, icon, label, t, to }) {
  return <NavLink className="crm-office-shortcut" to={to}><span className="crm-office-shortcut__icon"><AdminIcon name={icon} size={17} /></span><span className="crm-office-shortcut__body"><strong>{label}</strong><span className="crm-office-shortcut__stats">{children}</span><small>{t("Open workspace")}</small></span><AdminIcon name="chevron" size={14} /></NavLink>;
}

function ShortcutStat({ label, value }) {
  return <span><b>{Number(value ?? 0).toLocaleString()}</b><small>{label}</small></span>;
}

function CustomerRow({ customer, t }) {
  return <article className="crm-list-row"><span className="crm-avatar">{getInitials(customer.full_name)}</span><span className="crm-list-row__main"><strong>{customer.full_name || t("Unnamed customer")}</strong><small>{customer.email || t("No email")}</small></span><span className="crm-list-row__meta"><strong>{customer.unit?.unit_code || t("Unassigned")}</strong><small>{formatRelativeDate(customer.created_at, t)}</small></span><StatusBadge tone={customer.status === "active" ? "success" : "neutral"}>{formatStatus(customer.status, t)}</StatusBadge></article>;
}

function PaymentAlert({ alert, expanded, language, onToggle, t }) {
  const detailId = `dashboard-alert-detail-${alert.id}`;
  const detailRows = buildDashboardAlertDetailRows(alert, language);
  return (
    <div className="crm-alert-item">
      <button aria-controls={detailId} aria-expanded={expanded} className={`crm-alert-row${expanded ? " is-expanded" : ""}`} onClick={onToggle} type="button">
        <span className="crm-alert-row__icon"><AdminIcon name="payment" size={16} /></span>
        <span className="crm-list-row__main"><strong>{alert.title}</strong><small>{alert.customerName || t("Customer unavailable")}</small></span>
        <span className="crm-alert-row__amount"><strong>{formatMoney(alert.unpaidAmount, alert.currency)}</strong><small>{alert.dueDate ? `${t("Due")} ${formatDate(alert.dueDate)}` : t("Outstanding")}</small></span>
      </button>
      {expanded ? (
        <div className="crm-alert-detail" id={detailId}>
          <strong className="crm-alert-detail__title">{t("Alert details")}</strong>
          <p>{buildDashboardAlertReason(alert, language)}</p>
          <dl>
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.kind === "amount" ? formatMoney(row.value, alert.currency) : String(row.value ?? t("Not available"))}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function UnitSummary({ summary, t }) {
  const rows = [["available", t("Available"), summary.available], ["assigned", t("Assigned / Sold"), summary.assigned], ["reserved", t("Reserved"), summary.reserved], ["hold", t("Hold"), summary.hold]];
  return <div className="crm-unit-summary"><div className="crm-donut" style={{ "--crm-donut-progress": `${summary.total ? (summary.assigned / summary.total) * 100 : 0}%` }}><strong>{summary.total}</strong><small>{t("Total units")}</small></div><div className="crm-unit-summary__legend">{rows.map(([key, label, value]) => <div className="crm-legend-row" key={key}><span className={`crm-legend-dot crm-legend-dot--${key}`} /><span>{label}</span><strong>{value}</strong></div>)}</div></div>;
}

function DocumentRow({ document, t }) {
  return <article className="crm-document-row"><span className={`crm-file-icon crm-file-icon--${getFileKind(document)}`}>{getFileKind(document).toUpperCase()}</span><span className="crm-list-row__main"><strong>{document.title || document.file_name || t("Untitled document")}</strong><small>{document.contractor?.full_name || document.unit?.unit_code || t("Timor Crest Residences")}</small></span><span className="crm-list-row__meta"><strong>{formatDate(document.created_at)}</strong><small>{document.category || document.mime_type || "FILE"}</small></span></article>;
}

function formatMoney(value, currency = "USD") {
  return formatCurrencyAmount(value, currency);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatRelativeDate(value, t) {
  if (!value) return t("Recently");
  const age = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (age <= 0) return t("Today");
  if (age === 1) return t("Yesterday");
  return formatDate(value);
}

function formatStatus(value, t) {
  return { active: t("Active"), archived: t("Archived"), inactive: t("Inactive") }[value] || value || t("Pending");
}

function getInitials(name) {
  return String(name || "NA").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getFileKind(document) {
  const extension = String(document?.file_name || "").split(".").pop().toLowerCase();
  return extension === "pdf" ? "pdf" : ["doc", "docx"].includes(extension) ? "doc" : ["xls", "xlsx"].includes(extension) ? "xls" : "file";
}
