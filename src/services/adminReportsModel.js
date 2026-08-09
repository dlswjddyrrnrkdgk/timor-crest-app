const PAYMENT_STATUS_KEYS = ["paid", "partial", "pending", "noAmount"];

export const REPORT_DATE_RANGES = ["all", "7", "30", "month", "year"];

export function buildReportsSummary({
  contractors = [],
  units = [],
  paymentItems = [],
  paymentPlans = [],
  paymentSummaries = {},
  documents = [],
  journeySteps = [],
  allContractors = contractors,
  paymentContractors = allContractors,
} = {}) {
  const paymentRows = paymentItems.length ? paymentItems : flattenPaymentSummaries(paymentSummaries);
  const unitReport = calculateUnitReport(units, allContractors);
  const paymentReport = calculatePaymentReport(paymentRows, paymentContractors, paymentPlans.length ? paymentPlans : getPlansFromSummaries(paymentSummaries));
  const documentReport = calculateDocumentReport(documents);
  const journeyReport = calculateJourneyReport(journeySteps);
  const salesReport = calculateSalesReport(contractors, unitReport);

  return {
    kpis: calculateReportKpis({ contractors, allContractors, paymentContractors, units, paymentRows, paymentPlans, paymentSummaries, documents, journeySteps }),
    sales: salesReport,
    units: unitReport,
    payments: paymentReport,
    documents: documentReport,
    journey: journeyReport,
  };
}

export function calculateReportKpis(data = {}) {
  const paymentRows = data.paymentRows?.length ? data.paymentRows : data.paymentItems?.length ? data.paymentItems : flattenPaymentSummaries(data.paymentSummaries);
  const allContractors = data.allContractors || data.contractors || [];
  const paymentContractors = data.paymentContractors || allContractors;
  const unitReport = calculateUnitReport(data.units || [], allContractors);
  const paymentReport = calculatePaymentReport(paymentRows, paymentContractors, data.paymentPlans?.length ? data.paymentPlans : getPlansFromSummaries(data.paymentSummaries));
  const documentReport = calculateDocumentReport(data.documents || []);
  const journeyReport = calculateJourneyReport(data.journeySteps || []);

  return {
    totalCustomers: (data.contractors || []).length,
    totalUnits: (data.units || []).length,
    assignedUnits: unitReport.assigned,
    totalContractValue: calculateContractValue(data.units || [], data.paymentPlans?.length ? data.paymentPlans : getPlansFromSummaries(data.paymentSummaries)),
    totalPaid: paymentReport.totalPaid,
    outstandingBalance: paymentReport.outstanding,
    documents: documentReport.total,
    journeyProgress: journeyReport.overallProgress,
  };
}

export function calculateSalesReport(contractors = [], unitReport = calculateUnitReport()) {
  const activeCustomers = contractors.filter((contractor) => !["archived", "deleted"].includes(normalizeStatus(contractor?.status))).length;
  const assignedCustomerIds = new Set(contractors.filter((contractor) => !["archived", "deleted"].includes(normalizeStatus(contractor?.status)) && contractor?.unit_id).map((contractor) => contractor.id).filter(Boolean));
  const unassignedCustomers = contractors.filter((contractor) => !contractor?.unit_id).length;
  const assignedRate = percentOf(unitReport.assigned, unitReport.total);

  return {
    totalCustomers: contractors.length,
    activeCustomers,
    assignedCustomers: assignedCustomerIds.size,
    assignedUnits: unitReport.assigned,
    unassignedCustomers,
    assignedRate,
    availability: {
      available: unitReport.available,
      assigned: unitReport.assigned,
      reserved: unitReport.reserved,
      hold: unitReport.hold,
    },
  };
}

export function calculateUnitReport(units = [], contractors = []) {
  const assignedUnitIds = new Set(
    contractors
      .filter((contractor) => !["archived", "deleted"].includes(normalizeStatus(contractor?.status)))
      .map((contractor) => contractor?.unit_id)
      .filter(Boolean),
  );
  const counts = { total: units.length, available: 0, assigned: 0, reserved: 0, hold: 0 };

  units.forEach((unit) => {
    const status = getUnitStatus(unit, assignedUnitIds);
    counts[status] += 1;
  });

  return {
    ...counts,
    distribution: [
      { key: "available", count: counts.available },
      { key: "assigned", count: counts.assigned },
      { key: "reserved", count: counts.reserved },
      { key: "hold", count: counts.hold },
    ],
  };
}

