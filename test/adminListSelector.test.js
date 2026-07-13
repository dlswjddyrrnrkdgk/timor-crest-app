import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sortContractors, sortUnits } from "../src/services/adminListModel.js";
import { getVisibleExpandableItems } from "../src/services/expandableSelectModel.js";

const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorServiceSource = readFileSync(new URL("../src/services/contractorService.js", import.meta.url), "utf8");
const expandableSelectSource = readFileSync(new URL("../src/components/ExpandableSelectList.jsx", import.meta.url), "utf8");

describe("Admin expandable list selectors", () => {
  it("removes dashboard management shortcut links from Admin home", () => {
    assert.doesNotMatch(adminLayoutSource, /management-action-grid/);
    assert.doesNotMatch(adminLayoutSource, /<Link\b/);
  });

  it("uses the shared expandable selector on admin list surfaces", () => {
    const usages = adminLayoutSource.match(/<ExpandableSelectList/g) || [];

    assert.ok(usages.length >= 5);
  });

  it("hard deletes contractor rows without deleting auth users", () => {
    assert.match(contractorServiceSource, /export async function deleteContractor/);
    assert.match(contractorServiceSource, /\.from\("contractors"\)\.delete\(\)\.eq\("id", id\)/);
    assert.doesNotMatch(contractorServiceSource, /auth\.admin\.deleteUser/);
    assert.doesNotMatch(contractorServiceSource, /status: "archived"/);
  });

  it("uses compact previews only on the admin dashboard lists", () => {
    assert.match(expandableSelectSource, /renderPreviewItem/);
    assert.match(adminLayoutSource, /renderPreviewItem=\{\(contractor\) => renderContractorPreview\(contractor, t\)\}/);
    assert.match(adminLayoutSource, /renderPreviewItem=\{\(unit\) => renderUnitPreview\(unit, t\)\}/);
    assert.match(adminLayoutSource, /function renderContractorPreview/);
    assert.match(adminLayoutSource, /function renderUnitPreview/);
  });

  it("exposes accessible collapsed and expanded list controls", () => {
    assert.match(expandableSelectSource, /aria-expanded=\{expanded\}/);
    assert.match(expandableSelectSource, /aria-controls=\{listId\}/);
    assert.match(expandableSelectSource, /getVisibleExpandableItems/);
  });

  it("computes one visible item by default while collapsed", () => {
    const visible = getVisibleExpandableItems({
      expanded: false,
      items: [
        { id: "one", title: "첫 번째 계약자" },
        { id: "two", title: "두 번째 계약자" },
      ],
    });

    assert.deepEqual(visible.map((item) => item.id), ["one"]);
  });

  it("keeps the selected item visible while collapsed", () => {
    const visible = getVisibleExpandableItems({
      expanded: false,
      items: [
        { id: "one", title: "첫 번째 계약자" },
        { id: "two", title: "선택된 계약자" },
      ],
      selectedId: "two",
    });

    assert.deepEqual(visible.map((item) => item.id), ["two"]);
  });

  it("computes every item while expanded", () => {
    const visible = getVisibleExpandableItems({
      expanded: true,
      items: [
        { id: "one", title: "첫 번째 계약자" },
        { id: "two", title: "두 번째 계약자" },
      ],
    });

    assert.deepEqual(visible.map((item) => item.id), ["one", "two"]);
  });

  it("sorts contractors by created_at desc with full_name fallback", () => {
    const sorted = sortContractors([
      { id: "old", created_at: "2026-01-01T00:00:00Z", full_name: "Old" },
      { id: "fallback-b", full_name: "Beta" },
      { id: "new", created_at: "2026-06-01T00:00:00Z", full_name: "New" },
      { id: "fallback-a", full_name: "Alpha" },
    ]);

    assert.deepEqual(sorted.map((item) => item.id), ["new", "old", "fallback-a", "fallback-b"]);
  });

  it("sorts units by created_at desc with unit_code fallback", () => {
    const sorted = sortUnits([
      { id: "fallback-b", unit_code: "B-203" },
      { id: "new", created_at: "2026-06-01T00:00:00Z", unit_code: "C-301" },
      { id: "old", created_at: "2026-01-01T00:00:00Z", unit_code: "A-101" },
      { id: "fallback-a", unit_code: "A-102" },
    ]);

    assert.deepEqual(sorted.map((item) => item.id), ["new", "old", "fallback-a", "fallback-b"]);
  });

  it("does not keep archive action helpers in the admin UI", () => {
    assert.doesNotMatch(adminLayoutSource, /ArchiveContractorButton/);
    assert.doesNotMatch(adminLayoutSource, /isArchivedContractor/);
    assert.match(adminLayoutSource, /DeleteContractorButton/);
  });
});
