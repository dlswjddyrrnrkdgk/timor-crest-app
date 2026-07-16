import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PAYMENT_RATIOS,
  DEFAULT_PAYMENT_STEPS,
  buildPaymentItemUpdatePayload,
  calculatePaymentAmount,
  calculatePaymentRatio,
  getChangedPaymentItemPayloads,
  getDefaultPaymentRatio,
  getPaymentStepTitle,
  normalizePaymentAmount,
  normalizePaymentItem,
  normalizePaymentRatio,
} from "../src/services/paymentModel.js";

test("default payment steps preserve the Korean DB seed order", () => {
  assert.deepEqual(DEFAULT_PAYMENT_STEPS, [
    "BOOKING FEE",
    "8주 이내 계약금",
    "기초공사 시",
    "골조공사 시",
    "벽체공사 시",
    "천장공사 시",
    "창문 / 전기공사 시",
    "입주 시",
  ]);
});

test("payment step titles are translated for English display without changing DB titles", () => {
  const customKoreanTitle = { step_no: 7, title: "사용자 수정 납부 제목" };

  assert.equal(getPaymentStepTitle({ step_no: 1, title: "BOOKING FEE" }, "en"), "Booking Fee");
  assert.equal(getPaymentStepTitle({ step_no: 2, title: "8주 이내 계약금" }, "en"), "Contract Deposit Within 8 Weeks");
  assert.equal(getPaymentStepTitle(customKoreanTitle, "en"), "Doors, Windows & Electrical Completed");
  assert.equal(getPaymentStepTitle(customKoreanTitle, "kr"), "창문 / 전기공사 시");
});

test("default payment ratios match the fixed 8-step schedule and sum to 100", () => {
  assert.deepEqual(DEFAULT_PAYMENT_RATIOS, {
    1: 2,
    2: 28,
    3: 10,
    4: 20,
    5: 10,
    6: 10,
    7: 10,
    8: 10,
  });
  assert.equal(Object.values(DEFAULT_PAYMENT_RATIOS).reduce((sum, ratio) => sum + ratio, 0), 100);
  assert.equal(getDefaultPaymentRatio(1), 2);
  assert.equal(getDefaultPaymentRatio(2), 28);
  assert.equal(getDefaultPaymentRatio(4), 20);
});

test("payment amount and ratio calculations preserve zero and clamp unsafe values", () => {
  assert.equal(calculatePaymentAmount(100000, 2), 2000);
  assert.equal(calculatePaymentAmount(100000, 28), 28000);
  assert.equal(calculatePaymentAmount(100000, 20), 20000);
  assert.equal(calculatePaymentAmount(99999, 12.8), 11999);
  assert.equal(normalizePaymentRatio(0), 0);
  assert.equal(normalizePaymentRatio(12.8), 12);
  assert.equal(normalizePaymentRatio(12.1), 12);
  assert.equal(normalizePaymentRatio(-10), 0);
  assert.equal(normalizePaymentRatio(120), 100);
  assert.equal(normalizePaymentAmount(0, 100000), 0);
  assert.equal(normalizePaymentAmount(12345.67, 100000), 12345);
  assert.equal(normalizePaymentAmount(-10, 100000), 0);
  assert.equal(normalizePaymentAmount(120000, 100000), 100000);
});

test("payment ratio calculated from amount is truncated to an integer", () => {
  const item = normalizePaymentItem({ id: "c", step_no: 1, payment_ratio: 12.8, required_amount: 12800.99, paid_amount: 0 }, 100000);
  const payload = buildPaymentItemUpdatePayload({ ...item, required_amount: 12800 }, 100000);

  assert.equal(calculatePaymentRatio(100000, 12800.99), 12);
  assert.equal(item.payment_ratio, 12);
  assert.equal(item.required_amount, 12800);
  assert.equal(payload.payment_ratio, 12);
  assert.equal(payload.required_amount, 12800);
});

test("payment item normalization falls back only when saved ratio is missing", () => {
  assert.deepEqual(
    normalizePaymentItem({ id: "a", step_no: 1, payment_ratio: null, required_amount: 0, paid_amount: 0 }, 100000),
    { id: "a", step_no: 1, payment_ratio: 2, required_amount: 2000, paid_amount: 0 },
  );
  assert.deepEqual(
    normalizePaymentItem({ id: "b", step_no: 1, payment_ratio: 0, required_amount: 0, paid_amount: 0 }, 100000),
    { id: "b", step_no: 1, payment_ratio: 0, required_amount: 0, paid_amount: 0 },
  );
});

test("payment dirty payload includes zero ratio and zero amount", () => {
  const original = [{ id: "a", step_no: 1, title: "BOOKING FEE", payment_ratio: 2, required_amount: 2000, paid_amount: 100, status: "partial" }];
  const draft = [{ id: "a", step_no: 1, title: "BOOKING FEE", payment_ratio: 0, required_amount: 0, paid_amount: 0, status: "unpaid" }];
  const changes = getChangedPaymentItemPayloads(original, draft, 100000);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].values.payment_ratio, 0);
  assert.equal(changes[0].values.required_amount, 0);
  assert.equal(changes[0].values.paid_amount, 0);
  assert.equal(buildPaymentItemUpdatePayload(draft[0], 100000).payment_ratio, 0);
});
