import { useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";
import { validateSearchPerformanceForm } from "../../../services/adminCustomerManagementSearchStatsModel.js";

const SOURCE_OPTIONS = ["manual", "csv_import", "google_search_console_manual", "other"];

export default function SearchStatsModal({ language, onClose, onSave, record, saving, t }) {
  const [form, setForm] = useState(() => getForm(record));
  const [validationError, setValidationError] = useState("");
  const title = record ? t("Edit Search Data") : t("Add Search Data");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateSearchPerformanceForm(form);
    if (!validation.valid) {
      setValidationError(formatValidationError(validation.errors, t));
      return;
    }
    const result = await onSave(form);
    if (result?.error) setValidationError(result.error);
  }

  return <CustomerManagementModal closeLabel={t("Close")} description={t("Manual data only")} onClose={onClose} title={title} titleId="crm-search-stats-modal-title">
    <form className="crm-cm-modal__form" noValidate onSubmit={submit}>
      {validationError ? <p className="crm-cm-modal__error" role="alert">{validationError}</p> : null}
      <div className="crm-cm-modal__form-grid">
        <Field label={t("Report Date")} name="report_date" onChange={updateField} required type="date" value={form.report_date} />
        <SelectField label={t("Source")} name="source" onChange={updateField} options={SOURCE_OPTIONS} optionLabel={(value) => sourceLabel(value, language)} t={t} value={form.source} />
        <Field label={t("Query")} name="query" onChange={updateField} value={form.query} />
        <Field label={t("Page URL")} name="page_url" onChange={updateField} type="url" value={form.page_url} />
        <Field label={t("Clicks")} min="0" name="clicks" onChange={updateField} required type="number" value={form.clicks} />
        <Field label={t("Impressions")} min="0" name="impressions" onChange={updateField} required type="number" value={form.impressions} />
        <Field label={t("CTR")} min="0" max="100" name="ctr" onChange={updateField} step="0.01" type="number" value={form.ctr} />
        <Field label={t("Average Position")} min="0" name="average_position" onChange={updateField} step="0.01" type="number" value={form.average_position} />
        <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Memo")}</span><textarea name="memo" onChange={updateField} rows="4" value={form.memo} /></label>
      </div>
      <div className="crm-cm-modal__actions">
        <button className="secondary-button" disabled={saving} onClick={onClose} type="button">{t("Cancel")}</button>
        <button className="crm-customers__primary-action" disabled={saving} type="submit"><AdminIcon name="edit" size={14} />{saving ? t("Saving...") : t("Save Search Data")}</button>
      </div>
    </form>
  </CustomerManagementModal>;
}

function Field({ label, min, max, name, onChange, required = false, step, type = "text", value }) {
  return <label className="crm-cm-modal__field"><span>{label}{required ? " *" : ""}</span><input max={max} min={min} name={name} onChange={onChange} required={required} step={step} type={type} value={value ?? ""} /></label>;
}

function SelectField({ label, name, onChange, options, optionLabel, t, value }) {
  return <label className="crm-cm-modal__field"><span>{label}</span><select name={name} onChange={onChange} value={value ?? ""}><option value="">{t("Not set")}</option>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function getForm(record) {
  return {
    report_date: record?.report_date || new Date().toISOString().slice(0, 10),
    query: record?.query || "",
    page_url: record?.page_url || "",
    clicks: record?.clicks ?? 0,
    impressions: record?.impressions ?? 0,
    ctr: record?.ctr ?? "",
    average_position: record?.average_position ?? "",
    source: record?.source || "manual",
    memo: record?.memo || "",
  };
}

function sourceLabel(value, language) {
  const labels = { manual: ["Manual", "수동"], csv_import: ["CSV Import", "CSV 가져오기"], google_search_console_manual: ["Google Search Console Manual", "Google Search Console 수동"], other: ["Other", "기타"] };
  return labels[value]?.[language === "kr" ? 1 : 0] || value;
}

function formatValidationError(errors, t) {
  const messages = {
    report_date: t("Report date is required."),
    clicks: t("Clicks must be a non-negative integer."),
    impressions: t("Impressions must be a non-negative integer."),
    clicks_greater_than_impressions: t("Clicks cannot be greater than impressions."),
    ctr: t("CTR must be between 0 and 100."),
    average_position: t("Position must be 0 or greater."),
    page_url: t("Invalid URL."),
  };
  return errors.map((error) => messages[error] || t("Please check the form.")).join(" ");
}
