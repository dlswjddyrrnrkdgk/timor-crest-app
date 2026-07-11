import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { SUPABASE_CONFIG_MESSAGE } from "./authService.js";
import {
  DOCUMENT_BUCKET,
  SIGNED_URL_EXPIRES_IN_SECONDS,
  buildDocumentPath,
  validateDocumentFile,
} from "./documentModel.js";

const DOCUMENT_SELECT = `
  id,
  contractor_id,
  unit_id,
  title,
  category,
  file_name,
  file_path,
  mime_type,
  file_size,
  status,
  note,
  uploaded_by,
  created_at,
  updated_at,
  contractor:contractors (
    id,
    full_name,
    email,
    unit:units (
      id,
      unit_code,
      unit_name,
      total_price,
      currency
    )
  ),
  unit:units (
    id,
    unit_code,
    unit_name,
    total_price,
    currency
  )
`;

export async function getAdminDocuments() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("document_files")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  return respond(data, error);
}

export async function getDocumentsByContractor(contractorId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);
  if (!contractorId) return respond([], null);

  const { data, error } = await supabase
    .from("document_files")
    .select(DOCUMENT_SELECT)
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false });

  return respond(data, error);
}

export async function uploadDocument({ category, contractorId, file, note, title, unitId }) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  if (!contractorId) return fail("문서를 연결할 계약자를 선택해 주세요.");
  const validationError = validateDocumentFile(file);
  if (validationError) return fail(validationError);

  const documentId = crypto.randomUUID();
  const filePath = buildDocumentPath(contractorId, documentId, file.name);
  const normalizedTitle = requiredText(title) || file.name;
  const { data: userData } = await supabase.auth.getUser();

  const uploadResult = await supabase.storage.from(DOCUMENT_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadResult.error) return fail(uploadResult.error.message);

  console.debug("Document storage upload success", { contractorId, filePath });

  const payload = {
    id: documentId,
    contractor_id: contractorId,
    unit_id: optionalText(unitId),
    title: normalizedTitle,
    category: optionalText(category) || "other",
    file_name: file.name,
    file_path: filePath,
    mime_type: file.type || null,
    file_size: file.size || null,
    status: "active",
    note: optionalText(note),
    uploaded_by: userData?.user?.id || null,
  };

  const { data, error } = await supabase
    .from("document_files")
    .insert(payload)
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    const cleanupResult = await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
    if (cleanupResult.error) {
      console.warn("Document storage cleanup failed after metadata insert error", {
        filePath,
        error: cleanupResult.error.message,
      });
    }
    throw new Error(`파일은 업로드되었지만 문서 정보 저장에 실패했습니다: ${error.message}`);
  }

  console.debug("Document metadata insert success", { contractorId, filePath });

  return respond(data, null);
}

export async function updateDocumentMetadata(documentId, values) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("document_files")
    .update({
      title: requiredText(values.title),
      category: optionalText(values.category) || "other",
      status: optionalText(values.status) || "active",
      note: optionalText(values.note),
    })
    .eq("id", documentId)
    .select(DOCUMENT_SELECT)
    .single();

  return respond(data, error);
}

export async function deleteDocument(documentId) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data: document, error: lookupError } = await supabase
    .from("document_files")
    .select("file_path")
    .eq("id", documentId)
    .single();

  if (lookupError) return fail(lookupError.message);

  const removeResult = await supabase.storage.from(DOCUMENT_BUCKET).remove([document.file_path]);
  if (removeResult.error) return fail(removeResult.error.message);

  const { error } = await supabase.from("document_files").delete().eq("id", documentId);
  return error ? fail(error.message) : respond(true, null);
}

export async function createDocumentSignedUrl(filePath) {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN_SECONDS);

  return respond(data?.signedUrl || null, error);
}

export async function getMyDocuments() {
  if (!isSupabaseConfigured) return fail(SUPABASE_CONFIG_MESSAGE);

  const { data, error } = await supabase
    .from("document_files")
    .select(DOCUMENT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return respond(data, error);
}

export async function getMyDocumentSummary() {
  const result = await getMyDocuments();
  if (result.error) return result;

  const documents = result.data || [];
  return respond(
    {
      count: documents.length,
      latest: documents[0] || null,
      documents,
    },
    null,
  );
}

export async function createMyDocumentSignedUrl(filePath) {
  return createDocumentSignedUrl(filePath);
}

function requiredText(value) {
  return String(value || "").trim();
}

function optionalText(value) {
  const next = requiredText(value);
  return next || null;
}

function respond(data, error) {
  return { data: data ?? null, error: error?.message || "" };
}

function fail(error) {
  return { data: null, error };
}
