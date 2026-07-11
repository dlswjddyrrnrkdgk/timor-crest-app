export const DOCUMENT_BUCKET = "timorcrest-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_EXPIRES_IN_SECONDS = 180;

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const DOCUMENT_CATEGORIES = ["contract", "invoice", "receipt", "permit", "design", "notice", "identity", "other"];
export const DOCUMENT_STATUSES = ["active", "archived"];

export function sanitizeFileName(fileName) {
  const rawName = String(fileName || "document").trim();
  const parts = rawName.split(".");
  const extension = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const baseName = (parts.join(".") || rawName)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 90);
  const safeBaseName = baseName || "document";

  return extension ? `${safeBaseName}.${extension}` : safeBaseName;
}

export function buildDocumentPath(contractorId, documentId, fileName) {
  return `${requiredSegment(contractorId)}/${requiredSegment(documentId)}/${sanitizeFileName(fileName)}`;
}

export function validateDocumentFile(file) {
  if (!file) return "업로드할 파일을 선택해 주세요.";
  if (file.size > MAX_DOCUMENT_BYTES) return "파일 크기는 10MB 이하만 업로드할 수 있습니다.";

  const extension = getExtension(file.name);
  const hasAllowedExtension = ALLOWED_EXTENSIONS.has(extension);
  const hasAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : true;

  if (!hasAllowedExtension || !hasAllowedMime) {
    return "PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP 파일만 업로드할 수 있습니다.";
  }

  return "";
}

export function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(fileName) {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function requiredSegment(value) {
  const next = String(value || "").trim();
  if (!next || next.includes("/")) throw new Error("Invalid storage path segment.");
  return next;
}
