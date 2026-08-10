import { buildCustomerManagementCalendarActivities } from "./adminCustomerManagementScheduleModel.js";

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

export function getTodayScheduleAlerts({ events = [], consultations = [], leads = [], contractors = [], now = new Date(), limit = 5 } = {}) {
  const today = getLocalDateKey(now);
  if (!today) return [];

  const activities = buildCustomerManagementCalendarActivities({ events, consultations, leads, contractors })
    .filter((activity) => activity.date === today && !["cancelled", "completed"].includes(String(activity.status || "").toLowerCase()))
    .sort((left, right) => {
      const leftTime = left.start_time || "99:99";
      const rightTime = right.start_time || "99:99";
      return leftTime.localeCompare(rightTime) || String(left.title || "").localeCompare(String(right.title || ""));
    });

  const visible = activities.slice(0, Math.max(0, limit));
  const alerts = visible.map((activity) => ({
    id: activity.id,
    alertType: activity.source_type,
    sourceType: activity.source_type,
    title: activity.title,
    customerName: activity.customer_name || "",
    customerPhone: activity.customer_phone || "",
    eventTitle: activity.title,
    eventType: activity.type || "other",
    startTime: activity.start_time || "",
    endTime: activity.end_time || "",
    location: activity.location || "",
    summary: activity.summary || "",
    nextAction: activity.next_action || "",
    status: activity.status || "scheduled",
    isScheduleAlert: true,
  }));

  if (activities.length > visible.length) {
    alerts.push({
      id: `schedule:more:${today}`,
      alertType: "schedule_more",
      count: activities.length - visible.length,
      title: `+${activities.length - visible.length} more`,
      isScheduleAlert: true,
      isMore: true,
    });
  }

  return alerts;
}

export function getUnreadDashboardAlerts(alerts = [], acknowledgedIds = []) {
  const acknowledged = new Set(Array.isArray(acknowledgedIds) ? acknowledgedIds : []);
  return (Array.isArray(alerts) ? alerts : []).filter((alert) => alert?.id && !acknowledged.has(alert.id));
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
        alertType: "outstanding",
        title: item?.title || `Step ${item?.step_no || ""}`.trim(),
        stepNo: Number(item?.step_no || 0),
        customerName: contractor?.full_name || "",
        unitCode: contractor?.unit?.unit_code || plan?.unit?.unit_code || plan?.contractor?.unit?.unit_code || "",
        requiredAmount,
        paidAmount,
        unpaidAmount: Math.max(requiredAmount - paidAmount, 0),
        planRequiredAmount: (summary?.items || []).reduce((sum, paymentItem) => sum + normalizeAmount(paymentItem?.required_amount), 0),
        planPaidAmount: (summary?.items || []).reduce((sum, paymentItem) => sum + normalizeAmount(paymentItem?.paid_amount), 0),
        unpaidSteps: (summary?.items || []).filter((paymentItem) => normalizeAmount(paymentItem?.required_amount) > normalizeAmount(paymentItem?.paid_amount)).length,
        dueDate: item?.due_date || "",
        status: item?.status || "unpaid",
        currency: plan.currency || "USD",
      };
    });
  });
}

export function buildDashboardAlertReason(alert, language = "en") {
  const type = String(alert?.alertType || alert?.type || "").trim().toLowerCase();
  if (["outstanding", "payment", "unpaid"].includes(type)) {
    return language === "en"
      ? "This alert appears because this customer has an outstanding unpaid balance."
      : "이 고객에게 미납 금액이 있어 알림이 표시됩니다.";
  }
  if (["document", "documents"].includes(type)) {
    return language === "en"
      ? "This alert appears because the customer has no uploaded documents or needs document review."
      : "업로드된 문서가 없거나 문서 확인이 필요해 알림이 표시됩니다.";
  }
  if (["unit_assignment", "unit-assignment", "unassigned"].includes(type)) {
    return language === "en"
      ? "This alert appears because the customer is not assigned to a unit."
      : "고객에게 배정된 세대가 없어 알림이 표시됩니다.";
  }
  return language === "en" ? "This alert requires attention." : "확인이 필요한 알림입니다.";
}

export function buildDashboardAlertDetailRows(alert, language = "en") {
  const isKorean = language !== "en";
  const type = String(alert?.alertType || alert?.type || "").trim().toLowerCase();
  const labels = isKorean
    ? { totalRequired: "총 납부예정액", totalPaid: "총 납부액", outstanding: "미수금", unpaidSteps: "미납 차수", unit: "세대", documents: "문서 수", latestDocument: "최근 문서", customer: "고객" }
    : { totalRequired: "Total required", totalPaid: "Total paid", outstanding: "Outstanding amount", unpaidSteps: "Unpaid steps", unit: "Unit", documents: "Document count", latestDocument: "Latest document", customer: "Customer" };
  if (["outstanding", "payment", "unpaid"].includes(type)) {
    const totalRequired = normalizeAmount(alert?.planRequiredAmount ?? alert?.totalRequired);
    const totalPaid = normalizeAmount(alert?.planPaidAmount ?? alert?.totalPaid);
    return [
      { label: labels.totalRequired, kind: "amount", value: totalRequired },
      { label: labels.totalPaid, kind: "amount", value: totalPaid },
      { label: labels.outstanding, kind: "amount", value: Math.max(totalRequired - totalPaid, 0) },
      { label: labels.unpaidSteps, kind: "count", value: normalizeAmount(alert?.unpaidSteps) },
      { label: labels.unit, value: alert?.unitCode ?? (isKorean ? "확인 불가" : "Not available") },
    ];
  }
  if (["document", "documents"].includes(type)) {
    return [
      { label: labels.customer, value: alert?.customerName ?? (isKorean ? "확인 불가" : "Not available") },
      { label: labels.documents, value: normalizeAmount(alert?.documentCount) },
      { label: labels.latestDocument, value: alert?.latestDocumentDate ?? (isKorean ? "확인 불가" : "Not available") },
    ];
  }
  if (["unit_assignment", "unit-assignment", "unassigned"].includes(type)) {
    return [
      { label: labels.customer, value: alert?.customerName ?? (isKorean ? "확인 불가" : "Not available") },
      { label: labels.unit, value: alert?.unitCode ?? (isKorean ? "미배정" : "Unassigned") },
    ];
  }
  return [{ label: isKorean ? "알림 상세" : "Alert details", value: isKorean ? "확인 불가" : "Not available" }];
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

function getLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
