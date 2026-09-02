import { formatUsdAmount, normalizeFiniteNumber } from "./formatters.js";

export const ACCOUNTING_DIRECTIONS = ["income", "expense"];
export const ACCOUNTING_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "cheque", "other"];
export const ACCOUNTING_TAX_CATEGORIES = [
  "not_reviewed",
  "income_tax_reference",
  "withholding_tax_review",
  "service_tax_review",
  "wages_tax_review",
  "exempt_or_out_of_scope",
  "other",
];
export const ACCOUNTING_SOURCE_TYPES = ["manual", "payment_reference", "refund", "adjustment", "opening_balance", "other"];
export const ACCOUNTING_PERIODS = ["all", "today", "this_week", "this_month", "this_year"];

const ACCOUNT_CATEGORIES = {
  income: ["unit_sale_payment", "booking_fee", "contract_deposit", "installment_payment", "other_income"],
  expense: ["construction_cost", "design_consulting", "office_rent", "salary_wages", "marketing", "utilities", "office_supplies", "tax_payment", "bank_fee", "legal_professional", "other_expense"],
};

const DIRECTION_LABELS = {
  income: ["Income", "수입"],
  expense: ["Expense", "지출"],
};

const PAYMENT_METHOD_LABELS = {
  cash: ["Cash", "현금"],
  bank_transfer: ["Bank Transfer", "은행이체"],
  card: ["Card", "카드"],
  cheque: ["Cheque", "수표"],
  other: ["Other", "기타"],
};

const TAX_CATEGORY_LABELS = {
  not_reviewed: ["Not Reviewed", "미검토"],
  income_tax_reference: ["Income Tax Reference", "소득세 참고"],
  withholding_tax_review: ["Withholding Tax Review", "원천징수세 검토"],
  service_tax_review: ["Service Tax Review", "서비스세 검토"],
  wages_tax_review: ["Wages Tax Review", "임금세 검토"],
  exempt_or_out_of_scope: ["Exempt or Out of Scope", "면세 또는 범위 외"],
  other: ["Other", "기타"],
};

const ACCOUNT_CATEGORY_LABELS = {
  unit_sale_payment: ["Unit Sale Payment", "분양대금"],
  booking_fee: ["Booking Fee", "예약금"],
  contract_deposit: ["Contract Deposit", "계약금"],
  installment_payment: ["Installment Payment", "중도금"],
  other_income: ["Other Income", "기타 수입"],
  construction_cost: ["Construction Cost", "건설비"],
  design_consulting: ["Design / Consulting", "설계 / 컨설팅"],
  office_rent: ["Office Rent", "사무실 임대료"],
  salary_wages: ["Salary / Wages", "급여"],
  marketing: ["Marketing", "마케팅"],
  utilities: ["Utilities", "전기·수도 등 공과금"],
  office_supplies: ["Office Supplies", "사무용품"],
  tax_payment: ["Tax Payment", "세금 납부"],
  bank_fee: ["Bank Fee", "은행 수수료"],
  legal_professional: ["Legal / Professional", "법무 / 전문 수수료"],
  other_expense: ["Other Expense", "기타 지출"],
};

const SOURCE_TYPE_LABELS = {
  manual: ["Manual", "수동"],
  payment_reference: ["Payment Reference", "납부 참조"],
  refund: ["Refund", "환불"],
  adjustment: ["Adjustment", "조정"],
  opening_balance: ["Opening Balance", "기초 잔액"],
  other: ["Other", "기타"],
};

export function safeTrim(value) {
  return String(value ?? "").trim();
}

export function emptyStringToNull(value) {
  const normalized = safeTrim(value);
  return normalized || null;
}

export function getAccountCategoryOptions(direction) {
  return [...(ACCOUNT_CATEGORIES[normalizeDirection(direction)] || [])];
}

export function validateAccountingTransactionForm(formState = {}, selectedProjectId = formState?.project_id) {
  const errors = [];
  const fieldErrors = {};
  const addError = (field, code) => {
    fieldErrors[field] = code;
    errors.push(code);
  };
  const direction = normalizeDirection(formState.direction);
  const amountText = safeTrim(formState.amount);
  const amount = Number(amountText);

  if (!hasProjectId(selectedProjectId)) addError("project_id", "project_required");
  if (!isValidDateOnly(formState.transaction_date)) addError("transaction_date", "transaction_date_required");
  if (!ACCOUNTING_DIRECTIONS.includes(direction)) addError("direction", "direction_invalid");
  if (!safeTrim(formState.account_category)) {
    addError("account_category", "account_category_required");
  } else if (direction && !getAccountCategoryOptions(direction).includes(formState.account_category)) {
    addError("account_category", "account_category_invalid");
  }
  if (!safeTrim(formState.description)) addError("description", "description_required");
  if (!amountText) {
    addError("amount", "amount_required");
  } else if (!Number.isFinite(amount)) {
    addError("amount", "amount_invalid");
  } else if (amount < 0) {
    addError("amount", "amount_negative");
  }
  if (!ACCOUNTING_PAYMENT_METHODS.includes(formState.payment_method)) addError("payment_method", "payment_method_invalid");
  if (!ACCOUNTING_TAX_CATEGORIES.includes(formState.tax_category)) addError("tax_category", "tax_category_invalid");

  return { errors, fieldErrors, valid: errors.length === 0 };
}