export function calculatePaymentReport(paymentItems = [], contractors = [], paymentPlans = []) {
  const contractorById = new Map(contractors.map((contractor) => [contractor?.id, contractor]));
  const rows = paymentItems.map((item) => {
    const requiredAmount = normalizeAmount(item?.required_amount);
    const paidAmount = normalizeAmount(item?.paid_amount);
    const contractorId = item?.contractor_id || item?.contractor?.id;
    const contractor = contractorById.get(contractorId) || item?.contractor || null;
    return {
      ...item,
      contractor_id: contractorId,
      contractor,
      requiredAmount,
      paidAmount,
      unpaidAmount: Math.max(requiredAmount - paidAmount, 0),
      paymentStatus: getPaymentStatus(requiredAmount, paidAmount),
    };
  });
  const statusCounts = PAYMENT_STATUS_KEYS.reduce((result, key) => ({ ...result, [key]: 0 }), {});
  const customerTotals = new Map();

  rows.forEach((row) => {
    statusCounts[row.paymentStatus] += 1;
    if (row.unpaidAmount <= 0) return;
    const key = row.contractor_id || row.contractor?.id || row.contractor?.full_name || "unknown";
    const current = customerTotals.get(key) || {
      id: key,
      name: row.contractor?.full_name || "",
      amount: 0,
    };
    current.amount += row.unpaidAmount;
    customerTotals.set(key, current);
  });

  return {
    rows,
    totalRequired: rows.reduce((sum, row) => sum + row.requiredAmount, 0),
    totalPaid: rows.reduce((sum, row) => sum + row.paidAmount, 0),
    outstanding: rows.reduce((sum, row) => sum + row.unpaidAmount, 0),
    collectionRate: percentOf(
      rows.reduce((sum, row) => sum + row.paidAmount, 0),
      rows.reduce((sum, row) => sum + row.requiredAmount, 0),
    ),
    statusCounts,
    topOutstandingCustomers: [...customerTotals.values()].sort((left, right) => right.amount - left.amount).slice(0, 5),
    planCount: paymentPlans.length,
  };
}

export function calculateDocumentReport(documents = [], now = new Date()) {
  const start = getRangeStart("7", now);
  const categories = new Map();
  const customerIds = new Set();
  const recentDocuments = [];

  documents.forEach((document) => {
    const category = String(document?.category || "").trim() || "notSet";
    categories.set(category, (categories.get(category) || 0) + 1);
    if (document?.contractor_id) customerIds.add(document.contractor_id);
    const timestamp = getRowTimestamp(document);
    if (Number.isFinite(timestamp) && timestamp >= start) recentDocuments.push(document);
  });

  return {
    total: documents.length,
    customersWithDocuments: customerIds.size,
    recentlyUploaded: recentDocuments.length,
    categories: [...categories.entries()].map(([key, count]) => ({ key, count })).sort((left, right) => right.count - left.count),
    recentDocuments: [...recentDocuments].sort(compareRecent).slice(0, 5),
  };
}

export function calculateJourneyReport(journeySteps = []) {
  const steps = [...journeySteps].sort((left, right) => Number(left?.step_no || 0) - Number(right?.step_no || 0)).map((step) => ({
    ...step,
    normalizedProgress: normalizeProgress(step?.progress_percent),
  }));
  const completed = steps.filter((step) => step.normalizedProgress >= 100).length;
  const inProgress = steps.filter((step) => step.normalizedProgress > 0 && step.normalizedProgress < 100).length;
  const pending = steps.filter((step) => step.normalizedProgress === 0).length;
  const currentStage = steps.find((step) => step.normalizedProgress < 100) || null;

  return {
    steps,
    overallProgress: steps.length ? Math.round(steps.reduce((sum, step) => sum + step.normalizedProgress, 0) / steps.length) : 0,
    completed,
    inProgress,
    pending,
    remaining: steps.filter((step) => step.normalizedProgress < 100).length,
    currentStage,
    currentStageTitle: currentStage?.title || "Move-in Preparation Complete",
  };
}

