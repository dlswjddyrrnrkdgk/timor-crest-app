import { useCallback, useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import {
  createConsultationNote,
  createSalesLead,
  deleteConsultationNote,
  deleteSalesLead,
  loadCustomerManagementDashboard,
  updateConsultationNote,
  updateSalesLead,
} from "../../services/adminCustomerManagementService.js";
import {
  buildCustomerManagementSummary,
  filterConsultationNotes,
  filterSalesLeads,
  formatCustomerManagementDate,
  getConsultationMethodLabel,
  getConsultationResultLabel,
  getLeadSourceLabel,
  getLeadStatusLabel,
  normalizeConsultationResult,
  normalizeLeadSource,
  normalizeLeadStatus,
  sortConsultationNotes,
  sortSalesLeads,
} from "../../services/adminCustomerManagementModel.js";
import { ConsultationDetailPanel, LeadDetailPanel, consultationTone, leadStatusTone } from "./customer-management/CustomerManagementDetails.jsx";
import ConsultationModal from "./customer-management/ConsultationModal.jsx";
import DeleteConfirmModal from "./customer-management/DeleteConfirmModal.jsx";
import SalesLeadModal from "./customer-management/SalesLeadModal.jsx";
import ScheduleManagementPanel from "./customer-management/ScheduleManagementPanel.jsx";
import SearchStatsManagementPanel from "./customer-management/SearchStatsManagementPanel.jsx";

const LEAD_STATUS_OPTIONS = ["new", "scheduled", "consulted", "high_potential", "converted", "on_hold", "cancelled"];
const LEAD_SOURCE_OPTIONS = ["google_search", "google_ads", "instagram", "facebook", "referral", "walk_in", "phone", "whatsapp", "website", "other"];
const CONSULTATION_METHOD_OPTIONS = ["phone", "visit", "video_call", "whatsapp", "email", "other"];
const CONSULTATION_RESULT_OPTIONS = ["needs_follow_up", "sent_materials", "reviewing_contract", "high_interest", "converted", "low_interest", "on_hold"];

export default function CustomerManagementPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState(emptyData);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedConsultationId, setSelectedConsultationId] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutation, setMutation] = useState({ scope: "", state: "idle", error: "" });
  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => buildCustomerManagementSummary(data, now), [data, now]);
  const leadById = useMemo(() => new Map(data.salesLeads.map((lead) => [lead.id, lead])), [data.salesLeads]);
  const selectedLead = data.salesLeads.find((lead) => lead.id === selectedLeadId) || null;
  const selectedConsultation = data.consultationNotes.find((note) => note.id === selectedConsultationId) || null;
  const filteredLeads = useMemo(() => sortSalesLeads(filterSalesLeads(data.salesLeads, filters.leads)), [data.salesLeads, filters.leads]);
  const filteredConsultations = useMemo(() => sortConsultationNotes(filterConsultationNotes(data.consultationNotes, data.salesLeads, filters.consultations)), [data.consultationNotes, data.salesLeads, filters.consultations]);
  const leadSourceOptions = useMemo(() => uniqueOptions(data.salesLeads, "source", normalizeLeadSource, LEAD_SOURCE_OPTIONS), [data.salesLeads]);
  const leadStatusOptions = useMemo(() => uniqueOptions(data.salesLeads, "status", normalizeLeadStatus, LEAD_STATUS_OPTIONS), [data.salesLeads]);

  useEffect(() => {
    if (selectedLeadId && !filteredLeads.some((lead) => lead.id === selectedLeadId)) setSelectedLeadId("");
  }, [filteredLeads, selectedLeadId]);

  useEffect(() => {
    if (selectedConsultationId && !filteredConsultations.some((note) => note.id === selectedConsultationId)) setSelectedConsultationId("");
  }, [filteredConsultations, selectedConsultationId]);

  const refreshData = useCallback(async (nextStatus = "ready") => {
    setStatus(nextStatus);
    const result = await loadCustomerManagementDashboard();
    setData({ ...emptyData, ...(result.data || {}) });
    setMessage(result.error || "");
    setStatus("ready");
    if (typeof window !== "undefined") window.dispatchEvent(new Event("timorcrest:customer-management-data-changed"));
    return result;
  }, []);

  useEffect(() => {
    refreshData("loading");
  }, [refreshData]);

  function updateLeadFilters(next) {
    setFilters((current) => ({ ...current, leads: { ...current.leads, ...next } }));
  }

  function updateConsultationFilters(next) {
    setFilters((current) => ({ ...current, consultations: { ...current.consultations, ...next } }));
  }

  function toggleLeadSelection(leadId) {
    setSelectedLeadId((current) => current === leadId ? "" : leadId);
  }

  function toggleConsultationSelection(consultationId) {
    setSelectedConsultationId((current) => current === consultationId ? "" : consultationId);
  }

  function openLeadModal(lead = null) {
    setMessage("");
    setModal({ type: "lead", record: lead });
  }

  function openConsultationModal(consultation = null) {
    setMessage("");
    setModal({ type: "consultation", record: consultation });
  }

  function openDeleteModal(type, record) {
    setMessage("");
    setDeleteTarget({ type, record });
  }

  async function saveLead(form) {
    setMutation({ scope: "lead", state: "saving", error: "" });
    const result = modal?.record ? await updateSalesLead(modal.record.id, form) : await createSalesLead(form);
    if (result.error) {
      setMutation({ scope: "lead", state: "error", error: result.error });
      return result;
    }
    await refreshData();
    setSelectedLeadId(result.data?.id || modal?.record?.id || "");
    setMutation({ scope: "", state: "idle", error: "" });
    setModal(null);
    setMessage(t("Lead saved successfully."));
    return result;
  }

  async function saveConsultation(form) {
    setMutation({ scope: "consultation", state: "saving", error: "" });
    const result = modal?.record ? await updateConsultationNote(modal.record.id, form) : await createConsultationNote(form);
    if (result.error) {
      setMutation({ scope: "consultation", state: "error", error: result.error });
      return result;
    }
    await refreshData();
    setSelectedConsultationId(result.data?.id || modal?.record?.id || "");
    setMutation({ scope: "", state: "idle", error: "" });
    setModal(null);
    setMessage(t("Consultation saved successfully."));
    return result;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { record, type } = deleteTarget;
    setMutation({ scope: type, state: "deleting", error: "" });
    const result = type === "lead" ? await deleteSalesLead(record.id) : await deleteConsultationNote(record.id);
    if (result.error) {
      setMutation({ scope: type, state: "error", error: result.error });
      return;
    }
    await refreshData();
    if (type === "lead" && selectedLeadId === record.id) setSelectedLeadId("");
    if (type === "consultation" && selectedConsultationId === record.id) setSelectedConsultationId("");
    setMutation({ scope: "", state: "idle", error: "" });
    setDeleteTarget(null);
    setMessage(t(type === "lead" ? "Lead deleted successfully." : "Consultation deleted successfully."));
  }


  return (
    <main className="crm-page crm-customer-management">
      <header className="crm-page-heading crm-customer-management__heading">
        <div><p className="crm-eyebrow">{t("Workspace")}</p><h1>{t("Customer Management")}</h1><p>{t("Manage sales leads, consultations, schedules, and search visibility.")}</p></div>
        <StatusBadge tone="info">{t("Manual data only")}</StatusBadge>
      </header>

      {status === "loading" ? <p className="crm-loading-message">{t("Loading data...")}</p> : null}
      {message ? <p className="crm-customer-management__message" role="status">{translatePageMessage(message, t)}</p> : null}

      <section aria-label={t("Customer Management")} className="crm-kpi-grid crm-customer-management__kpis">
        <KpiCard icon="customers" label={t("Total Leads")} tone="blue" value={summary.kpis.totalLeads} />
        <KpiCard icon="calendar" label={t("Consultations This Month")} tone="success" value={summary.kpis.consultationsThisMonth} />
        <KpiCard icon="calendar" label={t("Upcoming Meetings")} tone="warning" value={summary.kpis.upcomingMeetings} />
        <KpiCard icon="trend" label={t("Google Search Impressions")} tone="purple" value={formatNumber(summary.kpis.searchImpressions, language)} />
      </section>

      <section className="crm-customer-management__grid">
        <ManagementPanel action={t("Add Lead")} actionIcon="customers" icon="customers" onAction={() => openLeadModal()} title={t("Sales Leads")}>
          <FilterBar onChange={updateLeadFilters} placeholder={t("Search leads")} query={filters.leads.query} t={t}>
            <FilterSelect label={t("Status")} labeler={(value) => getLeadStatusLabel(value, language)} onChange={(value) => updateLeadFilters({ status: value })} options={leadStatusOptions} placeholder={t("All Statuses")} value={filters.leads.status} />
            <FilterSelect label={t("Source")} labeler={(value) => getLeadSourceLabel(value, language)} onChange={(value) => updateLeadFilters({ source: value })} options={leadSourceOptions} placeholder={t("All Sources")} value={filters.leads.source} />
          </FilterBar>
          {filteredLeads.length ? <DataTable headers={[t("Lead Date"), t("Name"), t("Phone"), t("Source"), t("Interested Unit"), t("Assigned To"), t("Status"), t("Actions")]}>{filteredLeads.map((lead) => <LeadRow key={lead.id} language={language} lead={lead} onDelete={() => openDeleteModal("lead", lead)} onEdit={() => openLeadModal(lead)} onSelect={() => toggleLeadSelection(lead.id)} selected={lead.id === selectedLeadId} t={t} />)}</DataTable> : <EmptyState>{hasLeadFilters(filters.leads) ? t("No matching leads.") : t("No leads yet.")}</EmptyState>}
          {selectedLead ? <LeadDetailPanel language={language} lead={selectedLead} onDelete={openDeleteModal.bind(null, "lead")} onEdit={openLeadModal} t={t} /> : null}
        </ManagementPanel>

        <ManagementPanel action={t("Add Consultation")} actionIcon="bell" icon="bell" onAction={() => openConsultationModal()} title={t("Consultation Management")}>
          <FilterBar onChange={updateConsultationFilters} placeholder={t("Search consultations")} query={filters.consultations.query} t={t}>
            <FilterSelect label={t("Method")} labeler={(value) => getConsultationMethodLabel(value, language)} onChange={(value) => updateConsultationFilters({ method: value })} options={CONSULTATION_METHOD_OPTIONS} placeholder={t("All Methods")} value={filters.consultations.method} />
            <FilterSelect label={t("Result")} labeler={(value) => getConsultationResultLabel(value, language)} onChange={(value) => updateConsultationFilters({ result: value })} options={CONSULTATION_RESULT_OPTIONS} placeholder={t("All Results")} value={filters.consultations.result} />
          </FilterBar>
          {filteredConsultations.length ? <DataTable headers={[t("Customer"), t("Date"), t("Method"), t("Result"), t("Next Action"), t("Actions")]}>{filteredConsultations.map((note) => <ConsultationRow key={note.id} consultation={note} language={language} lead={leadById.get(note.lead_id)} onDelete={() => openDeleteModal("consultation", note)} onEdit={() => openConsultationModal(note)} onSelect={() => toggleConsultationSelection(note.id)} selected={note.id === selectedConsultationId} t={t} />)}</DataTable> : <EmptyState>{hasConsultationFilters(filters.consultations) ? t("No matching consultations.") : t("No consultation notes yet.")}</EmptyState>}
          {selectedConsultation ? <ConsultationDetailPanel consultation={selectedConsultation} language={language} lead={leadById.get(selectedConsultation.lead_id)} onDelete={openDeleteModal.bind(null, "consultation")} onEdit={openConsultationModal} t={t} /> : null}
        </ManagementPanel>

        <ScheduleManagementPanel contractors={data.contractors} consultations={data.consultationNotes} events={data.crmEvents} language={language} leads={data.salesLeads} onRefresh={refreshData} t={t} />

        <SearchStatsManagementPanel language={language} onRefresh={refreshData} rows={data.searchSnapshots} t={t} />
      </section>

      {modal?.type === "lead" ? <SalesLeadModal key={`lead-${modal.record?.id || "new"}`} language={language} lead={modal.record} onClose={() => setModal(null)} onSave={saveLead} saving={mutation.scope === "lead" && mutation.state === "saving"} t={t} /> : null}
      {modal?.type === "consultation" ? <ConsultationModal consultation={modal.record} contractors={data.contractors} key={`consultation-${modal.record?.id || "new"}`} language={language} leads={data.salesLeads} onClose={() => setModal(null)} onSave={saveConsultation} saving={mutation.scope === "consultation" && mutation.state === "saving"} t={t} /> : null}
      {deleteTarget ? <DeleteConfirmModal busy={mutation.state === "deleting"} closeLabel={t("Cancel")} error={mutation.error} message={t(deleteTarget.type === "lead" ? "Delete this lead?" : "Delete this consultation note?")} onClose={() => { setDeleteTarget(null); setMutation({ scope: "", state: "idle", error: "" }); }} onConfirm={confirmDelete} title={t("Delete")} titleId="crm-delete-confirm-title" warning={t("This action cannot be undone.")} /> : null}
    </main>
  );
}