export function buildAccountingTransactionPayload(formState = {}, selectedProjectId = formState?.project_id) {
  const direction = normalizeDirection(formState.direction);
  const allowedCategories = getAccountCategoryOptions(direction);
  const accountCategory = allowedCategories.includes(formState.account_category) ? formState.account_category : safeTrim(formState.account_category);
  const amount = Number(formState.amount);

  return {
    project_id: safeTrim(selectedProjectId),
    transaction_date: safeTrim(formState.transaction_date),
    direction,
    account_category: accountCategory,
    tax_category: ACCOUNTING_TAX_CATEGORIES.includes(formState.tax_category) ? formState.tax_category : "not_reviewed",
    counterparty_name: emptyStringToNull(formState.counterparty_name),
    description: safeTrim(formState.description),
    payment_method: ACCOUNTING_PAYMENT_METHODS.includes(formState.payment_method) ? formState.payment_method : "bank_transfer",
    amount: Number.isFinite(amount) ? amount : 0,
    reference_no: emptyStringToNull(formState.reference_no),
    related_unit_id: emptyStringToNull(formState.related_unit_id),
    related_contractor_id: emptyStringToNull(formState.related_contractor_id),
    source_type: ACCOUNTING_SOURCE_TYPES.includes(formState.source_type) ? formState.source_type : "manual",
    memo: emptyStringToNull(formState.memo),
  };
}

export function normalizeAccountingTransaction(row = {}) {
  const direction = normalizeDirection(row.direction);
  return {
    ...row,
    project_id: safeTrim(row.project_id),
    transaction_date: safeTrim(row.transaction_date),
    direction,
    account_category: safeTrim(row.account_category),
    tax_category: ACCOUNTING_TAX_CATEGORIES.includes(row.tax_category) ? row.tax_category : "not_reviewed",
    counterparty_name: emptyStringToNull(row.counterparty_name),
    description: safeTrim(row.description),
    payment_method: ACCOUNTING_PAYMENT_METHODS.includes(row.payment_method) ? row.payment_method : "bank_transfer",
    amount: Math.max(0, normalizeFiniteNumber(row.amount)),
    reference_no: emptyStringToNull(row.reference_no),
    related_unit_id: emptyStringToNull(row.related_unit_id),
    related_contractor_id: emptyStringToNull(row.related_contractor_id),
    source_type: ACCOUNTING_SOURCE_TYPES.includes(row.source_type) ? row.source_type : "manual",
    memo: emptyStringToNull(row.memo),
  };
}

export function filterAccountingTransactions(rows = [], filters = {}, now = new Date()) {
  const query = safeTrim(filters.search).toLowerCase();
  const period = ACCOUNTING_PERIODS.includes(filters.period) ? filters.period : "all";
  return safeRows(rows).filter((row) => {
    if (filters.projectId && row.project_id !== filters.projectId) return false;
    if (filters.direction && filters.direction !== "all" && row.direction !== filters.direction) return false;
    if (filters.accountCategory && filters.accountCategory !== "all" && row.account_category !== filters.accountCategory) return false;
    if (filters.taxCategory && filters.taxCategory !== "all" && row.tax_category !== filters.taxCategory) return false;
    if (filters.paymentMethod && filters.paymentMethod !== "all" && row.payment_method !== filters.paymentMethod) return false;
    if (!matchesPeriod(row.transaction_date, period, now)) return false;
    if (filters.dateFrom && row.transaction_date < filters.dateFrom) return false;
    if (filters.dateTo && row.transaction_date > filters.dateTo) return false;
    if (!query) return true;
    return [row.counterparty_name, row.description, row.reference_no, row.memo]
      .some((value) => safeTrim(value).toLowerCase().includes(query));
  });
}

export function sortAccountingTransactions(rows = []) {
  return safeRows(rows).sort((left, right) => {
    const dateDifference = safeTrim(right.transaction_date).localeCompare(safeTrim(left.transaction_date));
    if (dateDifference) return dateDifference;
    const createdDifference = toTimestamp(right.created_at) - toTimestamp(left.created_at);
    if (createdDifference) return createdDifference;
    return safeTrim(right.id).localeCompare(safeTrim(left.id));
  });
}

