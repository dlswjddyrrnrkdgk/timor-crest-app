import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");

describe("Admin document upload form", () => {
  it("does not rely on DOM form reset after async upload", () => {
    assert.doesNotMatch(adminLayoutSource, /\.reset\s*\(/);
  });

  it("clears the file input through a guarded ref", () => {
    assert.match(adminLayoutSource, /if \(documentFileInputRef\.current\) documentFileInputRef\.current\.value = "";/);
  });
});
