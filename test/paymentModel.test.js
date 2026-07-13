import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PAYMENT_STEPS, getPaymentStepTitle } from "../src/services/paymentModel.js";

test("default payment steps preserve the Korean DB seed order", () => {
  assert.deepEqual(DEFAULT_PAYMENT_STEPS, [
    "BOOKING FEE",
    "8주 이내 계약금",
    "기초공사 완료",
    "골조 완료",
    "벽체 완료",
    "지붕 천장 완료",
    "문 / 창호 / 전기 완료",
    "입주 전",
  ]);
});

test("payment step titles are translated for English display without changing DB titles", () => {
  const customKoreanTitle = { step_no: 7, title: "사용자 수정 납부 제목" };

  assert.equal(getPaymentStepTitle({ step_no: 1, title: "BOOKING FEE" }, "en"), "Booking Fee");
  assert.equal(getPaymentStepTitle({ step_no: 2, title: "8주 이내 계약금" }, "en"), "Contract Deposit Within 8 Weeks");
  assert.equal(getPaymentStepTitle(customKoreanTitle, "en"), "Doors, Windows & Electrical Completed");
  assert.equal(getPaymentStepTitle(customKoreanTitle, "kr"), "사용자 수정 납부 제목");
});