function ManagementPanel({ action, actionIcon, children, icon, iconLabel, onAction, title }) {
  const { t } = useLanguage();
  const enabled = typeof onAction === "function";
  return <article className="crm-card crm-customer-management__panel"><header className="crm-card__header crm-customer-management__panel-header"><span className="crm-customer-management__panel-title"><span className="crm-customer-management__panel-icon"><AdminIcon name={icon} size={16} /></span><h2>{title}</h2></span><button aria-label={`${action}${enabled ? "" : ` - ${iconLabel || t("Coming soon")}`}`} className={`${enabled ? "crm-customers__primary-action" : "secondary-button"} crm-customer-management__coming-soon`} disabled={!enabled} onClick={onAction} title={enabled ? action : iconLabel || t("Coming soon")} type="button"><AdminIcon name={actionIcon} size={14} /><span>{action}</span>{!enabled ? <small>{iconLabel || t("Coming soon")}</small> : null}</button></header><div className="crm-customer-management__panel-body">{children}</div></article>;
}

function FilterBar({ children, onChange, placeholder, query, t }) {
  return <div className="crm-cm-filters"><label className="crm-cm-search"><AdminIcon name="search" size={15} /><input aria-label={placeholder} onChange={(event) => onChange({ query: event.target.value })} placeholder={placeholder} type="search" value={query} /></label>{children}<button aria-label={t("Clear filters")} className="crm-cm-filter-clear" onClick={() => onChange({ query: "", status: "all", source: "all", method: "all", result: "all" })} type="button">{t("Clear filters")}</button></div>;
}