export function filterReportsByDateRange(data = {}, range = "all", now = new Date()) {
  const normalizedRange = REPORT_DATE_RANGES.includes(String(range)) ? String(range) : "all";
  const filterRows = (rows = []) => rows.filter((row) => matchesRange(row, normalizedRange, now));

  return {
    ...data,
    contractors: filterRows(data.contractors),
    documents: filterRows(data.documents),
    paymentItems: filterRows(data.paymentItems),
  };
}

export function flattenPaymentSummaries(paymentSummaries = {}) {
  return Object.values(paymentSummaries || {}).flatMap((summary) => {
    const plan = summary?.plan || {};
    return (summary?.items || []).map((item) => ({
      ...item,
      contractor_id: item?.contractor_id ?? plan.contractor_id ?? plan.contractor?.id,
      plan_id: item?.plan_id ?? plan.id,
      plan_total_price: plan.total_price ?? plan.contract_price ?? plan.total_amount,
    }));
  });
}

export function buildReportsCsv(summary = {}) {
  const rows = [
    ["metric", "value"],
    ["total_customers", summary.kpis?.totalCustomers ?? 0],
    ["total_units", summary.kpis?.totalUnits ?? 0],
    ["assigned_units", summary.kpis?.assignedUnits ?? 0],
    ["total_contract_value", summary.kpis?.totalContractValue ?? 0],
    ["total_required", summary.payments?.totalRequired ?? 0],
    ["total_paid", summary.payments?.totalPaid ?? 0],
    ["outstanding_balance", summary.payments?.outstanding ?? 0],
    ["collection_rate", summary.payments?.collectionRate ?? 0],
    ["documents", summary.kpis?.documents ?? 0],
    ["journey_progress", summary.kpis?.journeyProgress ?? 0],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function getPaymentStatus(requiredAmount, paidAmount) {
  if (requiredAmount > 0 && paidAmount >= requiredAmount) return "paid";
  if (paidAmount > 0 && paidAmount < requiredAmount) return "partial";
  if (requiredAmount > 0 && paidAmount === 0) return "pending";
  return "noAmount";
}

export function normalizeAmount(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
}

export function normalizeProgress(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.min(Math.max(Math.round(number), 0), 100) : 0;
}

function calculateContractValue(units = [], paymentPlans = []) {
  const unitPrices = units.map((unit) => firstNumeric(unit?.total_price, unit?.price));
  if (unitPrices.some((value) => value !== null)) return unitPrices.reduce((sum, value) => sum + (value ?? 0), 0);

  const seen = new Set();
  return paymentPlans.reduce((sum, plan, index) => {
    const key = plan?.id || plan?.contractor_id || index;
    if (seen.has(key)) return sum;
    seen.add(key);
    return sum + (firstNumeric(plan?.total_price, plan?.contract_price, plan?.total_amount) ?? 0);
  }, 0);
}

function getPlansFromSummaries(paymentSummaries = {}) {
  return Object.values(paymentSummaries || {}).map((summary) => summary?.plan).filter(Boolean);
}

function getUnitStatus(unit, assignedUnitIds) {
  const status = normalizeStatus(unit?.status);
  if (assignedUnitIds.has(unit?.id) || ["assigned", "sold", "contracted"].includes(status)) return "assigned";
  if (status === "reserved") return "reserved";
  if (["hold", "on_hold", "blocked"].includes(status)) return "hold";
  return "available";
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function percentOf(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function firstNumeric(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return Math.max(number, 0);
  }
  return null;
}

function getRowTimestamp(row) {
  return Date.parse(row?.uploaded_at || row?.updated_at || row?.created_at || "");
}

function compareRecent(left, right) {
  return getRowTimestamp(right) - getRowTimestamp(left);
}

function matchesRange(row, range, now) {
  if (range === "all") return true;
  const timestamp = getRowTimestamp(row);
  if (!Number.isFinite(timestamp)) return true;
  return timestamp >= getRangeStart(range, now);
}

function getRangeStart(range, now) {
  const date = new Date(now);
  if (range === "7" || range === "30") {
    date.setDate(date.getDate() - Number(range));
    return date.getTime();
  }
  if (range === "month") return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  if (range === "year") return new Date(date.getFullYear(), 0, 1).getTime();
  return Number.NEGATIVE_INFINITY;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
