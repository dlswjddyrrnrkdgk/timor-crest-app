import { useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";
import { validateSalesLeadForm } from "../../../services/adminCustomerManagementModel.js";

const SOURCE_OPTIONS = ["google_search", "google_ads", "instagram", "facebook", "referral", "walk_in", "phone", "whatsapp", "website", "other"];
const STATUS_OPTIONS = ["new", "scheduled", "consulted", "high_potential", "converted", "on_hold", "cancelled"];

export default function SalesLeadModal({ lead, language, onClose, onSave, saving, t }) {
  const [form, setForm] = useState(() => getLeadForm(lead));
  const [validationError, setValidationError] = useState("");
  const title = lead ? t("Edit Lead") : t("Add Lead");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateSalesLeadForm(form);
    if (!validation.valid) {
      setValidationError(formatValidationError(validation.errors, t));
      return;
    }
    const result = await onSave(form);
    if (result?.error) setValidationError(result.error);
  }

  return (
    <CustomerManagementModal closeLabel={t("Close")} description={t("Capture and manage sales inquiries.")} onClose={onClose} title={title} titleId="crm-sales-lead-modal-title">
      <form className="crm-cm-modal__form" onSubmit={submit}>
        {validationError ? <p className="crm-cm-modal__error" role="alert">{validationError}</p> : null}
        <div className="crm-cm-modal__form-grid">
          <Field label={t("Lead Date")} name="lead_date" onChange={updateField} required type="date" value={form.lead_date} />
          <Field label={t("Full Name")} name="full_name" onChange={updateField} required value={form.full_name} />
          <Field label={t("Phone")} name="phone" onChange={updateField} value={form.phone} />
          <Field label={t("Email")} name="email" onChange={updateField} type="email" value={form.email} />
          <SelectField label={t("Source")} name="source" onChange={updateField} options={SOURCE_OPTIONS} optionLabel={(value) => sourceLabel(value, language)} t={t} value={form.source} />
          <Field label={t("Interested Unit")} name="interested_unit" onChange={updateField} value={form.interested_unit} />
          <Field label={t("Assigned To")} name="assigned_to" onChange={updateField} value={form.assigned_to} />
          <SelectField label={t("Status")} name="status" onChange={updateField} options={STATUS_OPTIONS} optionLabel={(value) => statusLabel(value, language)} t={t} value={form.status} />
          <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Memo")}</span><textarea name="memo" onChange={updateField} rows="4" value={form.memo} /></label>
        </div>
        <div className="crm-cm-modal__actions">
          <button className="secondary-button" disabled={saving} onClick={onClose} type="button">{t("Cancel")}</button>
          <button className="crm-customers__primary-action" disabled={saving} type="submit"><AdminIcon name="edit" size={14} />{saving ? t("Saving...") : t("Save Lead")}</button>
        </div>
      </form>
    </CustomerManagementModal>
  );
}

function Field({ label, name, onChange, required = false, type = "text", value }) {
  return <label className="crm-cm-modal__field"><span>{label}{required ? " *" : ""}</span><input name={name} onChange={onChange} required={required} type={type} value={value ?? ""} /></label>;
}

function SelectField({ label, name, onChange, options, optionLabel, t, value }) {
  return <label className="crm-cm-modal__field"><span>{label}</span><select name={name} onChange={onChange} value={value ?? ""}><option value="">{t("Not set")}</option>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function getLeadForm(lead) {
  return {
    lead_date: lead?.lead_date || new Date().toISOString().slice(0, 10),
    full_name: lead?.full_name || "",
    phone: lead?.phone || "",
    email: lead?.email || "",
    source: lead?.source || "",
    interested_unit: lead?.interested_unit || "",
    assigned_to: lead?.assigned_to || "",
    status: lead?.status || "new",
    memo: lead?.memo || "",
  };
}

function formatValidationError(errors, t) {
  const messages = { lead_date: t("Lead date is required."), full_name: t("Full name is required."), email: t("Enter a valid email address.") };
  return errors.map((error) => messages[error] || t("Please check the form.")).join(" ");
}

function sourceLabel(value, language) {
  const labels = { google_search: ["Google Search", "Google 검색"], google_ads: ["Google Ads", "Google 광고"], instagram: ["Instagram", "Instagram"], facebook: ["Facebook", "Facebook"], referral: ["Referral", "지인 소개"], walk_in: ["Walk-in", "현장 방문"], phone: ["Phone", "전화"], whatsapp: ["WhatsApp", "WhatsApp"], website: ["Website", "웹사이트"], other: ["Other", "기타"] };
  return labels[value]?.[language === "kr" ? 1 : 0] || value;
}

function statusLabel(value, language) {
  const labels = { new: ["New", "신규"], scheduled: ["Scheduled", "예정"], consulted: ["Consulted", "상담 완료"], high_potential: ["High Potential", "계약 가능성 높음"], converted: ["Converted", "계약 전환"], on_hold: ["On Hold", "보류"], cancelled: ["Cancelled", "취소"] };
  return labels[value]?.[language === "kr" ? 1 : 0] || value;
}
