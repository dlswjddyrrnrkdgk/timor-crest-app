const INACTIVE_CONTRACTOR_STATUSES = new Set(["archived", "deleted"]);

export function buildUnitInventoryRows(units = [], contractors = [], paymentSummaries = {}) {
  const contractorByUnitId = new Map();
  for (const contractor of Array.isArray(contractors) ? contractors : []) {
    if (!contractor?.unit_id || INACTIVE_CONTRACTOR_STATUSES.has(normalizeStatus(contractor.status))) continue;
    if (!contractorByUnitId.has(contractor.unit_id)) contractorByUnitId.set(contractor.unit_id, contractor);
  }

  return (Array.isArray(units) ? units : []).map((unit) => {
    const contractor = contractorByUnitId.get(unit?.id) || null;
    const status = getUnitStatus(unit, contractor);
    return {
      buyerEmail: contractor?.email || "",
      buyerName: contractor?.full_name || (unit?.assignedContractorName && unit.assignedContractorName !== "empty" ? unit.assignedContractorName : ""),
      building: getUnitBuilding(unit),
      floor: getUnitFloor(unit),
      id: unit?.id || "",
      payment: getUnitPaymentSnapshot(paymentSummaries, contractor?.id, unit?.currency),
      price: numberOrZero(unit?.total_price),
      raw: unit,
      status,
      type: getUnitType(unit),
      unitCode: unit?.unit_code || "",
      contractor,
    };
  });
}

export function calculateUnitKpis(units = [], contractors = [], paymentSummaries = {}) {
  const rows = buildUnitInventoryRows(units, contractors, paymentSummaries);
  return {
    totalUnits: rows.length,
    availableUnits: rows.filter((row) => row.status.key === "available").length,
    assignedUnits: rows.filter((row) => row.status.key === "assigned").length,
    reservedUnits: rows.filter((row) => row.status.key === "reserved").length,
    holdUnits: rows.filter((row) => row.status.key === "hold").length,
  };
}

export function filterUnitInventory(units = [], contractors = [], paymentSummaries = {}, filters = {}) {
  const query = normalizeText(filters.query).toLowerCase();
  const status = normalizeStatus(filters.status);
  const building = normalizeText(filters.building).toLowerCase();
  const floor = normalizeText(filters.floor).toLowerCase();
  const type = normalizeText(filters.type).toLowerCase();
  const assigned = normalizeStatus(filters.assigned);

  return buildUnitInventoryRows(units, contractors, paymentSummaries).filter((row) => {
    const searchable = [row.unitCode, row.type, row.floor, row.building, row.buyerName, row.buyerEmail].map(normalizeText).join(" ").toLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (status && status !== "all" && row.status.key !== status) return false;
    if (building && building !== "all" && row.building.toLowerCase() !== building) return false;
    if (floor && floor !== "all" && row.floor.toLowerCase() !== floor) return false;
    if (type && type !== "all" && row.type.toLowerCase() !== type) return false;
    if (assigned === "assigned" && !row.contractor) return false;
    if (assigned === "unassigned" && row.contractor) return false;
    return true;
  });
}

export function getUnitFilterOptions(units = [], contractors = [], paymentSummaries = {}) {
  const rows = buildUnitInventoryRows(units, contractors, paymentSummaries);
  return {
    buildings: uniqueSorted(rows.map((row) => row.building)),
    floors: uniqueSorted(rows.map((row) => row.floor)),
    types: uniqueSorted(rows.map((row) => row.type)),
  };
}

export function getUnitStatus(unit, contractor = null) {
  const rawStatus = normalizeStatus(unit?.status);
  if (["hold", "blocked", "on_hold"].includes(rawStatus)) return { key: "hold", tone: "danger" };
  if (["reserved", "reservation"].includes(rawStatus)) return { key: "reserved", tone: "warning" };
  if (["sold", "contracted", "assigned"].includes(rawStatus) || contractor) return { key: "assigned", tone: "info" };
  if (!["", "available", "active", "vacant"].includes(rawStatus)) return { key: "unknown", tone: "neutral" };
  return { key: "available", tone: "success" };
}

export function getUnitBuilding(unit) {
  const explicitBuilding = normalizeText(unit?.building);
  if (explicitBuilding) return explicitBuilding;
  const match = normalizeText(unit?.unit_code).match(/^([A-Za-z0-9]+)-/);
  return match?.[1] || "";
}

export function getUnitFloor(unit) {
  const explicitFloor = normalizeText(unit?.floor);
  if (explicitFloor) return explicitFloor;
  const match = normalizeText(unit?.unit_code).match(/^[A-Za-z0-9]+-(\d{2})(\d{2})$/);
  return match ? String(Number(match[1])) : "";
}

export function getUnitType(unit) {
  return normalizeText(unit?.property_type ?? unit?.type);
}

export function getUnitPaymentSnapshot(paymentSummaries, contractorId, fallbackCurrency = "USD") {
  const summary = contractorId ? paymentSummaries?.[contractorId] : null;
  const totals = summary?.totals || {};
  const items = Array.isArray(summary?.items) ? summary.items : [];
  const totalRequired = numberOrZero(totals.totalRequiredAmount ?? items.reduce((sum, item) => sum + numberOrZero(item?.required_amount), 0));
  const totalPaid = numberOrZero(totals.totalPaidAmount ?? items.reduce((sum, item) => sum + numberOrZero(item?.paid_amount), 0));
  return {
    currency: summary?.plan?.currency || fallbackCurrency || "USD",
    hasData: Boolean(summary?.plan || items.length),
    totalPaid,
    totalRequired,
    unpaid: Math.max(totalRequired - totalPaid, 0),
  };
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en"));
}

function normalizeStatus(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function numberOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
