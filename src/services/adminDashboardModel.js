export function calculateDashboardKpis({ contractors = [], units = [], paymentSummaries = {}, journeySteps = [] } = {}) {
  const assignedUnitIds = new Set(
    contractors
      .filter((contractor) => !["archived", "deleted"].includes(contractor?.status))
      .map((contractor) => contractor?.unit_id)
      .filter(Boolean),
  );
  const assignedUnits = units.filter((unit) => isAssignedUnit(unit, assignedUnitIds)).length;
  const availableUnits = units.filter((unit) => !isAssignedUnit(unit, assignedUnitIds) && isAvailableUnit(unit)).length;
  const paymentRows = getPaymentRows(paymentSummaries, contractors);
  const requiredAmount = paymentRows.reduce((sum, row) => sum + row.requiredAmount, 0);
  const paidAmount = paymentRows.reduce((sum, row) => sum + row.paidAmount, 0);
  const outstandingBalance = paymentRows.reduce((sum, row) => sum + row.unpaidAmount, 0);
  const journeyProgress = journeySteps.length
    ? Math.round(journeySteps.reduce((sum, step) => sum + normalizePercent(step?.progress_percent), 0) / journeySteps.length)
    : 0;

  return {
    totalCustomers: contractors.length,
    totalUnits: units.length,
    availableUnits,
    assignedUnits,
    outstandingBalance,
    paymentProgress: requiredAmount > 0 ? Math.min(Math.round((paidAmount / requiredAmount) * 100), 100) : 0,
    journeyProgress,
    requiredAmount,
    paidAmount,
  };
}

export function getRecentCustomers(contractors = [], limit = 5) {
  return [...contractors]
    .sort(compareRecent)
    .slice(0, limit);
}

export function getPaymentAlerts(paymentSummaries = {}, contractors = [], limit = 4) {
  return getPaymentRows(paymentSummaries, contractors)
    .filter((row) => row.unpaidAmount > 0)
    .sort((left, right) => {
      const leftDue = Date.parse(left.dueDate || "");
      const rightDue = Date.parse(right.dueDate || "");
      if (Number.isFinite(leftDue) && Number.isFinite(rightDue) && leftDue !== rightDue) return leftDue - rightDue;
      if (Number.isFinite(leftDue)) return -1;
      if (Number.isFinite(rightDue)) return 1;
      return right.unpaidAmount - left.unpaidAmount;
    })
    .slice(0, limit);
}

export function getUnitStatusSummary(units = [], contractors = []) {
  const assignedUnitIds = new Set(
    contractors
      .filter((contractor) => !["archived", "deleted"].includes(contractor?.status))
      .map((contractor) => contractor?.unit_id)
      .filter(Boolean),
  );
  const summary = { total: units.length, available: 0, assigned: 0, reserved: 0, hold: 0 };

  units.forEach((unit) => {
    const status = String(unit?.status || "").toLowerCase();
    if (assignedUnitIds.has(unit?.id) || ["assigned", "sold", "contracted"].includes(status)) {
      summary.assigned += 1;
    } else if (status === "reserved") {
      summary.reserved += 1;
    } else if (["hold", "on_hold"].includes(status)) {
      summary.hold += 1;
    } else {
      summary.available += 1;
    }
  });

  return summary;
}

export function getRecentDocuments(documents = [], limit = 4) {
  return [...documents].sort(compareRecent).slice(0, limit);
}

function getPaymentRows(paymentSummaries, contractors) {
  const contractorById = new Map(contractors.map((contractor) => [contractor.id, contractor]));

  return Object.values(paymentSummaries || {}).flatMap((summary) => {
    const plan = summary?.plan || {};
    const planContractorId = plan.contractor_id || plan.contractor?.id;
    const contractor = contractorById.get(planContractorId) || plan.contractor || null;
    return (summary?.items || []).map((item) => {
      const requiredAmount = normalizeAmount(item?.required_amount);
      const paidAmount = normalizeAmount(item?.paid_amount);
      return {
        id: item?.id || `${plan.id || "plan"}-${item?.step_no || "step"}`,
        title: item?.title || `Step ${item?.step_no || ""}`.trim(),
        stepNo: Number(item?.step_no || 0),
        customerName: contractor?.full_name || "",
        requiredAmount,
        paidAmount,
        unpaidAmount: Math.max(requiredAmount - paidAmount, 0),
        dueDate: item?.due_date || "",
        status: item?.status || "unpaid",
        currency: plan.currency || "USD",
      };
    });
  });
}

function isAssignedUnit(unit, assignedUnitIds) {
  const status = String(unit?.status || "").toLowerCase();
  return assignedUnitIds.has(unit?.id) || ["assigned", "sold", "contracted"].includes(status);
}

function isAvailableUnit(unit) {
  const status = String(unit?.status || "").toLowerCase();
  return !status || ["active", "available"].includes(status);
}

function compareRecent(left, right) {
  const leftDate = Date.parse(left?.updated_at || left?.created_at || "");
  const rightDate = Date.parse(right?.updated_at || right?.created_at || "");
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) return rightDate - leftDate;
  if (Number.isFinite(leftDate)) return -1;
  if (Number.isFinite(rightDate)) return 1;
  return 0;
}

function normalizeAmount(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

function normalizePercent(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 100) : 0;
}
