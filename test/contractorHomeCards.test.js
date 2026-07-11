import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");

describe("Contractor home clickable summary cards", () => {
  it("removes large home action buttons for payments and documents", () => {
    assert.doesNotMatch(contractorLayoutSource, /management-action-grid/);
    assert.doesNotMatch(contractorLayoutSource, />납부 현황 보기</);
    assert.doesNotMatch(contractorLayoutSource, />문서 보기</);
  });

  it("links contractor home summary cards to their detail routes", () => {
    assert.match(contractorLayoutSource, /<ContractSummary[^>]*to="journey"/);
    assert.match(contractorLayoutSource, /<PaymentSummaryCard[^>]*to="payments"/);
    assert.match(contractorLayoutSource, /<DocumentSummaryCard[^>]*to="documents"/);
  });

  it("renders clickable cards as accessible links", () => {
    assert.match(contractorLayoutSource, /function SummaryCardShell/);
    assert.match(contractorLayoutSource, /className=\{`\$\{className\} clickable-card`\}/);
    assert.match(contractorLayoutSource, /<Link[^>]*to=\{to\}/);
    assert.match(contractorLayoutSource, /card-link-hint/);
  });
});
