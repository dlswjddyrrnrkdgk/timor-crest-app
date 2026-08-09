import { getPaymentStepTitle } from "./paymentModel.js";

const PAYMENT_STATUS_KEYS = ["paid", "partial", "pending", "noAmount"];
const EXPORT_PAYMENT_STEP_COUNT = 8;

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

export function buildUnitPaymentExportRows(data = {}, language = "en") {
  const units = Array.isArray(data.units) ? data.units : [];
  const contractors = (Array.isArray(data.contractors) ? data.contractors : [])
    .filter((contractor) => !["archived", "deleted"].includes(normalizeStatus(contractor?.status)));
  const paymentSummaries = data.paymentSummaries || {};
  const contractorByUnitId = new Map();
  const contractorById = new Map(contractors.filter((contractor) => contractor?.id).map((contractor) => [contractor.id, contractor]));
  const summaryByContractorId = new Map();
  const summaryByUnitId = new Map();

  contractors.forEach((contractor) => {
    if (contractor?.unit_id && !contractorByUnitId.has(contractor.unit_id)) contractorByUnitId.set(contractor.unit_id, contractor);
  });
  Object.entries(paymentSummaries).forEach(([contractorId, summary]) => {
    const plan = summary?.plan;
    const key = plan?.contractor_id || contractorId;
    if (key) summaryByContractorId.set(key, summary);
    if (plan?.unit_id) summaryByUnitId.set(plan.unit_id, summary);
  });

  const rows = units.map((unit, index) => {
    const contractor = contractorByUnitId.get(unit?.id) || null;
    const summary = (contractor?.id && summaryByContractorId.get(contractor.id)) || summaryByUnitId.get(unit?.id) || null;
    return buildUnitPaymentExportRow({ contractor, isOrphan: false, no: index + 1, summary, unit }, language);
  });
  const unitIds = new Set(units.map((unit) => unit?.id).filter(Boolean));
  const assignedContractorIds = new Set(rows.map((row) => row.contractorId).filter(Boolean));

  contractors.filter((contractor) => !assignedContractorIds.has(contractor.id)).forEach((contractor) => {
    const summary = summaryByContractorId.get(contractor.id) || null;
    rows.push(buildUnitPaymentExportRow({
      contractor: contractorById.get(contractor.id) || contractor,
      isOrphan: !unitIds.has(contractor.unit_id),
      no: rows.length + 1,
      summary,
      unit: null,
    }, language));
  });

  return rows;
}

export function buildUnitPaymentExportSummary(data = {}, language = "en", rows = null) {
  const exportRows = Array.isArray(rows) ? rows : buildUnitPaymentExportRows(data, language);
  const unitRows = exportRows.filter((row) => !row.isOrphan);
  const totalRequired = exportRows.reduce((sum, row) => sum + row.totalRequired, 0);
  const totalPaid = exportRows.reduce((sum, row) => sum + row.totalPaid, 0);
  const outstandingBalance = exportRows.reduce((sum, row) => sum + row.outstandingBalance, 0);

  return {
    exportDate: formatExportDate(new Date(), language),
    totalUnits: Array.isArray(data.units) ? data.units.length : 0,
    assignedUnits: unitRows.filter((row) => row.contractorId).length,
    unassignedUnits: unitRows.filter((row) => !row.contractorId).length,
    totalContractValue: unitRows.reduce((sum, row) => sum + row.contractPrice, 0),
    totalRequired,
    totalPaid,
    outstandingBalance,
    collectionRate: percentOf(totalPaid, totalRequired),
    rowCount: exportRows.length,
  };
}

export function getPaymentStepExportColumns(language = "en") {
  const isKorean = language !== "en";
  const base = isKorean
    ? ["No", "세대 코드", "세대 타입", "층", "세대 상태", "계약금액", "분양자", "이메일", "연락처", "여권번호", "결제 방식", "총 납부예정액", "총 납부액", "미수금", "납부율"]
    : ["No", "Unit Code", "Unit Type", "Floor", "Unit Status", "Contract Price", "Buyer Name", "Buyer Email", "Buyer Phone", "Passport No.", "Payment Method", "Total Required", "Total Paid", "Outstanding Balance", "Collection Rate"];
  const stepLabels = isKorean
    ? ["차수 항목", "납부해야 할 금액", "현재 납입한 금액", "미납액", "차수 상태"]
    : ["Step Title", "Required Amount", "Paid Amount", "Outstanding Amount", "Status"];

  return [...base, ...Array.from({ length: EXPORT_PAYMENT_STEP_COUNT }, (_, index) => {
    const stepNo = index + 1;
    const ordinal = isKorean ? `${stepNo}차` : getOrdinal(stepNo);
    return stepLabels.map((label) => `${ordinal} ${label}`);
  }).flat()];
}

