import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { formatCustomerManagementDateTime } from "../../../services/adminCustomerManagementModel.js";
import { formatEventDate, formatEventTimeRange, getEventStatusLabel, getEventTypeLabel } from "../../../services/adminCustomerManagementScheduleModel.js";

export default function ScheduleDetailPanel({ contractor, event, language, lead, onDelete, onEdit, t }) {
  if (!event) return <aside className="crm-cm-detail crm-cm-schedule-detail"><EmptyState>{t("Select a schedule to view details.")}</EmptyState></aside>;
  const linkedCustomer = lead?.full_name || contractor?.full_name || t("Unlinked");
  return (
    <aside className="crm-cm-detail crm-cm-schedule-detail">
      <header className="crm-cm-detail__header"><div><span className="crm-eyebrow">{t("Schedule Details")}</span><h3>{event.title || t("Not set")}</h3><p>{linkedCustomer}</p></div><StatusBadge tone={statusTone(event.status)}>{getEventStatusLabel(event.status, language)}</StatusBadge></header>
      <DetailRows items={[
        [t("Linked Customer"), linkedCustomer],
        [t("Event Type"), getEventTypeLabel(event.event_type, language)],
        [t("Event Date"), formatEventDate(event.event_date, language)],
        [t("Time"), formatEventTimeRange(event.start_time, event.end_time, language)],
        [t("Location"), event.location || t("Not set")],
        [t("Assigned To"), event.assigned_to || t("Not set")],
        [t("Created At"), formatCustomerManagementDateTime(event.created_at, language) || t("Not set")],
        [t("Updated At"), formatCustomerManagementDateTime(event.updated_at, language) || t("Not set")],
      ]} />
      {event.memo ? <div className="crm-cm-detail__note"><span>{t("Memo")}</span><p>{event.memo}</p></div> : null}
      <div className="crm-cm-detail__actions"><button className="crm-customers__primary-action" onClick={() => onEdit(event)} type="button"><AdminIcon name="edit" size={14} />{t("Edit")}</button><button className="crm-cm-row-action crm-cm-row-action--danger" onClick={() => onDelete(event)} type="button"><AdminIcon name="trash" size={14} />{t("Delete")}</button></div>
    </aside>
  );
}

function DetailRows({ items }) {
  return <dl className="crm-cm-detail__rows">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function statusTone(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "cancelled" || normalized === "no_show") return "danger";
  if (normalized === "postponed") return "warning";
  return "info";
}
