import { normalizePaymentItems } from "./paymentModel.js";

export function buildPaymentSummary({ contractor = null, plan = null, items = [] } = {}) {
  const totalContractPrice = numberOrZero(plan?.total_price ?? contractor?.unit?.total_price);
  const rows = normalizePaymentItems(items, totalContractPrice);
  const totalRequired = rows.reduce((sum, item) => sum + numberOrZero(item?.required_amount), 0);
  const totalPaid = rows.reduce((sum, item) => sum + numberOrZero(item?.paid_amount), 0);
  const outstanding = Math.max(totalRequired - totalPaid, 0);
  const paymentProgress = totalRequired > 0 ? Math.round((totalPaid / totalRequired) * 100) : 0;
  const ratioTotal = rows.reduce((sum, item) => sum + numberOrZero(item?.payment_ratio), 0);

  return {
    currency: plan?.currency || contractor?.unit?.currency || "USD",
    outstanding,
    paymentProgress,
    ratioTotal,
    rows,
    totalContractPrice,
    totalPaid,
    totalRequired,
  };
}

export function getPaymentItemStatus(item = {}) {
  const required = numberOrZero(item.required_amount);
  const paid = numberOrZero(item.paid_amount);

  if (required > 0 && paid >= required) return { key: "paid", tone: "success" };
  if (required > 0 && paid > 0) return { key: "partial", tone: "warning" };
  if (required > 0) return { key: "pending", tone: "info" };
  return { key: "no_amount", tone: "neutral" };
}

export function getPaymentItemUnpaid(item = {}) {
  return Math.max(numberOrZero(item.required_amount) - numberOrZero(item.paid_amount), 0);
}

export function filterPaymentContractors(contractors = [], query = "") {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return Array.isArray(contractors) ? contractors : [];

  return (Array.isArray(contractors) ? contractors : []).filter((contractor) => {
    const searchable = [
      contractor?.full_name,
      contractor?.email,
      contractor?.phone,
      contractor?.unit?.unit_code,
    ].map((value) => String(value ?? "").toLowerCase()).join(" ");
    return searchable.includes(normalizedQuery);
  });
}

export function getPaymentMethodLabel(method, t) {
  if (method === "cash") return t("Cash");
  if (method === "bank_transfer") return t("Bank Transfer");
  return t("Not set");
}

export function getPaymentStatusLabel(status, t) {
  const labels = {
    no_amount: "No Amount",
    paid: "Paid",
    partial: "Partially Paid",
    pending: "Pending",
  };
  return t(labels[status] || "Pending");
}

function numberOrZero(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
