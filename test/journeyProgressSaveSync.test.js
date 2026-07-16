import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const animatedProgressSource = readFileSync(new URL("../src/components/AnimatedProgress.jsx", import.meta.url), "utf8");
const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
const journeyServiceSource = readFileSync(new URL("../src/services/journeyService.js", import.meta.url), "utf8");

describe("Journey progress save synchronization", () => {
  it("keeps Admin Journey edits in a draft state with an original baseline", () => {
    assert.match(adminLayoutSource, /const \[journeyOriginalSteps, setJourneyOriginalSteps\] = useState\(\[\]\)/);
    assert.match(adminLayoutSource, /getChangedJourneyStepPayloads\(journeyOriginalSteps, journeySteps\)/);
    assert.match(adminLayoutSource, /disabled=\{!hasJourneyChanges \|\| status === "saving"\}/);
  });

  it("synchronizes range and number progress inputs through the same draft field", () => {
    assert.match(adminLayoutSource, /const progress = normalizeProgressPercent\(item\.progress_percent\)/);
    assert.match(adminLayoutSource, /function handleProgressChange\(event\)/);
    assert.match(adminLayoutSource, /onChange\(item\.id, "progress_percent", event\.target\.value\)/);
    assert.match(adminLayoutSource, /type="range" value=\{progress\}/);
    assert.match(adminLayoutSource, /type="number" value=\{progress\}/);
  });

  it("saves all changed Journey steps with payloads that include progress_percent", () => {
    assert.match(journeyServiceSource, /\.update\(buildJourneyStepUpdatePayload\(values\)\)/);
    assert.match(adminLayoutSource, /Promise\.all\(changes\.map\(\(change\) => updateJourneyStep\(change\.id, change\.values\)\)\)/);
    assert.doesNotMatch(journeyServiceSource, /if\s*\(\s*progress_percent\s*\)/);
  });

  it("uses Supabase Journey rows and preserves zero progress in Contractor display", () => {
    assert.match(contractorLayoutSource, /getJourneySteps\(\)/);
    assert.match(contractorLayoutSource, /value=\{currentStep\.progress_percent\}/);
    assert.match(contractorLayoutSource, /value=\{item\.progress_percent\}/);
    assert.match(animatedProgressSource, /Number\(value \?\? 0\)/);
  });
});