function FilterSelect({ label, labeler, onChange, options, placeholder, value }) {
  return <label className="crm-cm-filter"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>{<option value="all">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{labeler(option)}</option>)}</select></label>;
}

function DataTable({ children, headers }) {
  return <div className="crm-customer-management__table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function LeadRow({ lead, language, onDelete, onEdit, onSelect, selected, t }) {
  return <tr aria-selected={selected} className={selected ? "is-selected" : ""} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}><td>{formatCustomerManagementDate(lead.lead_date, language)}</td><td><strong>{lead.full_name || t("Not set")}</strong><small>{lead.email || ""}</small></td><td>{lead.phone || "—"}</td><td>{getLeadSourceLabel(lead.source, language)}</td><td>{lead.interested_unit || "—"}</td><td>{lead.assigned_to || "—"}</td><td><StatusBadge tone={leadStatusTone(lead.status)}>{getLeadStatusLabel(lead.status, language)}</StatusBadge></td><td><RowActions onDelete={onDelete} onEdit={onEdit} t={t} /></td></tr>;
}

function ConsultationRow({ consultation, language, lead, onDelete, onEdit, onSelect, selected, t }) {
  return <tr aria-selected={selected} className={selected ? "is-selected" : ""} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}><td><strong>{lead?.full_name || t("Unlinked")}</strong><small>{consultation.consultant || ""}</small></td><td>{formatCustomerManagementDate(consultation.consultation_date, language)}</td><td>{getConsultationMethodLabel(consultation.method, language)}</td><td><StatusBadge tone={consultationTone(consultation.result)}>{getConsultationResultLabel(consultation.result, language)}</StatusBadge></td><td>{consultation.next_action || "—"}</td><td><RowActions onDelete={onDelete} onEdit={onEdit} t={t} /></td></tr>;
}

