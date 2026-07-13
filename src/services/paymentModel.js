export const DEFAULT_PAYMENT_STEPS = [
  "BOOKING FEE",
  "8주 이내 계약금",
  "기초공사 완료",
  "골조 완료",
  "벽체 완료",
  "지붕 천장 완료",
  "문 / 창호 / 전기 완료",
  "입주 전",
];

const ENGLISH_PAYMENT_STEP_TITLES = {
  1: "Booking Fee",
  2: "Contract Deposit Within 8 Weeks",
  3: "Foundation Work Completed",
  4: "Structural Frame Completed",
  5: "Wall Work Completed",
  6: "Roof & Ceiling Completed",
  7: "Doors, Windows & Electrical Completed",
  8: "Before Move-in",
};

export function getPaymentStepTitle(item, language = "kr") {
  if (language === "en") {
    return ENGLISH_PAYMENT_STEP_TITLES[Number(item?.step_no)] || item?.title || "";
  }

  return item?.title || "";
}
