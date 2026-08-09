import { useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";
import { validateConsultationForm } from "../../../services/adminCustomerManagementModel.js";

const METHOD_OPTIONS = ["phone", "visit", "video_call", "whatsapp", "email", "other"];
const RESULT_OPTIONS = ["needs_follow_up", "sent_materials", "reviewing_contract", "high_interest", "converted", "low_interest", "on_hold"];

export default function ConsultationModal({ consultation, contractors, language, leads, onClose, onSave, saving, t }) {
  const [form, setForm] = useState(() => getConsultationForm(consultation));
  const [validationError, setValidationError] = useState("");
  const title = consultation ? t("Edit Consultation") : t("Add Consultation");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateConsultationForm(form);
    if (!validation.valid) {
      setValidationError(formatValidationError(validation.errors, t));
      return;
    }
    const result = await onSave(form);
    if (result?.error) setValidationError(result.error);
  }

  return (
    <CustomerManagementModal closeLabel={t("Close")} description={t("Record the consultation outcome and next action.")} onClose={onClose} title={title} titleId="crm-consultation-modal-title">
      <form className="crm-cm-modal__form" onSubmit={submit}>
        {validationError ? <p className="crm-cm-modal__error" role="alert">{validationError}</p> : null}
        <div className="crm-cm-modal__form-grid">
          <SelectField label={t("Linked Lead")} name="lead_id" onChange={updateField} options={leads} optionLabel={(lead) => [lead.full_name, lead.phone || lead.interested_unit].filter(Boolean).join(" - ")} t={t} value={form.lead_id} valueKey="id" />
          <SelectField label={t("Linked Contractor")} name="contractor_id" onChange={updateField} options={contractors} optionLabel={(contractor) => [contractor.full_name, contractor.unit?.unit_code].filter(Boolean).join(" - ")} t={t} value={form.contractor_id} valueKey="id" />
          <Field label={t("Consultation Date")} name="consultation_date" onChange={updateField} required type="datetime-local" value={form.consultation_date} />
          <SelectField label={t("Method")} name="method" onChange={updateField} options={METHOD_OPTIONS} optionLabel={(value) => methodLabel(value, language)} t={t} value={form.method} />
          <Field label={t("Consultant")} name="consultant" onChange={updateField} value={form.consultant} />
          <SelectField label={t("Result")} name="result" onChange={updateField} options={RESULT_OPTIONS} optionLabel={(value) => resultLabel(value, language)} t={t} value={form.result} />
          <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Summary")} *</span><textarea name="summary" onChange={updateField} required rows="4" value={form.summary} /></label>
          <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Customer Interest")}</span><textarea name="customer_interest" onChange={updateField} rows="3" value={form.customer_interest} /></label>
          <Field label={t("Next Action")} name="next_action" onChange={updateField} value={form.next_action} />
          <Field label={t("Next Follow-up Date")} name="next_follow_up_date" onChange={updateField} type="date" value={form.next_follow_up_date} />
        </div>
        <div className="crm-cm-modal__actions">
          <button className="secondary-button" disabled={saving} onClick={onClose} type="button">{t("Cancel")}</button>
          <button className="crm-customers__primary-action" disabled={saving} type="submit"><AdminIcon name="edit" size={14} />{saving ? t("Saving...") : t("Save Consultation")}</button>
        </div>
      </form>
    </CustomerManagementModal>
  );
}

function Field({ label, name, onChange, required = false, type = "text", value }) {
  return <label className="crm-cm-modal__field"><span>{label}{required ? " *" : ""}</span><input name={name} onChange={onChange} required={required} type={type} value={value ?? ""} /></label>;
}

function SelectField({ label, name, onChange, options, optionLabel, t, value, valueKey }) {
  return <label className="crm-cm-modal__field"><span>{label}</span><select name={name} onChange={onChange} value={value ?? ""}><option value="">{t("Not set")}</option>{options.map((option) => { const optionValue = valueKey ? option[valueKey] : option; return <option key={optionValue} value={optionValue}>{optionLabel(option)}</option>; })}</select></label>;
}

function getConsultationForm(consultation) {
  return {
    lead_id: consultation?.lead_id || "",
    contractor_id: consultation?.contractor_id || "",
    consultation_date: toDateTimeLocal(consultation?.consultation_date) || toDateTimeLocal(new Date()),
    method: consultation?.method || "other",
    consultant: consultation?.consultant || "",
    summary: consultation?.summary || "",
    customer_interest: consultation?.customer_interest || "",
    next_action: consultation?.next_action || "",
    next_follow_up_date: consultation?.next_follow_up_date || "",
    result: consultation?.result || "",
  };
}

function toDateTimeLocal(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatValidationError(errors, t) {
  const messages = { consultation_date: t("Consultation date is required."), summary: t("Summary is required.") };
  return errors.map((error) => messages[error] || t("Please check the form.")).join(" ");
}

function methodLabel(value, language) {
  const labels = { phone: ["Phone", "전화"], visit: ["Visit", "방문"], video_call: ["Video Call", "화상 미팅"], whatsapp: ["WhatsApp", "WhatsApp"], email: ["Email", "이메일"], other: ["Other", "기타"] };
  return labels[value]?.[language === "kr" ? 1 : 0] || value;
}

function resultLabel(value, language) {
  const labels = { needs_follow_up: ["Needs Follow-up", "추가 상담 필요"], sent_materials: ["Sent Materials", "자료 전달"], reviewing_contract: ["Reviewing Contract", "계약 검토"], high_interest: ["High Interest", "관심 높음"], converted: ["Converted", "계약 전환"], low_interest: ["Low Interest", "관심 낮음"], on_hold: ["On Hold", "보류"] };
  return labels[value]?.[language === "kr" ? 1 : 0] || value;
}
