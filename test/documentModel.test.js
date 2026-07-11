import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDocumentPath, formatFileSize, sanitizeFileName, validateDocumentFile } from "../src/services/documentModel.js";

describe("documentModel", () => {
  it("sanitizes file names while preserving safe extensions", () => {
    assert.equal(sanitizeFileName("contract final 한글.pdf"), "contract_final.pdf");
    assert.equal(sanitizeFileName("../secret.docx"), "secret.docx");
    assert.equal(sanitizeFileName("////.png"), "document.png");
  });

  it("builds storage paths under the contractor id first segment", () => {
    assert.equal(
      buildDocumentPath("contractor-1", "document-1", "permit final.pdf"),
      "contractor-1/document-1/permit_final.pdf",
    );
  });

  it("validates allowed document files and rejects oversized or unsupported files", () => {
    assert.equal(validateDocumentFile({ name: "contract.pdf", size: 1024, type: "application/pdf" }), "");
    assert.match(validateDocumentFile({ name: "script.exe", size: 1024, type: "application/octet-stream" }), /PDF/);
    assert.match(validateDocumentFile({ name: "large.pdf", size: 11 * 1024 * 1024, type: "application/pdf" }), /10MB/);
  });

  it("formats compact file sizes", () => {
    assert.equal(formatFileSize(0), "0 B");
    assert.equal(formatFileSize(1536), "1.5 KB");
    assert.equal(formatFileSize(2 * 1024 * 1024), "2.0 MB");
  });
});
