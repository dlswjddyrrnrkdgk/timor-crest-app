export const DEFAULT_PAYMENT_STEPS = [
  "BOOKING FEE",
  "8주 이내 계약금",
  "기초공사 시",
  "골조공사 시",
  "벽체공사 시",
  "천장공사 시",
  "창문 / 전기공사 시",
  "입주 시",
];

export const DEFAULT_PAYMENT_RATIOS = {
  1: 2,
  2: 28,
  3: 10,
  4: 20,
  5: 10,
  6: 10,
  7: 10,
  8: 10,
};

const KOREAN_PAYMENT_STEP_TITLES = {
  1: "BOOKING FEE",
  2: "8주 이내 계약금",
  3: "기초공사 시",
  4: "골조공사 시",
  5: "벽체공사 시",
  6: "천장공사 시",
  7: "창문 / 전기공사 시",
  8: "입주 시",
};

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
  const stepNo = Number(item?.step_no);
  if (language === "en") {
    return ENGLISH_PAYMENT_STEP_TITLES[stepNo] || item?.title || "";
  }

  return KOREAN_PAYMENT_STEP_TITLES[stepNo] || item?.title || "";
}

export function getDefaultPaymentRatio(stepNo) {
  return DEFAULT_PAYMENT_RATIOS[Number(stepNo)] ?? 0;
}

export function getDefaultPaymentRatios() {
  return { ...DEFAULT_PAYMENT_RATIOS };
}

export function normalizePaymentRatio(value) {
  const next = normalizeNumber(value);
  return roundCurrency(Math.min(Math.max(next, 0), 100));
}

export function normalizePaymentAmount(value, totalPrice = 0) {
  const next = Math.max(normalizeNumber(value), 0);
  const price = Math.max(normalizeNumber(totalPrice), 0);
  const capped = Math.min(next, price);
  return roundCurrency(capped);
}

export function calculatePaymentAmount(totalPrice, ratio) {
  return roundCurrency((Math.max(normalizeNumber(totalPrice), 0) * normalizePaymentRatio(ratio)) / 100);
}

export function calculatePaymentRatio(totalPrice, amount) {
  const price = Math.max(normalizeNumber(totalPrice), 0);
  if (price <= 0) return 0;
  return normalizePaymentRatio((normalizePaymentAmount(amount, price) / price) * 100);
}

export function buildDefaultPaymentItems(paymentPlanId, totalPrice = 0) {
  const price = Math.max(normalizeNumber(totalPrice), 0);
  let allocatedAmount = 0;

  return DEFAULT_PAYMENT_STEPS.map((title, index) => {
    const stepNo = index + 1;
    const paymentRatio = getDefaultPaymentRatio(stepNo);
    const requiredAmount = stepNo === DEFAULT_PAYMENT_STEPS.length
      ? roundCurrency(Math.max(price - allocatedAmount, 0))
      : calculatePaymentAmount(price, paymentRatio);

    allocatedAmount = roundCurrency(allocatedAmount + requiredAmount);

    return {
      payment_plan_id: paymentPlanId,
      step_no: stepNo,
      title,
      payment_ratio: paymentRatio,
      required_amount: requiredAmount,
      paid_amount: 0,
      status: "unpaid",
    };
  });
}

export function normalizePaymentItem(item, totalPrice = 0) {
  const hasSavedRatio = item?.payment_ratio !== null && item?.payment_ratio !== undefined;
  const paymentRatio = hasSavedRatio ? item.payment_ratio : getDefaultPaymentRatio(item?.step_no);
  const normalizedRatio = normalizePaymentRatio(paymentRatio);
  const shouldUseDefaultAmount = !hasSavedRatio && normalizeNumber(item?.required_amount) === 0 && normalizeNumber(totalPrice) > 0;
  const requiredAmount = item?.required_amount === null || item?.required_amount === undefined || shouldUseDefaultAmount
    ? calculatePaymentAmount(totalPrice, normalizedRatio)
    : item.required_amount;

  return {
    ...item,
    payment_ratio: normalizedRatio,
    required_amount: normalizePaymentAmount(requiredAmount, totalPrice),
    paid_amount: normalizePaymentAmount(item?.paid_amount ?? 0, totalPrice),
  };
}

export function normalizePaymentItems(items, totalPrice = 0) {
  return (Array.isArray(items) ? items : []).map((item) => normalizePaymentItem(item, totalPrice));
}

export function getPaymentItemUnpaidAmount(item) {
  return roundCurrency(Math.max(normalizeNumber(item?.required_amount) - normalizeNumber(item?.paid_amount), 0));
}

export function buildPaymentItemUpdatePayload(item, totalPrice = 0) {
  const normalizedItem = normalizePaymentItem(item, totalPrice);

  return {
    title: normalizeText(item?.title),
    payment_ratio: normalizedItem.payment_ratio,
    required_amount: normalizedItem.required_amount,
    paid_amount: normalizedItem.paid_amount,
    due_date: normalizeDate(item?.due_date),
    paid_date: normalizeDate(item?.paid_date),
    status: normalizeText(item?.status) || "unpaid",
    note: normalizeText(item?.note),
  };
}

export function getChangedPaymentItemPayloads(originalItems, draftItems, totalPrice = 0) {
  const originalById = new Map(normalizePaymentItems(originalItems, totalPrice).map((item) => [item.id, item]));

  return normalizePaymentItems(draftItems, totalPrice)
    .filter((item) => hasPaymentItemChanges(originalById.get(item.id), item, totalPrice))
    .map((item) => ({
      id: item.id,
      values: buildPaymentItemUpdatePayload(item, totalPrice),
    }));
}

export function hasPaymentItemChanges(originalItem, draftItem, totalPrice = 0) {
  if (!originalItem || !draftItem) return Boolean(draftItem);

  const original = buildPaymentItemUpdatePayload(originalItem, totalPrice);
  const draft = buildPaymentItemUpdatePayload(draftItem, totalPrice);

  return Object.keys(draft).some((key) => draft[key] !== original[key]);
}

function normalizeText(value) {
  const next = String(value ?? "").trim();
  return next || null;
}

function normalizeDate(value) {
  return normalizeText(value);
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function roundCurrency(value) {
  return Math.round(normalizeNumber(value) * 100) / 100;
}