export function calculateExportStepStatus(required, paid, language = "en") {
  const requiredAmount = normalizeAmount(required);
  const paidAmount = normalizeAmount(paid);
  const isKorean = language !== "en";
  if (requiredAmount > 0 && paidAmount >= requiredAmount) return isKorean ? "납부완료" : "Paid";
  if (requiredAmount > 0 && paidAmount > 0) return isKorean ? "일부납부" : "Partially Paid";
  if (requiredAmount > 0) return isKorean ? "대기" : "Pending";
  return isKorean ? "금액없음" : "No Amount";
}

export function buildExcelTableHtml(summary = {}, rows = [], language = "en") {
  const isKorean = language !== "en";
  const labels = isKorean
    ? { title: "Timor Crest 세대 납부 리포트", exportDate: "내보낸 날짜", totalUnits: "총 세대", assignedUnits: "배정 세대", unassignedUnits: "미배정 세대", totalContractValue: "총 계약금액", totalRequired: "총 납부예정액", totalPaid: "총 납부액", outstandingBalance: "미수금" }
    : { title: "Timor Crest Unit Payment Report", exportDate: "Export Date", totalUnits: "Total Units", assignedUnits: "Assigned Units", unassignedUnits: "Unassigned Units", totalContractValue: "Total Contract Value", totalRequired: "Total Required", totalPaid: "Total Paid", outstandingBalance: "Total Outstanding" };
  const columns = getPaymentStepExportColumns(language);
  const summaryRows = [
    [labels.exportDate, summary.exportDate ?? formatExportDate(new Date(), language)],
    [labels.totalUnits, normalizeAmount(summary.totalUnits)],
    [labels.assignedUnits, normalizeAmount(summary.assignedUnits)],
    [labels.unassignedUnits, normalizeAmount(summary.unassignedUnits)],
    [labels.totalContractValue, normalizeAmount(summary.totalContractValue)],
    [labels.totalRequired, normalizeAmount(summary.totalRequired)],
    [labels.totalPaid, normalizeAmount(summary.totalPaid)],
    [labels.outstandingBalance, normalizeAmount(summary.outstandingBalance)],
  ];
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = (Array.isArray(rows) ? rows : []).map((row) => {
    const values = [
      row.no,
      row.unitCode,
      row.unitType,
      row.floor,
      row.unitStatus,
      row.contractPrice,
      row.buyerName,
      row.buyerEmail,
      row.buyerPhone,
      row.passportNo,
      row.paymentMethod,
      row.totalRequired,
      row.totalPaid,
      row.outstandingBalance,
      `${row.collectionRate}%`,
      ...row.steps.flatMap((step) => [step.title, step.requiredAmount, step.paidAmount, step.outstandingAmount, step.status]),
    ];
    return `<tr>${values.map((value, index) => renderExcelCell(value, index, columns[index])).join("")}</tr>`;
  }).join("");
  const summaryHtml = summaryRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td class="${typeof value === "number" ? "amount" : ""}">${renderExcelValue(value, typeof value === "number")}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(labels.title)}</title><style>body{font-family:Arial,"Malgun Gothic",sans-serif;color:#17233d}table{border-collapse:collapse;margin:0 0 16px;width:100%}th,td{border:1px solid #d8dee9;padding:6px 8px;font-size:11px;vertical-align:top}th{background:#eaf1ff;font-weight:700;text-align:left}.summary th{width:220px}.amount{text-align:right;mso-number-format:"0";white-space:nowrap}.detail th{background:#12315b;color:#fff;white-space:normal}.detail td{white-space:nowrap}.detail td:nth-child(n+6){text-align:right}.detail td:nth-child(7),.detail td:nth-child(8),.detail td:nth-child(9),.detail td:nth-child(10),.detail td:nth-child(11),.detail td:nth-child(20),.detail td:nth-child(25),.detail td:nth-child(30),.detail td:nth-child(35),.detail td:nth-child(40),.detail td:nth-child(45),.detail td:nth-child(50),.detail td:nth-child(55){text-align:left;white-space:normal}</style></head><body><table class="summary"><tr><th colspan="2">${escapeHtml(labels.title)}</th></tr>${summaryHtml}</table><table class="detail"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function formatExportDate(date = new Date(), language = "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function buildUnitPaymentExportRow({ contractor, isOrphan, no, summary, unit }, language) {
  const plan = summary?.plan || {};
  const items = Array.isArray(summary?.items) ? summary.items : [];
  const itemByStep = new Map(items.map((item) => [Number(item?.step_no), item]));
  const steps = Array.from({ length: EXPORT_PAYMENT_STEP_COUNT }, (_, index) => {
    const stepNo = index + 1;
    const item = itemByStep.get(stepNo) || { step_no: stepNo };
    const requiredAmount = normalizeAmount(item.required_amount);
    const paidAmount = normalizeAmount(item.paid_amount);
    return { stepNo, title: getPaymentStepTitle(item, language === "en" ? "en" : "kr"), requiredAmount, paidAmount, outstandingAmount: Math.max(requiredAmount - paidAmount, 0), status: calculateExportStepStatus(requiredAmount, paidAmount, language) };
  });
  const totalRequired = items.reduce((sum, item) => sum + normalizeAmount(item?.required_amount), 0);
  const totalPaid = items.reduce((sum, item) => sum + normalizeAmount(item?.paid_amount), 0);
  const buyer = contractor || (isActiveContractor(plan?.contractor) ? plan.contractor : null);
  const contractPrice = firstNumeric(unit?.total_price, unit?.price, plan?.total_price, plan?.contract_price, plan?.total_amount) ?? 0;
  const statusKey = isOrphan ? "unassigned" : getUnitStatus(unit, new Set(buyer && unit?.id ? [unit.id] : []));
  return {
    no,
    isOrphan,
    unitId: unit?.id ?? null,
    unitCode: unit?.unit_code ?? (isOrphan ? (language === "en" ? "Unassigned" : "미배정") : ""),
    unitType: unit?.property_type ?? unit?.type ?? "",
    floor: unit?.floor ?? "",
    unitStatus: getExportUnitStatusLabel(statusKey, language),
    contractPrice,
    contractorId: buyer?.id ?? null,
    buyerName: buyer?.full_name ?? "",
    buyerEmail: buyer?.email ?? "",
    buyerPhone: buyer?.phone ?? "",
    passportNo: buyer?.passport_no ?? "",
    paymentMethod: getPaymentMethodLabel(buyer?.payment_method, language),
    totalRequired,
    totalPaid,
    outstandingBalance: Math.max(totalRequired - totalPaid, 0),
    collectionRate: percentOf(totalPaid, totalRequired),
    steps,
  };
}

