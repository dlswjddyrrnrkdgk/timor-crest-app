import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCurrencyAmount } from "../src/services/formatters.js";

describe("currency formatters", () => {
  it("formats USD values with a dollar sign and grouped thousands", () => {
    assert.equal(formatCurrencyAmount(1000), "$1,000");
    assert.equal(formatCurrencyAmount(250000), "$250,000");
    assert.equal(formatCurrencyAmount(1234567.89), "$1,234,567.89");
    assert.equal(formatCurrencyAmount(0), "$0");
  });

  it("normalizes empty and invalid display values safely", () => {
    assert.equal(formatCurrencyAmount(null), "$0");
    assert.equal(formatCurrencyAmount(undefined), "$0");
    assert.equal(formatCurrencyAmount(Number.NaN), "$0");
  });
});