function RowActions({ onDelete, onEdit, t }) {
  return <span className="crm-cm-row-actions"><button aria-label={t("Edit")} className="crm-cm-row-action" onClick={(event) => { event.stopPropagation(); onEdit(); }} type="button"><AdminIcon name="edit" size={13} />{t("Edit")}</button><button aria-label={t("Delete")} className="crm-cm-row-action crm-cm-row-action--danger" onClick={(event) => { event.stopPropagation(); onDelete(); }} type="button"><AdminIcon name="trash" size={13} />{t("Delete")}</button></span>;
}

function uniqueOptions(rows, field, normalizer, fallback) {
  const values = rows.map((row) => normalizer(row?.[field])).filter((value) => value && value !== "unknown");
  return [...new Set([...fallback, ...values])];
}

function hasLeadFilters(filters) {
  return Boolean(filters.query || filters.status !== "all" || filters.source !== "all");
}

function hasConsultationFilters(filters) {
  return Boolean(filters.query || filters.method !== "all" || filters.result !== "all");
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

function translatePageMessage(message, t) {
  return message === "Supabase 환경변수가 설정되지 않았습니다." ? t(message) : message;
}

const emptyFilters = { leads: { query: "", status: "all", source: "all" }, consultations: { query: "", method: "all", result: "all" } };
const emptyData = { salesLeads: [], consultationNotes: [], crmEvents: [], searchSnapshots: [], contractors: [] };