function getPaymentMethodLabel(value, language) {
  const normalized = normalizeStatus(value);
  if (normalized === "cash") return language === "en" ? "Cash" : "현금";
  if (normalized === "bank_transfer" || normalized === "bank") return language === "en" ? "Bank Transfer" : "계좌이체";
  return language === "en" ? "Not set" : "미설정";
}

function getExportUnitStatusLabel(status, language) {
  const labels = language === "en"
    ? { available: "Available", assigned: "Assigned", reserved: "Reserved", hold: "Hold", unassigned: "Unassigned" }
    : { available: "분양가능", assigned: "배정", reserved: "예약", hold: "보류", unassigned: "미배정" };
  return labels[status] || (language === "en" ? "Unknown" : "미확인");
}

function isActiveContractor(contractor) {
  return contractor && !["archived", "deleted"].includes(normalizeStatus(contractor.status));
}

function getOrdinal(value) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] || "th"}`;
}

function renderExcelCell(value, index, column) {
  const numeric = typeof value === "number";
  const className = numeric || index === 14 || /Rate|납부율$/.test(column || "") ? "amount" : "";
  return `<td class="${className}">${renderExcelValue(value, numeric)}</td>`;
}

function renderExcelValue(value, numeric = false) {
  if (numeric) return String(Number.isFinite(Number(value)) ? Number(value) : 0);
  return escapeHtml(sanitizeExcelText(value));
}

function sanitizeExcelText(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text.trim()) ? `'${text}` : text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
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
