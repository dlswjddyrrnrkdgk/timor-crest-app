import { useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { loadCustomerManagementDashboard } from "../../services/adminCustomerManagementService.js";
import {
  buildCustomerManagementSummary,
  formatCustomerManagementDate,
  getCalendarMonth,
  normalizeEventStatus,
  normalizeLeadStatus,
} from "../../services/adminCustomerManagementModel.js";

export default function CustomerManagementPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState(emptyData);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => buildCustomerManagementSummary(data, now), [data, now]);
  const contractorById = useMemo(() => new Map(data.contractors.map((contractor) => [contractor.id, contractor])), [data.contractors]);
  const leadById = useMemo(() => new Map(data.salesLeads.map((lead) => [lead.id, lead])), [data.salesLeads]);
  const calendar = useMemo(() => getCalendarMonth(now), [now]);
  const eventDateKeys = useMemo(() => new Set(data.crmEvents.map((event) => event.event_date).filter(Boolean)), [data.crmEvents]);
  const upcomingEvents = useMemo(() => summary.events.upcoming.filter((event) => !summary.events.today.includes(event)).slice(0, 4), [summary.events]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadCustomerManagementDashboard().then((result) => {
      if (!active) return;
      setData({ ...emptyData, ...(result.data || {}) });
      setMessage(result.error || "");
      setStatus("ready");
    });
    return () => { active = false; };
  }, []);

  const monthLabel = new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { month: "long", year: "numeric" }).format(now);
  const weekdays = language === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["일", "월", "화", "수", "목", "금", "토"];
  const calendarCells = Array.from({ length: calendar.firstDay + calendar.daysInMonth }, (_, index) => index < calendar.firstDay ? null : index - calendar.firstDay + 1);

  return (
    <main className="crm-page crm-customer-management">
      <header className="crm-page-heading crm-customer-management__heading">
        <div>
          <p className="crm-eyebrow">{t("Workspace")}</p>
          <h1>{t("Customer Management")}</h1>
          <p>{t("Manage sales leads, consultations, schedules, and search visibility.")}</p>
        </div>
        <StatusBadge tone="info">{t("Manual data only")}</StatusBadge>
      </header>

      {status === "loading" ? <p className="crm-loading-message">{t("Loading data...")}</p> : null}
      {message ? <p className="crm-customer-management__message">{message}</p> : null}

      <section className="crm-kpi-grid crm-customer-management__kpis" aria-label={t("Customer Management")}>
        <KpiCard icon="customers" label={t("Total Leads")} tone="blue" value={summary.kpis.totalLeads} />
        <KpiCard icon="calendar" label={t("Consultations This Month")} tone="success" value={summary.kpis.consultationsThisMonth} />
        <KpiCard icon="calendar" label={t("Upcoming Meetings")} tone="warning" value={summary.kpis.upcomingMeetings} />
        <KpiCard icon="trend" label={t("Google Search Impressions")} tone="purple" value={formatNumber(summary.kpis.searchImpressions, language)} />
      </section>

      <section className="crm-customer-management__grid">
        <ManagementPanel action={t("Add Lead")} actionIcon="customers" icon="customers" title={t("Sales Leads")}>{
          summary.sales.recent.length ? (
            <DataTable className="crm-customer-management__table--leads" headers={[t("Lead Date"), t("Name"), t("Phone"), t("Source"), t("Interested Unit"), t("Assigned To"), t("Status")] }>
              {summary.sales.recent.map((lead) => (
                <tr key={lead.id || `${lead.full_name}-${lead.lead_date}`}>
                  <td>{formatCustomerManagementDate(lead.lead_date, language)}</td>
                  <td><strong>{lead.full_name}</strong><small>{lead.email || ""}</small></td>
                  <td>{lead.phone || "—"}</td>
                  <td>{lead.source || "—"}</td>
                  <td>{lead.interested_unit || "—"}</td>
                  <td>{lead.assigned_to || "—"}</td>
                  <td><StatusBadge tone={leadTone(lead.status)}>{lead.status || "—"}</StatusBadge></td>
                </tr>
              ))}
            </DataTable>
          ) : <EmptyState>{t("No leads yet.")}</EmptyState>
        }</ManagementPanel>

        <ManagementPanel action={t("Add Consultation")} actionIcon="bell" icon="bell" title={t("Consultation Management")}>
          {summary.consultations.recent.length ? (
            <DataTable headers={[t("Customer"), t("Date"), t("Method"), t("Result"), t("Next Action")] }>
              {summary.consultations.recent.map((note) => {
                const customer = getCustomerName(note, contractorById, leadById);
                return <tr key={note.id || note.consultation_date}><td><strong>{customer}</strong></td><td>{formatCustomerManagementDate(note.consultation_date, language)}</td><td>{note.method || "—"}</td><td>{note.result || "—"}</td><td>{note.next_action || "—"}</td></tr>;
              })}
            </DataTable>
          ) : <EmptyState>{t("No consultation notes yet.")}</EmptyState>}
        </ManagementPanel>

        <ManagementPanel action={t("Add Schedule")} actionIcon="calendar" icon="calendar" title={t("Schedule Management")}>
          <div className="crm-customer-management__schedule">
            <div className="crm-customer-management__calendar" aria-label={t("Schedule Management")}>
              <div className="crm-customer-management__calendar-heading"><strong>{monthLabel}</strong><span>{summary.events.count} {t("Upcoming")}</span></div>
              <div className="crm-customer-management__calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="crm-customer-management__calendar-grid">
                {calendarCells.map((day, index) => {
                  const key = day ? `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : `empty-${index}`;
                  return <span className={day && eventDateKeys.has(key) ? "has-event" : ""} key={key}>{day || ""}{day && eventDateKeys.has(key) ? <i aria-hidden="true" /> : null}</span>;
                })}
              </div>
            </div>
            <div className="crm-customer-management__event-list">
              <strong>{t("Today")}</strong>
              {summary.events.today.length ? summary.events.today.map((event) => <EventRow event={event} key={event.id || event.title} contractorById={contractorById} />) : <small>{t("No schedules yet.")}</small>}
              {upcomingEvents.length ? <><strong>{t("Upcoming")}</strong>{upcomingEvents.map((event) => <EventRow event={event} key={event.id || event.title} contractorById={contractorById} />)}</> : null}
            </div>
          </div>
        </ManagementPanel>

        <ManagementPanel action={t("Import Data")} actionIcon="trend" icon="trend" title={t("Statistics Management")}>
          <div className="crm-customer-management__stat-grid">
            <StatMetric label={t("Impressions")} value={formatNumber(summary.search.impressions, language)} />
            <StatMetric label={t("Clicks")} value={formatNumber(summary.search.clicks, language)} />
            <StatMetric label={t("CTR")} value={`${formatNumber(summary.search.ctr, language)}%`} />
            <StatMetric label={t("Average Position")} value={summary.search.averagePosition === null ? "—" : formatNumber(summary.search.averagePosition, language)} />
          </div>
          {summary.search.topQueries.length ? <div className="crm-customer-management__queries"><strong>{t("Top Search Queries")}</strong>{summary.search.topQueries.map((query, index) => <div key={query.query}><span>{index + 1}. {query.query}</span><b>{formatNumber(query.impressions, language)}</b></div>)}</div> : <EmptyState>{t("No search performance data yet.")}</EmptyState>}
          <p className="crm-customer-management__manual-note">{t("Google Search Console integration is not connected yet.")}</p>
        </ManagementPanel>
      </section>
    </main>
  );
}

function ManagementPanel({ action, actionIcon, children, icon, title }) {
  const { t } = useLanguage();
  return <article className="crm-card crm-customer-management__panel"><header className="crm-card__header crm-customer-management__panel-header"><span className="crm-customer-management__panel-title"><span className="crm-customer-management__panel-icon"><AdminIcon name={icon} size={16} /></span><h2>{title}</h2></span><button aria-label={`${action} - ${t("Coming soon")}`} className="secondary-button crm-customer-management__coming-soon" disabled title={t("Coming soon")}><AdminIcon name={actionIcon} size={14} /><span>{action}</span><small>{t("Coming soon")}</small></button></header><div className="crm-customer-management__panel-body">{children}</div></article>;
}

function DataTable({ children, className = "", headers }) {
  return <div className={`crm-customer-management__table-wrap ${className}`}><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function EventRow({ contractorById, event }) {
  return <div className="crm-customer-management__event-row"><span className="crm-customer-management__event-dot" /><div><strong>{event.title}</strong><small>{event.start_time || ""}{event.contractor_id && contractorById.get(event.contractor_id)?.full_name ? ` · ${contractorById.get(event.contractor_id).full_name}` : ""}</small></div><StatusBadge tone={normalizeEventStatus(event.status) === "cancelled" ? "danger" : "info"}>{event.event_type || event.status || "scheduled"}</StatusBadge></div>;
}

function StatMetric({ label, value }) {
  return <div className="crm-customer-management__stat"><span>{label}</span><strong>{value}</strong></div>;
}

function getCustomerName(note, contractorById, leadById) {
  return contractorById.get(note?.contractor_id)?.full_name || leadById.get(note?.lead_id)?.full_name || "—";
}

function leadTone(status) {
  const normalized = normalizeLeadStatus(status);
  if (["new", "qualified", "high_potential"].includes(normalized)) return "info";
  if (["follow_up", "scheduled"].includes(normalized)) return "warning";
  if (["closed", "converted"].includes(normalized)) return "success";
  return "neutral";
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

const emptyData = {
  salesLeads: [],
  consultationNotes: [],
  crmEvents: [],
  searchSnapshots: [],
  contractors: [],
};
