import { useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import CustomerManagementModal from "./CustomerManagementModal.jsx";
import { buildSearchPerformanceBulkPayloads, parseSearchPerformanceImportText } from "../../../services/adminCustomerManagementSearchStatsModel.js";

export default function SearchStatsImportModal({ onClose, onConfirm, saving, t }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("csv_import");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  function parsePreview() {
    const next = parseSearchPerformanceImportText(text, { defaultReportDate: reportDate, source });
    setPreview(next);
    setError(next.totalRows ? "" : t("No import rows found."));
  }

  async function confirmImport() {
    const payloads = buildSearchPerformanceBulkPayloads(preview?.previewRows);
    if (!payloads.length) {
      setError(t("No import rows found."));
      return;
    }
    const result = await onConfirm(payloads);
    if (result?.error) setError(result.error);
  }

  return <CustomerManagementModal closeLabel={t("Close")} description={t("Manual data only")} onClose={onClose} title={t("Import Search Data")} titleId="crm-search-stats-import-modal-title">
    <div className="crm-cm-modal__body">
      {error ? <p className="crm-cm-modal__error" role="alert">{error}</p> : null}
      <div className="crm-cm-modal__form-grid">
        <label className="crm-cm-modal__field"><span>{t("Report Date")}</span><input onChange={(event) => setReportDate(event.target.value)} type="date" value={reportDate} /></label>
        <label className="crm-cm-modal__field"><span>{t("Source")}</span><select onChange={(event) => setSource(event.target.value)} value={source}><option value="csv_import">{t("CSV Import")}</option><option value="manual">{t("Manual")}</option><option value="google_search_console_manual">{t("Google Search Console Manual")}</option><option value="other">{t("Other")}</option></select></label>
        <label className="crm-cm-modal__field crm-cm-modal__field--full"><span>{t("Paste CSV or TSV data")}</span><textarea aria-label={t("Paste CSV or TSV data")} onChange={(event) => { setText(event.target.value); setPreview(null); setError(""); }} placeholder="Query,Clicks,Impressions,CTR,Position" rows="8" value={text} /></label>
      </div>
      <p className="crm-cm-modal__hint">{t("Google Search Console integration is not connected yet.")}</p>
      <div className="crm-cm-modal__actions"><button className="secondary-button" onClick={parsePreview} type="button"><AdminIcon name="search" size={14} />{t("Parse Preview")}</button></div>
      {preview ? <ImportPreview preview={preview} t={t} /> : null}
      <div className="crm-cm-modal__actions">
        <button className="secondary-button" disabled={saving} onClick={onClose} type="button">{t("Cancel")}</button>
        <button className="crm-customers__primary-action" disabled={saving || !preview?.validRows?.length} onClick={confirmImport} type="button"><AdminIcon name="upload" size={14} />{saving ? t("Saving...") : t("Confirm Import")}</button>
      </div>
    </div>
  </CustomerManagementModal>;
}

function ImportPreview({ preview, t }) {
  return <section className="crm-cm-search-stats__import-preview" aria-label={t("Parse Preview")}><div className="crm-cm-search-stats__import-counts"><strong>{t("Valid Rows")}: {preview.validRows.length}</strong><strong>{t("Error Rows")}: {preview.errorRows.length}</strong></div><div className="crm-customer-management__table-wrap"><table><thead><tr><th>{t("Row")}</th><th>{t("Query")}</th><th>{t("Clicks")}</th><th>{t("Impressions")}</th><th>{t("Error")}</th></tr></thead><tbody>{preview.previewRows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.payload?.query || "—"}</td><td>{row.payload?.clicks ?? "—"}</td><td>{row.payload?.impressions ?? "—"}</td><td className={row.error ? "is-error" : ""}>{row.error || "—"}</td></tr>)}</tbody></table></div>{preview.errorRows.length ? <p className="crm-cm-modal__hint">{t("Some rows have errors.")}</p> : null}</section>;
}