export function calculateAccountingSummary(rows = [], now = new Date()) {
  const normalizedRows = safeRows(rows);
  const today = localDateKey(now);
  const monthKey = today.slice(0, 7);
  const incomeRows = normalizedRows.filter((row) => row.direction === "income");
  const expenseRows = normalizedRows.filter((row) => row.direction === "expense");
  const totalIncome = sumAmounts(incomeRows);
  const totalExpense = sumAmounts(expenseRows);
  const todayIncome = sumAmounts(incomeRows.filter((row) => row.transaction_date === today));
  const todayExpense = sumAmounts(expenseRows.filter((row) => row.transaction_date === today));
  const monthIncome = sumAmounts(incomeRows.filter((row) => row.transaction_date?.slice(0, 7) === monthKey));
  const monthExpense = sumAmounts(expenseRows.filter((row) => row.transaction_date?.slice(0, 7) === monthKey));

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: normalizedRows.length,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,
    averageIncome: incomeRows.length ? totalIncome / incomeRows.length : 0,
    averageExpense: expenseRows.length ? totalExpense / expenseRows.length : 0,
    todayIncome,
    todayExpense,
    monthIncome,
    monthExpense,
    currentBalance: totalIncome - totalExpense,
  };
}

export function calculateRunningBalance(rows = [], openingBalance = 0) {
  let balance = normalizeFiniteNumber(openingBalance);
  return safeRows(rows)
    .sort(compareAscending)
    .map((row) => {
      balance += row.direction === "expense" ? -row.amount : row.amount;
      return { ...row, runningBalance: balance };
    });
}

export function groupTransactionsByDate(rows = []) {
  return safeRows(rows).reduce((groups, row) => {
    if (!row.transaction_date) return groups;
    if (!groups[row.transaction_date]) groups[row.transaction_date] = [];
    groups[row.transaction_date].push(row);
    return groups;
  }, {});
}

export function getDirectionLabel(value, language = "en") {
  return localizedLabel(DIRECTION_LABELS, value, language);
}

export function getPaymentMethodLabel(value, language = "en") {
  return localizedLabel(PAYMENT_METHOD_LABELS, value, language);
}

export function getTaxCategoryLabel(value, language = "en") {
  return localizedLabel(TAX_CATEGORY_LABELS, value, language);
}

export function getAccountCategoryLabel(value, language = "en") {
  return localizedLabel(ACCOUNT_CATEGORY_LABELS, value, language);
}

export function getSourceTypeLabel(value, language = "en") {
  return localizedLabel(SOURCE_TYPE_LABELS, value, language);
}

export function formatAccountingAmount(value, language = "en") {
  return formatUsdAmount(value, language);
}

export function formatAccountingDate(value, language = "en") {
  if (!isValidDateOnly(value)) return "-";
  return new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function safeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(normalizeAccountingTransaction);
}

function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + normalizeFiniteNumber(row.amount), 0);
}

function normalizeDirection(value) {
  const normalized = safeTrim(value).toLowerCase();
  return ACCOUNTING_DIRECTIONS.includes(normalized) ? normalized : "";
}

function compareAscending(left, right) {
  const dateDifference = safeTrim(left.transaction_date).localeCompare(safeTrim(right.transaction_date));
  if (dateDifference) return dateDifference;
  const createdDifference = toTimestamp(left.created_at) - toTimestamp(right.created_at);
  if (createdDifference) return createdDifference;
  return safeTrim(left.id).localeCompare(safeTrim(right.id));
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isValidDateOnly(value) {
  const normalized = safeTrim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const date = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized;
}

function hasProjectId(value) {
  const projectId = safeTrim(value);
  return Boolean(projectId && !projectId.startsWith("local-"));
}

function localizedLabel(labels, value, language) {
  const pair = labels[value];
  if (!pair) return safeTrim(value) || "-";
  return pair[language === "kr" ? 1 : 0];
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function matchesPeriod(value, period, now) {
  if (period === "all") return true;
  if (!isValidDateOnly(value)) return false;
  const today = localDateKey(now);
  if (period === "today") return value === today;
  if (period === "this_month") return value.slice(0, 7) === today.slice(0, 7);
  if (period === "this_year") return value.slice(0, 4) === today.slice(0, 4);
  if (period === "this_week") {
    const current = new Date(`${today}T00:00:00`);
    const day = current.getDay();
    const start = new Date(current);
    start.setDate(current.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return value >= localDateKey(start) && value <= localDateKey(end);
  }
  return true;
}
