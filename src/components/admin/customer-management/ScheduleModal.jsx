import { useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";
import { CRM_EVENT_STATUS_OPTIONS, CRM_EVENT_TYPE_OPTIONS, getEventStatusLabel, getEventTypeLabel, validateCrmEventForm } from "../../../services/adminCustomerManagementModel.js";

export default function ScheduleModal({ contractors, event, language, leads, onClose, onSave, saving, t }) {
  const [form, setForm] = useState(() => getScheduleForm(event));
  const [validationError, setValidationError] = useState("");
  const title = event ? t("Edit Schedule") : t("Add Schedule");

  function updateField(inputEvent) {
    const { name, value } = inputEvent.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function submit(inputEvent) {
    inputEvent.preventDefault();
    const validation = validateCrmEventForm(form);
    if (!validation.valid) {
      setValidationError(formatValidationError(validation.errors, t));
      return;
    }
    const result = await onSave(form);
    if (result?.error) setValidationError(result.error);
  }

  return (
    <CustomerManagementModal closeLabel={t("Close")} description={t("Set the event details and linked customer.")} onClose={onClose} title={title} titleId="crm-schedule-modal-title">
      <form className="crm-cm-modal__form" noValidate onSubmit={submit}>
        {validationError ? <p className="crm-cm-modal__error" role="alert">{validationError}</p> : null}
        <div className="crm-cm-modal__form-grid">
          <Field label={t("Event Title")} name="title" onChange={updateField} required value={form.title} />
          <SelectField label={t("Event Type")} name="event_type" onChange={updateField} options={CRM_EVENT_TYPE_OPTIONS} optionLabel={(value) => getEventTypeLabel(value, language)} t={t} value={form.event_type} />
          <SelectField label={t("Linked Lead")} name="lead_id" onChange={updateField} options={leads} optionLabel={(lead) => [lead.full_name, lead.phone || lead.interested_unit].filter(Boolean).join(" - ")} t={t} value={form.lead_id} valueKey="id" />
          <SelectField label={t("Linked Contractor")} name="contractor_id" onChange={updateField} options={contractors} optionLabel={(contractor) => [contractor.full_name, contractor.unit?.unit_code].filter(Boolean).join(" - ")} t={t} value={form.contractor_id} valueKey="id" />
          <Field label={t("Event Date")} name="event_date" onChange={updateField} required type="date" value={form.event_date} />
          <SelectField label={t("Status")} name="status" onChange={updateField} options={CRM_EVENT_STATUS_OPTIONS} optionLabel={(value) => getEventStatusLabel(value, language)} t={t} value={form.status} />
          <Field label={t("Start Time")} name="start_time" onChange={updateField} type="time" value={form.start_time} />
          <Field label={t("End Time")} name="end_time" onChange={updateField} type="time" value={form.end_time} />
          <Field label={t("Location")} name="location" onChange={updateField} value={form.location} />
          <Field label={t("Assigned To")} name="assigned_to" onChange={updateField} value={form.assigned_to} />
          <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Memo")}</span><textarea name="memo" onChange={updateField} rows="4" value={form.memo} /></label>
        </div>
        <div className="crm-cm-modal__actions">
          <button className="secondary-button" disabled={saving} onClick={onClose} type="button">{t("Cancel")}</button>
          <button className="crm-customers__primary-action" disabled={saving} type="submit"><AdminIcon name="calendar" size={14} />{saving ? t("Saving...") : t("Save Schedule")}</button>
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

function getScheduleForm(event) {
  return {
    title: event?.title || "",
    lead_id: event?.lead_id || "",
    contractor_id: event?.contractor_id || "",
    event_type: event?.event_type || "consultation",
    event_date: event?.event_date || toDateOnly(new Date()),
    start_time: event?.start_time?.slice?.(0, 5) || "",
    end_time: event?.end_time?.slice?.(0, 5) || "",
    location: event?.location || "",
    assigned_to: event?.assigned_to || "",
    status: event?.status || "scheduled",
    memo: event?.memo || "",
  };
}

function toDateOnly(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatValidationError(errors, t) {
  const messages = { title: t("Event title is required."), event_date: t("Event date is required."), end_time: t("End time must be later than start time.") };
  return errors.map((error) => messages[error] || t("Please check the form.")).join(" ");
}
