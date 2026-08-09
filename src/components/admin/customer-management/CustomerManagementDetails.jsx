import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import {
  formatCustomerManagementDate,
  formatCustomerManagementDateTime,
  getConsultationMethodLabel,
  getConsultationResultLabel,
  getLeadSourceLabel,
  getLeadStatusLabel,
  normalizeConsultationResult,
  normalizeLeadStatus,
} from "../../../services/adminCustomerManagementModel.js";

export function LeadDetailPanel({ language, lead, onDelete, onEdit, t }) {
  if (!lead) return <aside className="crm-cm-detail"><EmptyState>{t("Select a lead to view details.")}</EmptyState></aside>;
  return (
    <aside className="crm-cm-detail">
      <header className="crm-cm-detail__header"><div><span className="crm-eyebrow">{t("Lead Details")}</span><h3>{lead.full_name}</h3><p>{lead.email || t("Not set")}</p></div><StatusBadge tone={leadTone(lead.status)}>{getLeadStatusLabel(lead.status, language)}</StatusBadge></header>
      <DetailRows items={[
        [t("Lead Date"), formatCustomerManagementDate(lead.lead_date, language)],
        [t("Phone"), lead.phone || t("Not set")],
        [t("Source"), getLeadSourceLabel(lead.source, language)],
        [t("Interested Unit"), lead.interested_unit || t("Not set")],
        [t("Assigned To"), lead.assigned_to || t("Not set")],
        [t("Created At"), formatCustomerManagementDateTime(lead.created_at, language) || t("Not available")],
        [t("Updated At"), formatCustomerManagementDateTime(lead.updated_at, language) || t("Not available")],
      ]} />
      <DetailText label={t("Memo")} value={lead.memo || t("Not set")} />
      <DetailActions onDelete={() => onDelete(lead)} onEdit={() => onEdit(lead)} t={t} />
    </aside>
  );
}

export function ConsultationDetailPanel({ consultation, language, lead, onDelete, onEdit, t }) {
  if (!consultation) return <aside className="crm-cm-detail"><EmptyState>{t("Select a consultation to view details.")}</EmptyState></aside>;
  return (
    <aside className="crm-cm-detail">
      <header className="crm-cm-detail__header"><div><span className="crm-eyebrow">{t("Consultation Details")}</span><h3>{lead?.full_name || t("Unlinked")}</h3><p>{consultation.consultant || t("Not set")}</p></div><StatusBadge tone="info">{getConsultationResultLabel(consultation.result, language)}</StatusBadge></header>
      <DetailRows items={[
        [t("Consultation Date"), formatCustomerManagementDateTime(consultation.consultation_date, language) || t("Not available")],
        [t("Method"), getConsultationMethodLabel(consultation.method, language)],
        [t("Consultant"), consultation.consultant || t("Not set")],
        [t("Linked Lead"), lead?.full_name || t("Unlinked")],
        [t("Next Follow-up Date"), formatCustomerManagementDate(consultation.next_follow_up_date, language) || t("Not set")],
        [t("Created At"), formatCustomerManagementDateTime(consultation.created_at, language) || t("Not available")],
        [t("Updated At"), formatCustomerManagementDateTime(consultation.updated_at, language) || t("Not available")],
      ]} />
      <DetailText label={t("Summary")} value={consultation.summary || t("Not set")} />
      <DetailText label={t("Customer Interest")} value={consultation.customer_interest || t("Not set")} />
      <DetailText label={t("Next Action")} value={consultation.next_action || t("Not set")} />
      <DetailActions onDelete={() => onDelete(consultation)} onEdit={() => onEdit(consultation)} t={t} />
    </aside>
  );
}

function DetailRows({ items }) {
  return <dl className="crm-cm-detail__rows">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function DetailText({ label, value }) {
  return <div className="crm-cm-detail__text"><strong>{label}</strong><p>{value}</p></div>;
}

function DetailActions({ onDelete, onEdit, t }) {
  return <div className="crm-cm-detail__actions"><button className="crm-cm-detail__edit" onClick={onEdit} type="button"><AdminIcon name="edit" size={14} />{t("Edit")}</button><button className="crm-cm-detail__delete" onClick={onDelete} type="button"><AdminIcon name="trash" size={14} />{t("Delete")}</button></div>;
}

function leadTone(status) {
  const normalized = normalizeLeadStatus(status);
  if (["new", "scheduled", "consulted"].includes(normalized)) return "info";
  if (normalized === "high_potential") return "warning";
  if (normalized === "converted") return "success";
  return "neutral";
}

export function consultationTone(result) {
  const normalized = normalizeConsultationResult(result);
  if (["high_interest", "converted"].includes(normalized)) return "success";
  if (["needs_follow_up", "reviewing_contract"].includes(normalized)) return "warning";
  return "neutral";
}

export function leadStatusTone(status) {
  return leadTone(status);
}
