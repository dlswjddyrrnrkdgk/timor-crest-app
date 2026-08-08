const INACTIVE_STATUSES = new Set(["archived", "deleted"]);

export function calculateCustomerKpis(contractors = []) {
  const customers = Array.isArray(contractors) ? contractors : [];
  const assigned = customers.filter((customer) => Boolean(customer?.unit_id));
  const active = customers.filter((customer) => !INACTIVE_STATUSES.has(normalizeStatus(customer?.status)));

  return {
    totalCustomers: customers.length,
    activeCustomers: active.length,
    assignedUnits: assigned.length,
    unassignedCustomers: customers.length - assigned.length,
  };
}

export function filterCustomers(contractors = [], filters = {}) {
  const query = normalizeText(filters.query);
  const status = normalizeText(filters.status).toLowerCase();
  const unitAssigned = normalizeText(filters.unitAssigned).toLowerCase();
  const paymentMethod = normalizeText(filters.paymentMethod).toLowerCase();

  return (Array.isArray(contractors) ? contractors : []).filter((customer) => {
    const searchable = [
      customer?.full_name,
      customer?.email,
      customer?.phone,
      customer?.passport_no,
      customer?.unit?.unit_code,
    ].map(normalizeText).join(" ").toLowerCase();
    const customerStatus = normalizeStatus(customer?.status);
    const customerPaymentMethod = normalizeStatus(customer?.payment_method);
    const hasUnit = Boolean(customer?.unit_id);

    if (query && !searchable.includes(query.toLowerCase())) return false;
    if (status && status !== "all" && customerStatus !== status) return false;
    if (unitAssigned === "assigned" && !hasUnit) return false;
    if (unitAssigned === "unassigned" && hasUnit) return false;
    if (paymentMethod && paymentMethod !== "all") {
      if (paymentMethod === "unset" && customerPaymentMethod) return false;
      if (paymentMethod !== "unset" && customerPaymentMethod !== paymentMethod) return false;
    }

    return true;
  });
}

export function getCustomerPaymentSnapshot(paymentSummaries, contractorId) {
  const summary = paymentSummaries?.[contractorId];
  const totals = summary?.totals || {};
  const items = Array.isArray(summary?.items) ? summary.items : [];
  const totalRequired = numberOrZero(totals.totalRequiredAmount ?? items.reduce((sum, item) => sum + numberOrZero(item?.required_amount), 0));
  const totalPaid = numberOrZero(totals.totalPaidAmount ?? items.reduce((sum, item) => sum + numberOrZero(item?.paid_amount), 0));
  const totalPrice = numberOrZero(totals.totalPrice ?? summary?.plan?.total_price);
  const outstanding = totalRequired > 0
    ? Math.max(totalRequired - totalPaid, 0)
    : numberOrZero(totals.unpaidAmount ?? Math.max(totalPrice - totalPaid, 0));
  const paymentProgress = totalRequired > 0
    ? Math.round((totalPaid / totalRequired) * 100)
    : totalPrice > 0
      ? numberOrZero(totals.progressPercent ?? Math.round((totalPaid / totalPrice) * 100))
      : 0;

  return {
    currency: summary?.plan?.currency || "USD",
    hasData: Boolean(summary?.plan || items.length),
    outstanding,
    paymentProgress: Math.min(Math.max(paymentProgress, 0), 100),
    totalPaid,
    totalRequired,
  };
}

export function getCustomerDocuments(documents = [], contractorId) {
  return (Array.isArray(documents) ? documents : [])
    .filter((document) => document?.contractor_id === contractorId)
    .sort((left, right) => getTimestamp(right) - getTimestamp(left));
}

export function getCustomerStatusTone(status) {
  switch (normalizeStatus(status)) {
    case "active":
    case "contracted":
      return "success";
    case "reserved":
    case "pending":
      return "warning";
    case "archived":
    case "deleted":
      return "neutral";
    default:
      return "neutral";
  }
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function numberOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getTimestamp(record) {
  const value = record?.updated_at || record?.uploaded_at || record?.created_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
