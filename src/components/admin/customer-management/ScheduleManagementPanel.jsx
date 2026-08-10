import { useMemo, useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { createCrmEvent, deleteCrmEvent, updateCrmEvent } from "../../../services/adminCustomerManagementService.js";
import { getCalendarMonth, getEventStatusLabel, getEventTypeLabel, normalizeEventStatus, normalizeEventType } from "../../../services/adminCustomerManagementModel.js";
import { buildScheduleSummary, CRM_EVENT_STATUS_OPTIONS, CRM_EVENT_TYPE_OPTIONS, filterCrmEvents, formatEventDate, formatEventDateKey, formatEventTimeRange, sortCrmEvents } from "../../../services/adminCustomerManagementScheduleModel.js";
import DeleteConfirmModal from "./DeleteConfirmModal.jsx";
import ScheduleCalendar from "./ScheduleCalendar.jsx";
import ScheduleDetailPanel from "./ScheduleDetailPanel.jsx";
import ScheduleModal from "./ScheduleModal.jsx";

export default function ScheduleManagementPanel({ contractors, events, language, leads, onRefresh, t }) {
  const now = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({ query: "", event_type: "all", status: "all" });
  const [selectedDate, setSelectedDate] = useState(() => formatEventDateKey(now));
  const [visibleMonth, setVisibleMonth] = useState(() => getCalendarMonth(now));
  const [selectedEventId, setSelectedEventId] = useState("");
  const [modalEvent, setModalEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutation, setMutation] = useState({ state: "idle", error: "" });
  const [feedback, setFeedback] = useState("");
  const filteredEvents = useMemo(() => sortCrmEvents(filterCrmEvents(events, leads, contractors, filters)), [contractors, events, filters, leads]);
  const summary = useMemo(() => buildScheduleSummary(events, now), [events, now]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;
  const selectedLead = selectedEvent ? leads.find((lead) => lead.id === selectedEvent.lead_id) : null;
  const selectedContractor = selectedEvent ? contractors.find((contractor) => contractor.id === selectedEvent.contractor_id) : null;
  const selectedDateEvents = useMemo(() => filteredEvents.filter((event) => formatEventDateKey(event.event_date) === selectedDate), [filteredEvents, selectedDate]);
  const leadById = useMemo(() => new Map(leads.filter(Boolean).map((lead) => [lead.id, lead])), [leads]);
  const contractorById = useMemo(() => new Map(contractors.filter(Boolean).map((contractor) => [contractor.id, contractor])), [contractors]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({ query: "", event_type: "all", status: "all" });
  }

  function changeMonth(next) {
    setVisibleMonth(next);
    const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
    if (!selected || selected.getFullYear() !== next.year || selected.getMonth() !== next.month) {
      setSelectedDate(`${next.year}-${String(next.month + 1).padStart(2, "0")}-01`);
    }
  }

  function selectEvent(event) {
    setSelectedEventId(event.id);
    const dateKey = formatEventDateKey(event.event_date);
    setSelectedDate(dateKey);
    const [year, month] = dateKey.split("-").map(Number);
    if (year && month) setVisibleMonth({ year, month: month - 1 });
  }

  function openCreate() {
    setFeedback("");
    setModalEvent({});
  }

  function openEdit(event) {
    setFeedback("");
    setModalEvent(event);
  }

  function openDelete(event) {
    setFeedback("");
    setDeleteTarget(event);
  }

  async function saveSchedule(form) {
    setMutation({ state: "saving", error: "" });
    const result = await (modalEvent?.id ? updateCrmEvent(modalEvent.id, form) : createCrmEvent(form));
    if (result.error) {
      setMutation({ state: "error", error: result.error });
      return result;
    }
    await onRefresh();
    setSelectedEventId(result.data?.id || modalEvent?.id || "");
    setSelectedDate(formatEventDateKey(result.data?.event_date || form.event_date));
    setMutation({ state: "idle", error: "" });
    setModalEvent(null);
    setFeedback(t("Schedule saved successfully."));
    return result;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setMutation({ state: "deleting", error: "" });
    const result = await deleteCrmEvent(deleteTarget.id);
    if (result.error) {
      setMutation({ state: "error", error: result.error });
      return;
    }
    await onRefresh();
    if (selectedEventId === deleteTarget.id) setSelectedEventId("");
    setMutation({ state: "idle", error: "" });
    setDeleteTarget(null);
    setFeedback(t("Schedule deleted successfully."));
  }

  return (
    <article className="crm-card crm-customer-management__panel crm-customer-management__schedule-panel">
      <header className="crm-card__header crm-customer-management__panel-header"><span className="crm-customer-management__panel-title"><span className="crm-customer-management__panel-icon"><AdminIcon name="calendar" size={16} /></span><h2>{t("Schedule Management")}</h2></span><button aria-label={t("Add Schedule")} className="crm-customers__primary-action crm-customer-management__coming-soon" onClick={openCreate} type="button"><AdminIcon name="calendar" size={14} /><span>{t("Add Schedule")}</span></button></header>
      <div className="crm-customer-management__panel-body">
        {feedback ? <p className="crm-cm-schedule-feedback" role="status">{feedback}</p> : null}
        <ScheduleSummary summary={summary} t={t} />
        <ScheduleFilters filters={filters} language={language} onClear={clearFilters} onChange={updateFilter} t={t} />
        <div className="crm-cm-schedule-workspace">
          <ScheduleCalendar events={filteredEvents} language={language} month={visibleMonth} onMonthChange={changeMonth} onSelectDate={setSelectedDate} selectedDate={selectedDate} t={t} />
          <section className="crm-cm-schedule-selected-day" aria-label={t("Selected Date")}><div className="crm-cm-schedule-section-heading"><div><span className="crm-eyebrow">{t("Selected Date")}</span><h3>{formatEventDate(selectedDate, language) || t("Not set")}</h3></div><span>{selectedDateEvents.length}</span></div>{selectedDateEvents.length ? <div className="crm-cm-schedule-day-list">{selectedDateEvents.map((event) => <ScheduleDayRow contractor={contractorById.get(event.contractor_id)} event={event} key={event.id} language={language} lead={leadById.get(event.lead_id)} onSelect={() => selectEvent(event)} t={t} />)}</div> : <EmptyState>{t("No schedules for this date.")}</EmptyState>}</section>
        </div>
        <section className="crm-cm-schedule-list" aria-label={t("All Schedules")}><div className="crm-cm-schedule-section-heading"><div><span className="crm-eyebrow">{t("All Schedules")}</span><h3>{filteredEvents.length} {t("Schedules")}</h3></div></div>{filteredEvents.length ? <><div className="crm-customer-management__table-wrap crm-cm-schedule-table"><table><thead><tr>{[t("Event Date"), t("Time"), t("Event Title"), t("Customer"), t("Event Type"), t("Assigned To"), t("Status"), t("Actions")].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{filteredEvents.map((event) => <ScheduleRow contractor={contractorById.get(event.contractor_id)} event={event} key={event.id} language={language} lead={leadById.get(event.lead_id)} onDelete={() => openDelete(event)} onEdit={() => openEdit(event)} onSelect={() => selectEvent(event)} selected={event.id === selectedEventId} t={t} />)}</tbody></table></div><div className="crm-cm-schedule-mobile-list">{filteredEvents.map((event) => <ScheduleMobileRow contractor={contractorById.get(event.contractor_id)} event={event} key={`mobile-${event.id}`} language={language} lead={leadById.get(event.lead_id)} onDelete={() => openDelete(event)} onEdit={() => openEdit(event)} onSelect={() => selectEvent(event)} selected={event.id === selectedEventId} t={t} />)}</div></> : <EmptyState>{filters.query || filters.event_type !== "all" || filters.status !== "all" ? t("No matching schedules.") : t("No schedules yet.")}</EmptyState>}</section>
        {selectedEvent ? <ScheduleDetailPanel contractor={selectedContractor} event={selectedEvent} language={language} lead={selectedLead} onDelete={openDelete} onEdit={openEdit} t={t} /> : null}
      </div>
      {modalEvent ? <ScheduleModal contractors={contractors} event={modalEvent.id ? modalEvent : null} language={language} leads={leads} onClose={() => setModalEvent(null)} onSave={saveSchedule} saving={mutation.state === "saving"} t={t} /> : null}
      {deleteTarget ? <DeleteConfirmModal busy={mutation.state === "deleting"} closeLabel={t("Cancel")} error={mutation.error} message={t("Delete this schedule?")} onClose={() => { setDeleteTarget(null); setMutation({ state: "idle", error: "" }); }} onConfirm={confirmDelete} title={t("Delete Schedule")} titleId="crm-schedule-delete-title" warning={t("This action cannot be undone.")} /> : null}
    </article>
  );
}

function ScheduleSummary({ summary, t }) {
  return <div className="crm-cm-schedule-summary">{[["Today", summary.counts.today, "blue"], ["This Week", summary.counts.thisWeek, "success"], ["Upcoming", summary.counts.upcoming, "warning"], ["Completed", summary.counts.completed, "neutral"]].map(([label, value, tone]) => <div className={`crm-cm-schedule-summary__metric is-${tone}`} key={label}><span>{t(label)}</span><strong>{value}</strong></div>)}</div>;
}

function ScheduleFilters({ filters, language, onChange, onClear, t }) {
  return <div className="crm-cm-filters crm-cm-schedule-filters"><label className="crm-cm-search"><AdminIcon name="search" size={15} /><input aria-label={t("Search schedules")} onChange={(event) => onChange("query", event.target.value)} placeholder={t("Search schedules")} type="search" value={filters.query} /></label><FilterSelect label={t("Event Type")} onChange={(value) => onChange("event_type", value)} options={CRM_EVENT_TYPE_OPTIONS} labeler={(value) => getEventTypeLabel(value, language)} placeholder={t("All Types")} value={filters.event_type} /><FilterSelect label={t("Status")} onChange={(value) => onChange("status", value)} options={CRM_EVENT_STATUS_OPTIONS} labeler={(value) => getEventStatusLabel(value, language)} placeholder={t("All Statuses")} value={filters.status} /><button aria-label={t("Clear filters")} className="crm-cm-filter-clear" onClick={onClear} type="button">{t("Clear filters")}</button></div>;
}

function FilterSelect({ label, labeler, onChange, options, placeholder, value }) {
  return <label className="crm-cm-filter"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>{<option value="all">{placeholder}</option>}{options.map((option) => <option key={option} value={option}>{labeler(option)}</option>)}</select></label>;
}

function ScheduleDayRow({ contractor, event, language, lead, onSelect, t }) {
  return <button className="crm-cm-schedule-day-row" onClick={onSelect} type="button"><span className={`crm-cm-schedule-day-row__dot is-${normalizeEventStatus(event.status)}`} /><span><strong>{event.title || t("Not set")}</strong><small>{formatEventTimeRange(event.start_time, event.end_time, language)} - {lead?.full_name || contractor?.full_name || t("Unlinked")}</small></span><StatusBadge tone={statusTone(event.status)}>{getEventStatusLabel(event.status, language)}</StatusBadge></button>;
}

function ScheduleMobileRow({ contractor, event, language, lead, onDelete, onEdit, onSelect, selected, t }) {
  return <article aria-selected={selected} className={`crm-cm-schedule-mobile-row${selected ? " is-selected" : ""}`} onClick={onSelect} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); onSelect(); } }} tabIndex={0}><div className="crm-cm-schedule-mobile-row__main"><div className="crm-cm-schedule-mobile-row__meta"><span>{formatEventDate(event.event_date, language)}</span><span>{formatEventTimeRange(event.start_time, event.end_time, language)}</span></div><strong>{event.title || t("Not set")}</strong><small>{lead?.full_name || contractor?.full_name || t("Unlinked")}{event.location ? ` · ${event.location}` : ""}</small></div><div className="crm-cm-schedule-mobile-row__side"><StatusBadge tone={statusTone(event.status)}>{getEventStatusLabel(event.status, language)}</StatusBadge><span className="crm-cm-row-actions"><button aria-label={`${t("Edit")} ${event.title || t("Schedule")}`} className="crm-cm-row-action" onClick={(clickEvent) => { clickEvent.stopPropagation(); onEdit(); }} title={t("Edit")} type="button"><AdminIcon name="edit" size={13} /></button><button aria-label={`${t("Delete")} ${event.title || t("Schedule")}`} className="crm-cm-row-action crm-cm-row-action--danger" onClick={(clickEvent) => { clickEvent.stopPropagation(); onDelete(); }} title={t("Delete")} type="button"><AdminIcon name="trash" size={13} /></button></span></div></article>;
}

