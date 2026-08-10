import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { formatCustomerManagementDateTime } from "../../../services/adminCustomerManagementModel.js";
import { formatEventDate, formatEventTimeRange, getEventStatusLabel, getEventTypeLabel } from "../../../services/adminCustomerManagementScheduleModel.js";

export default function ScheduleDetailPanel({ activity, language, onDelete, onEdit, t }) {
  if (!activity) return <aside className="crm-cm-detail crm-cm-schedule-detail"><EmptyState>{t("Select a schedule to view details.")}</EmptyState></aside>;
  const readOnly = activity.is_read_only;
  const linkedCustomer = activity.customer_name || t("Unlinked");
  const title = activityTitle(activity, t);
  return (
    <aside className="crm-cm-detail crm-cm-schedule-detail">
      <header className="crm-cm-detail__header"><div><span className="crm-eyebrow">{readOnly ? t("Calendar Activity") : t("Schedule Details")}</span><h3>{title}</h3><p>{linkedCustomer}{activity.customer_phone ? ` · ${activity.customer_phone}` : ""}</p></div><StatusBadge tone={readOnly ? "neutral" : statusTone(activity.status)}>{readOnly ? t("Read only") : getEventStatusLabel(activity.status, language)}</StatusBadge></header>
      <DetailRows items={[
        [t("Linked Customer"), linkedCustomer],
        [t("Event Type"), getEventTypeLabel(activity.event_type, language)],
        [t("Event Date"), formatEventDate(activity.date || activity.event_date, language)],
        [t("Time"), formatEventTimeRange(activity.start_time, activity.end_time, language)],
        ...(readOnly ? [[t("Method"), activity.method || t("Not set")], [t("Result"), activity.result || t("Not set")], [t("Next Action"), activity.next_action || t("Not set")]] : [[t("Location"), activity.location || t("Not set")], [t("Assigned To"), activity.assigned_to || t("Not set")]]),
        [t("Created At"), formatCustomerManagementDateTime(activity.created_at, language) || t("Not set")],
        [t("Updated At"), formatCustomerManagementDateTime(activity.updated_at, language) || t("Not set")],
      ]} />
      {activity.summary ? <div className="crm-cm-detail__note"><span>{t("Summary")}</span><p>{activity.summary}</p></div> : null}
      {readOnly ? <p className="crm-cm-calendar-activity-detail__managed">{t("Managed in Consultation")}</p> : <div className="crm-cm-detail__actions"><button className="crm-customers__primary-action" onClick={() => onEdit?.()} type="button"><AdminIcon name="edit" size={14} />{t("Edit")}</button><button className="crm-cm-row-action crm-cm-row-action--danger" onClick={() => onDelete?.()} type="button"><AdminIcon name="trash" size={14} />{t("Delete")}</button></div>}
    </aside>
  );
}

function activityTitle(activity, t) {
  if (activity.source_type === "consultation") return `${t("Consultation")}: ${activity.customer_name || t("Unlinked")}`;
  if (activity.source_type === "consultation_follow_up") return `${t("Follow-up")}: ${activity.customer_name || t("Unlinked")}`;
  return activity.title || t("Not set");
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
