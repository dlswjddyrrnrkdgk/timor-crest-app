import { useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "../../services/documentModel.js";
import {
  calculateDocumentKpis,
  filterDocuments,
  getDocumentCategory,
  getDocumentCustomer,
  getDocumentDisplayName,
  getDocumentFileType,
  getDocumentSize,
  getDocumentStatus,
  getDocumentUnitCode,
} from "../../services/adminDocumentsModel.js";

const CATEGORY_LABELS = {
  contract: "Contract",
  design: "Design",
  identity: "Passport / ID",
  invoice: "Payment",
  notice: "Legal",
  other: "Other",
  permit: "Permit",
  receipt: "Receipt",
};

const FILE_TYPE_LABELS = {
  document: "DOCX",
  image: "Image",
  other: "Other",
  pdf: "PDF",
};

const STATUS_LABELS = {
  archived: "Archived",
  pending: "Pending Review",
  uploaded: "Uploaded",
};

export default function DocumentsPage({
  documentFile,
  documentFileInputRef,
  documentForm,
  documentMessage,
  documents,
  downloadDocument,
  language,
  openDocument,
  removeDocument,
  selectedDocumentContractor,
  selectedDocumentContractorId,
  selectDocumentContractor,
  setDocumentFile,
  sortedContractors,
  status,
  submitDocumentMetadata,
  submitDocumentUpload,
  t,
  updateDocumentFormField,
}) {
  const [category, setCategory] = useState("all");
  const [customerScope, setCustomerScope] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const kpis = useMemo(() => calculateDocumentKpis(documents), [documents]);
  const filteredDocuments = useMemo(
    () => filterDocuments(documents, { category, contractorId: customerScope, fileType, query, status: statusFilter }),
    [category, customerScope, documents, fileType, query, statusFilter],
  );
  const selectedDocument = useMemo(
    () => filteredDocuments.find((document) => document.id === selectedDocumentId) || null,
    [filteredDocuments, selectedDocumentId],
  );

  useEffect(() => {
    if (!selectedDocumentId || !filteredDocuments.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(filteredDocuments[0]?.id || "");
    }
  }, [filteredDocuments, selectedDocumentId]);

  function handleCustomerScope(contractorId) {
    setCustomerScope(contractorId);
    setSelectedDocumentId("");
    if (contractorId !== "all") {
      const contractor = sortedContractors.find((item) => item.id === contractorId);
      if (contractor) selectDocumentContractor(contractor);
    }
  }

  function handleUploadCustomerChange(event) {
    const contractor = sortedContractors.find((item) => item.id === event.target.value);
    if (contractor) selectDocumentContractor(contractor);
  }

  return (
    <div className="crm-documents">
      <header className="crm-documents__header">
        <div>
          <span className="crm-eyebrow">TIMOR CREST CRM</span>
          <h1>{t("Documents")}</h1>
          <p>{t("Manage customer documents, contracts, receipts, and project files.")}</p>
        </div>
        <button className="crm-documents__primary-action" onClick={() => setShowUpload((current) => !current)} type="button">
          <AdminIcon name="upload" size={16} />
          {t("Upload Document")}
        </button>
      </header>

      <section className="crm-documents__kpis" aria-label={t("Documents")}>
        <KpiCard helper={t("All uploaded files")} icon="document" label={t("Total Documents")} value={kpis.totalDocuments.toLocaleString()} />
        <KpiCard helper={t("Last 7 days")} icon="upload" label={t("Uploaded Recently")} tone="success" value={kpis.uploadedRecently.toLocaleString()} />
        <KpiCard helper={t("Unique customers")} icon="customers" label={t("Customers With Documents")} tone="purple" value={kpis.customersWithDocuments.toLocaleString()} />
        <KpiCard helper={t("Pending or review status")} icon="bell" label={t("Pending Review")} tone="warning" value={kpis.pendingReview.toLocaleString()} />
      </section>

      <section className="crm-card crm-documents__scope-card">
        <div className="crm-documents__scope-header">
          <div>
            <h2>{t("Document Library")}</h2>
            <span>{filteredDocuments.length.toLocaleString()} {t("documents")}</span>
          </div>
          <span className="crm-documents__scope-status">{customerScope === "all" ? t("All Documents") : selectedDocumentContractor?.full_name || t("Select Customer")}</span>
        </div>
        <div className="crm-documents__scope-list" role="list" aria-label={t("Select Customer")}>
          <button aria-pressed={customerScope === "all"} className={`crm-documents__scope-option${customerScope === "all" ? " is-selected" : ""}`} onClick={() => handleCustomerScope("all")} type="button">
            <AdminIcon name="document" size={15} />
            {t("All Documents")}
          </button>
          {sortedContractors.map((contractor) => (
            <button aria-pressed={customerScope === contractor.id} className={`crm-documents__scope-option${customerScope === contractor.id ? " is-selected" : ""}`} key={contractor.id} onClick={() => handleCustomerScope(contractor.id)} type="button">
              <span className="crm-documents__scope-avatar">{getInitials(contractor.full_name)}</span>
              <span>{contractor.full_name || t("Not set")}</span>
              <small>{contractor.unit?.unit_code || t("Unassigned")}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="crm-card crm-documents__filter-card">
        <label className="crm-documents__search">
          <AdminIcon name="search" size={16} />
          <span className="sr-only">{t("Search documents...")}</span>
          <input aria-label={t("Search documents...")} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search documents...")} value={query} />
        </label>
        <DocumentSelect label={t("Category")} onChange={(event) => setCategory(event.target.value)} options={["all", ...DOCUMENT_CATEGORIES]} t={t} value={category} />
        <DocumentSelect label={t("File Type")} onChange={(event) => setFileType(event.target.value)} options={["all", "pdf", "document", "image", "other"]} t={t} value={fileType} />
        <DocumentSelect label={t("Status")} onChange={(event) => setStatusFilter(event.target.value)} options={["all", "uploaded", "pending", "archived"]} t={t} value={statusFilter} />
        <button className="crm-documents__reset" onClick={() => { setCategory("all"); setFileType("all"); setQuery(""); setStatusFilter("all"); }} type="button">{t("Reset")}</button>
      </section>

      {documentMessage ? <p className="crm-documents__message" role="status">{t(documentMessage)}</p> : null}

      <div className="crm-documents__workspace">
        <section className="crm-card crm-documents__table-card">
          <div className="crm-documents__card-header">
            <div><h2>{t("File Center")}</h2><span>{filteredDocuments.length.toLocaleString()} {t("results")}</span></div>
            <button className="crm-documents__secondary-action" onClick={() => setShowUpload((current) => !current)} type="button"><AdminIcon name="upload" size={15} />{t("Upload Document")}</button>
          </div>
          {filteredDocuments.length ? (
            <div className="crm-documents__table-wrap">
              <table className="crm-documents__table">
                <thead><tr><th>{t("File Name")}</th><th>{t("Category")}</th><th>{t("Customer")}</th><th>{t("Unit")}</th><th>{t("Upload Date")}</th><th>{t("Size")}</th><th>{t("Status")}</th><th>{t("Actions")}</th></tr></thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <DocumentRow document={document} isSelected={selectedDocumentId === document.id} key={document.id} language={language} onDelete={removeDocument} onDownload={downloadDocument} onOpen={openDocument} onSelect={setSelectedDocumentId} t={t} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState>{t("No documents found.")}</EmptyState>}
        </section>

        <DocumentDetailPanel document={selectedDocument} language={language} onDelete={removeDocument} onDownload={downloadDocument} onOpen={openDocument} onSubmit={submitDocumentMetadata} saving={status === "saving"} t={t} />
      </div>

      {showUpload ? (
        <DocumentUploadPanel
          documentFile={documentFile}
          documentFileInputRef={documentFileInputRef}
          documentForm={documentForm}
          isUploading={status === "saving"}
          onChange={updateDocumentFormField}
          onCustomerChange={handleUploadCustomerChange}
          onFileChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
          onSubmit={submitDocumentUpload}
          selectedContractorId={selectedDocumentContractorId}
          sortedContractors={sortedContractors}
          t={t}
        />
      ) : null}
    </div>
  );
}

function DocumentRow({ document, isSelected, language, onDelete, onDownload, onOpen, onSelect, t }) {
  const customer = getDocumentCustomer(document);
  const documentStatus = getDocumentStatus(document);
  const fileType = getDocumentFileType(document);
  function stop(event) { event.stopPropagation(); }

  return (
    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} onClick={() => onSelect(document.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(document.id); }} tabIndex="0">
      <td data-label={t("File Name")}><span className={`crm-documents__file-icon crm-documents__file-icon--${fileType}`}><AdminIcon name="document" size={16} /><small>{FILE_TYPE_LABELS[fileType]}</small></span><span className="crm-documents__file-name"><strong>{getDocumentDisplayName(document)}</strong><small>{document.file_name || t("Not set")}</small></span></td>
      <td data-label={t("Category")}><span className="crm-documents__category">{getCategoryLabel(document, t)}</span></td>
      <td data-label={t("Customer")}><strong>{customer?.full_name || t("Not set")}</strong></td>
      <td data-label={t("Unit")}>{getDocumentUnitCode(document) || t("Unassigned")}</td>
      <td data-label={t("Upload Date")}>{formatDate(document.created_at || document.updated_at, language)}</td>
      <td data-label={t("Size")}>{getDocumentSize(document) || ""}</td>
      <td data-label={t("Status")}><StatusBadge tone={getStatusTone(documentStatus)}>{getStatusLabel(documentStatus, t)}</StatusBadge></td>
      <td data-label={t("Actions")}><div className="crm-documents__row-actions"><button aria-label={`${t("Open")} ${getDocumentDisplayName(document)}`} onClick={(event) => { stop(event); onOpen(document.file_path); }} type="button"><AdminIcon name="document" size={14} /></button><button aria-label={`${t("Download")} ${getDocumentDisplayName(document)}`} onClick={(event) => { stop(event); onDownload(document.file_path, document.file_name); }} type="button"><AdminIcon name="upload" size={14} /></button><button aria-label={`${t("Delete")} ${getDocumentDisplayName(document)}`} className="is-danger" disabled={!document.id} onClick={(event) => { stop(event); onDelete(document); }} type="button"><AdminIcon name="settings" size={14} /></button></div></td>
    </tr>
  );
}

function DocumentDetailPanel({ document, language, onDelete, onDownload, onOpen, onSubmit, saving, t }) {
  const [form, setForm] = useState({ category: "other", note: "", status: "active", title: "" });

  useEffect(() => {
    if (document) setForm({ category: document.category || "other", note: document.note || "", status: document.status || "active", title: document.title || document.file_name || "" });
  }, [document]);

  if (!document) return <aside className="crm-card crm-documents__detail-card"><EmptyState>{t("Select a document to view details.")}</EmptyState></aside>;
  const customer = getDocumentCustomer(document);
  const documentStatus = getDocumentStatus(document);
  const fileType = getDocumentFileType(document);
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function submit(event) { event.preventDefault(); onSubmit(document.id, form); }

  return (
    <aside className="crm-card crm-documents__detail-card" aria-labelledby="crm-document-detail-title">
      <div className="crm-documents__preview"><span className={`crm-documents__preview-icon crm-documents__preview-icon--${fileType}`}><AdminIcon name="document" size={30} /></span><strong id="crm-document-detail-title">{getDocumentDisplayName(document)}</strong><small>{FILE_TYPE_LABELS[fileType]} · {getDocumentSize(document) || t("Not set")}</small></div>
      <div className="crm-documents__detail-actions"><button className="crm-documents__primary-action" onClick={() => onOpen(document.file_path)} type="button"><AdminIcon name="document" size={15} />{t("Open")}</button><button className="crm-documents__secondary-action" onClick={() => onDownload(document.file_path, document.file_name)} type="button"><AdminIcon name="upload" size={15} />{t("Download")}</button><button aria-label={t("Delete")} className="crm-documents__danger-action" disabled={saving} onClick={() => onDelete(document)} type="button"><AdminIcon name="settings" size={15} />{t("Delete")}</button></div>
      <dl className="crm-documents__metadata"><DetailItem label={t("Category")} value={getCategoryLabel(document, t)} /><DetailItem label={t("Customer")} value={customer?.full_name || t("Not set")} /><DetailItem label={t("Unit")} value={getDocumentUnitCode(document) || t("Unassigned")} /><DetailItem label={t("Uploaded By")} value={document.uploaded_by || t("Not set")} /><DetailItem label={t("Upload Date")} value={formatDate(document.created_at || document.updated_at, language)} /><DetailItem label={t("Status")} value={getStatusLabel(documentStatus, t)} /></dl>
      <form className="crm-documents__metadata-form" onSubmit={submit}><h3>{t("File Details")}</h3><label><span>{t("File Name")}</span><input name="title" onChange={updateField} value={form.title} /></label><label><span>{t("Category")}</span><select name="category" onChange={updateField} value={form.category}>{DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{getCategoryLabel({ category: item }, t)}</option>)}</select></label><label><span>{t("Status")}</span><select name="status" onChange={updateField} value={form.status}>{DOCUMENT_STATUSES.map((item) => <option key={item} value={item}>{item === "active" ? t("Uploaded") : t("Archived")}</option>)}</select></label><label><span>{t("Notes")}</span><textarea name="note" onChange={updateField} rows="3" value={form.note} /></label><button className="crm-documents__secondary-action" disabled={saving} type="submit">{t("Save Details")}</button></form>
    </aside>
  );
}

function DocumentUploadPanel({ documentFile, documentFileInputRef, documentForm, isUploading, onChange, onCustomerChange, onFileChange, onSubmit, selectedContractorId, sortedContractors, t }) {
  return <section className="crm-card crm-documents__upload-card"><div className="crm-documents__card-header"><div><h2>{t("Upload a file")}</h2><span>{t("Upload Document")}</span></div></div><form className="crm-documents__upload-form" onSubmit={onSubmit}><label><span>{t("Customer")}</span><select onChange={onCustomerChange} required value={selectedContractorId}>{<option value="">{t("Select Customer")}</option>}{sortedContractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.full_name} · {contractor.unit?.unit_code || t("Unassigned")}</option>)}</select></label><label><span>{t("File Name")}</span><input name="title" onChange={onChange} placeholder={t("File Name")} required value={documentForm.title} /></label><label><span>{t("Category")}</span><select name="category" onChange={onChange} value={documentForm.category}>{DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{getCategoryLabel({ category: item }, t)}</option>)}</select></label><label><span>{t("Notes")}</span><textarea name="note" onChange={onChange} rows="3" value={documentForm.note} /></label><label className="crm-documents__file-input"><span>{t("Choose file")}</span><input accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={onFileChange} ref={documentFileInputRef} required type="file" />{documentFile ? <small>{documentFile.name}</small> : null}</label><div className="crm-documents__upload-actions"><button className="crm-documents__primary-action" disabled={isUploading} type="submit"><AdminIcon name="upload" size={15} />{isUploading ? t("Uploading...") : t("Upload Document")}</button></div></form></section>;
}

function DocumentSelect({ label, onChange, options, t, value }) {
  return <label className="crm-documents__filter"><span>{label}</span><select aria-label={label} onChange={onChange} value={value}>{options.map((option) => <option key={option} value={option}>{getOptionLabel(option, t)}</option>)}</select></label>;
}

function DetailItem({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function getCategoryLabel(document, t) { return t(CATEGORY_LABELS[getDocumentCategory(document)] || "Not set"); }
function getInitials(value) { return String(value || "??").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "??"; }
function getOptionLabel(value, t) { if (value === "all") return t("All"); if (CATEGORY_LABELS[value]) return t(CATEGORY_LABELS[value]); if (FILE_TYPE_LABELS[value]) return t(FILE_TYPE_LABELS[value]); return getStatusLabel(value, t); }
function getStatusLabel(value, t) { return t(STATUS_LABELS[value] || "Uploaded"); }
function getStatusTone(value) { return value === "pending" ? "warning" : value === "uploaded" ? "success" : "neutral"; }
function formatDate(value, language) { if (!value) return ""; const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium" }).format(date) : ""; }
