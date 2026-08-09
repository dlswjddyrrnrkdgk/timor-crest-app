import { DOCUMENT_CATEGORIES, formatFileSize } from "./documentModel.js";

export function calculateDocumentKpis(documents = [], now = new Date()) {
  const rows = safeDocuments(documents);
  const cutoff = new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000;
  const customerIds = new Set();
  let uploadedRecently = 0;
  let pendingReview = 0;

  for (const document of rows) {
    if (document.contractor_id) customerIds.add(document.contractor_id);
    const timestamp = getDocumentTimestamp(document);
    if (timestamp !== null && timestamp >= cutoff) uploadedRecently += 1;
    if (isPendingDocument(document)) pendingReview += 1;
  }

  return {
    customersWithDocuments: customerIds.size,
    pendingReview,
    totalDocuments: rows.length,
    uploadedRecently,
  };
}

export function filterDocuments(documents = [], { category = "all", contractorId = "all", fileType = "all", query = "", status = "all" } = {}) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  return safeDocuments(documents).filter((document) => {
    if (category !== "all" && getDocumentCategory(document) !== category) return false;
    if (contractorId !== "all" && document.contractor_id !== contractorId) return false;
    if (fileType !== "all" && getDocumentFileType(document) !== fileType) return false;
    if (status !== "all" && getDocumentStatus(document) !== status) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      document.file_name,
      document.title,
      document.category,
      document.status,
      document.mime_type,
      document.contractor?.full_name,
      document.contractor?.email,
      document.contractor?.unit?.unit_code,
      document.unit?.unit_code,
      document.uploaded_by,
    ].map((value) => String(value ?? "").toLowerCase()).join(" ");

    return searchable.includes(normalizedQuery);
  });
}

export function getDocumentCategory(document = {}) {
  return String(document.category ?? "other").trim().toLowerCase() || "other";
}

export function getDocumentFileType(document = {}) {
  const mimeType = String(document.mime_type ?? "").toLowerCase();
  const fileName = String(document.file_name ?? "").toLowerCase();
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
  if (mimeType.includes("word") || /\.(doc|docx)$/.test(fileName)) return "document";
  if (mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/.test(fileName)) return "image";
  return "other";
}

export function getDocumentStatus(document = {}) {
  const rawStatus = String(document.status ?? "").trim().toLowerCase();
  if (rawStatus.includes("pending") || rawStatus.includes("review")) return "pending";
  if (rawStatus === "archived") return "archived";
  return "uploaded";
}

export function getDocumentCustomer(document = {}) {
  return document.contractor || null;
}

export function getDocumentUnitCode(document = {}) {
  return document.contractor?.unit?.unit_code || document.unit?.unit_code || "";
}

export function getDocumentDisplayName(document = {}) {
  return document.title || document.file_name || "Untitled document";
}

export function getDocumentSize(document = {}) {
  const value = document.file_size;
  return value === null || value === undefined || value === "" ? "" : formatFileSize(value);
}

export function getDocumentTimestamp(document = {}) {
  const value = document.created_at ?? document.updated_at;
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isPendingDocument(document = {}) {
  return getDocumentStatus(document) === "pending";
}

export function getDocumentCategoryOptions() {
  return Array.from(new Set(DOCUMENT_CATEGORIES));
}

function safeDocuments(documents) {
  return Array.isArray(documents) ? documents : [];
}