function ScheduleRow({ contractor, event, language, lead, onDelete, onEdit, onSelect, selected, t }) {
  return <tr aria-selected={selected} className={selected ? "is-selected" : ""} onClick={onSelect} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); onSelect(); } }} tabIndex={0}><td>{formatEventDate(event.event_date, language)}</td><td>{formatEventTimeRange(event.start_time, event.end_time, language)}</td><td><strong>{event.title || t("Not set")}</strong><small>{event.location || ""}</small></td><td>{lead?.full_name || contractor?.full_name || t("Unlinked")}</td><td>{getEventTypeLabel(event.event_type, language)}</td><td>{event.assigned_to || t("Not set")}</td><td><StatusBadge tone={statusTone(event.status)}>{getEventStatusLabel(event.status, language)}</StatusBadge></td><td><span className="crm-cm-row-actions"><button aria-label={t("Edit")} className="crm-cm-row-action" onClick={(clickEvent) => { clickEvent.stopPropagation(); onEdit(); }} title={t("Edit")} type="button"><AdminIcon name="edit" size={13} />{t("Edit")}</button><button aria-label={t("Delete")} className="crm-cm-row-action crm-cm-row-action--danger" onClick={(clickEvent) => { clickEvent.stopPropagation(); onDelete(); }} title={t("Delete")} type="button"><AdminIcon name="trash" size={13} />{t("Delete")}</button></span></td></tr>;
}

function statusTone(status) {
  const normalized = normalizeEventStatus(status);
  if (normalized === "completed") return "success";
  if (normalized === "cancelled" || normalized === "no_show") return "danger";
  if (normalized === "postponed") return "warning";
  return "info";
}
