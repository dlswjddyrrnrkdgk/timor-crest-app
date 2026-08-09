import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  calculateDocumentKpis,
  filterDocuments,
  getDocumentFileType,
  getDocumentSize,
  getDocumentStatus,
} from "../src/services/adminDocumentsModel.js";

const now = new Date("2026-08-09T00:00:00.000Z");
const documents = [
  {
    category: "contract",
    contractor: { email: "jose@example.com", full_name: "Jose Costa", unit: { unit_code: "B-1203" } },
    contractor_id: "jose",
    created_at: "2026-08-08T00:00:00.000Z",
    file_name: "contract.pdf",
    id: "contract",
    mime_type: "application/pdf",
    status: "active",
  },
  {
    category: "receipt",
    contractor: { email: "sarah@example.com", full_name: "Sarah Lee", unit: { unit_code: "A-0501" } },
    contractor_id: "sarah",
    created_at: "2026-07-01T00:00:00.000Z",
    file_name: "receipt.jpg",
    id: "receipt",
    mime_type: "image/jpeg",
    status: "pending_review",
  },
];

describe("Admin Documents CRM model", () => {
  it("calculates document KPIs with recent and unique customer counts", () => {
    assert.deepEqual(calculateDocumentKpis(documents, now), {
      customersWithDocuments: 2,
      pendingReview: 1,
      totalDocuments: 2,
      uploadedRecently: 1,
    });
    assert.deepEqual(calculateDocumentKpis(null, now), {
      customersWithDocuments: 0,
      pendingReview: 0,
      totalDocuments: 0,
      uploadedRecently: 0,
    });
  });

  it("filters by file name, customer, unit, category, type, and status", () => {
    assert.deepEqual(filterDocuments(documents, { query: "B-1203" }).map((item) => item.id), ["contract"]);
    assert.deepEqual(filterDocuments(documents, { category: "receipt" }).map((item) => item.id), ["receipt"]);
    assert.deepEqual(filterDocuments(documents, { fileType: "image" }).map((item) => item.id), ["receipt"]);
    assert.deepEqual(filterDocuments(documents, { status: "pending" }).map((item) => item.id), ["receipt"]);
    assert.deepEqual(filterDocuments(documents, { contractorId: "jose" }).map((item) => item.id), ["contract"]);
  });

  it("normalizes file type, status, and missing size safely", () => {
    assert.equal(getDocumentFileType({ file_name: "plan.docx" }), "document");
    assert.equal(getDocumentFileType({ file_name: "unknown.bin" }), "other");
    assert.equal(getDocumentStatus({ status: "active" }), "uploaded");
    assert.equal(getDocumentStatus({}), "uploaded");
    assert.equal(getDocumentSize({ file_size: 0 }), "0 B");
    assert.equal(getDocumentSize({}), "");
  });

  it("connects the CRM route, storage handlers, and bilingual labels", () => {
    const layoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const pageSource = readFileSync(new URL("../src/components/admin/DocumentsPage.jsx", import.meta.url), "utf8");
    for (const key of ["Documents", "Upload Document", "Total Documents", "File Details", "No documents found.", "Select a document to view details."]) {
      assert.ok(translations.en[key], "Missing EN translation: " + key);
      assert.ok(translations.kr[key], "Missing KR translation: " + key);
    }
    assert.ok(layoutSource.includes('<Route path="documents" element={<DocumentsCrmPage {...shell} />} />'));
    assert.match(pageSource, /openDocument/);
    assert.match(pageSource, /downloadDocument/);
    assert.match(pageSource, /removeDocument/);
    assert.match(pageSource, /submitDocumentUpload/);
    assert.match(pageSource, /submitDocumentMetadata/);
    assert.match(pageSource, /crm-documents__detail-card/);
  });
});
