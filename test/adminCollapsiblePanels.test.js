import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const collapsiblePanelSource = readFileSync(new URL("../src/components/CollapsiblePanel.jsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("Admin collapsible management panels", () => {
  it("provides an accessible shared collapsible panel component", () => {
    assert.match(collapsiblePanelSource, /export default function CollapsiblePanel/);
    assert.match(collapsiblePanelSource, /aria-expanded=\{expanded\}/);
    assert.match(collapsiblePanelSource, /aria-controls=\{bodyId\}/);
    assert.match(collapsiblePanelSource, /hidden=\{!expanded\}/);
    assert.match(collapsiblePanelSource, /m6 9 6 6 6-6/);
    assert.match(collapsiblePanelSource, /m6 15 6-6 6 6/);
  });

  it("wraps the requested Admin management sections in collapsible panels", () => {
    const usages = adminLayoutSource.match(/<CollapsiblePanel/g) || [];

    assert.ok(usages.length >= 6);
    assert.match(adminLayoutSource, /title=\{selectedContractor \? "계약자 수정" : createButtonLabel\}/);
    assert.match(adminLayoutSource, /title=\{selectedUnit \? "호수 수정" : "호수 생성"\}/);
    assert.match(adminLayoutSource, /title="납부방법 설정"/);
    assert.match(adminLayoutSource, /title="납부관리방법 수정"/);
    assert.match(adminLayoutSource, /title=\{`\$\{item\.step_no\}\. \$\{item\.title\}`\}/);
    assert.match(adminLayoutSource, /title="선택 계약자 문서"/);
  });

  it("keeps management panels collapsed by default while allowing empty-state expansion", () => {
    assert.match(adminLayoutSource, /defaultExpanded=\{!sortedContractors\.length \|\| Boolean\(selectedContractor\)\}/);
    assert.match(adminLayoutSource, /defaultExpanded=\{!sortedUnits\.length \|\| Boolean\(selectedUnit\)\}/);
    assert.match(adminLayoutSource, /defaultExpanded=\{!form\.payment_method\}/);
    assert.match(adminLayoutSource, /defaultExpanded=\{Boolean\(selectedDocumentContractor && !selectedContractorDocuments\.length\)\}/);
  });

  it("uses a smaller circular panel toggle than dashboard expandable lists", () => {
    assert.match(stylesSource, /\.expand-toggle-button\s*\{[\s\S]*?width: 42px;[\s\S]*?height: 42px;/);
    assert.match(stylesSource, /\.collapsible-panel__toggle\s*\{[\s\S]*?width: 32px;[\s\S]*?height: 32px;[\s\S]*?border-radius: 50%;/);
    assert.match(stylesSource, /\.collapsible-panel__body\[hidden\]\s*\{[\s\S]*?display: none;/);
    assert.match(stylesSource, /\.collapsible-panel \.admin-form\s*\{[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/);
  });

  it("does not add frontend auth creation or service-role access", () => {
    assert.doesNotMatch(adminLayoutSource, /service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp/);
  });
});
