import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildUnitInventoryRows,
  calculateUnitKpis,
  filterUnitInventory,
  getUnitFilterOptions,
  getUnitFloor,
  getUnitStatus,
} from "../src/services/adminUnitsModel.js";
import { translations } from "../src/i18n/translations.js";

const units = [
  { created_at: "2026-06-01T00:00:00Z", id: "available", property_type: "2 Bedroom", status: "active", total_price: 135000, unit_code: "A-0501" },
  { created_at: "2026-05-30T00:00:00Z", id: "reserved", property_type: "1 Bedroom", status: "reserved", total_price: 98000, unit_code: "A-0502" },
  { created_at: "2026-05-29T00:00:00Z", id: "assigned", property_type: "2 Bedroom", status: "active", total_price: 135000, unit_code: "B-1203" },
  { created_at: "2026-05-28T00:00:00Z", id: "hold", property_type: "Studio", status: "hold", total_price: 65000, unit_code: "C-0101" },
  { created_at: "2026-05-27T00:00:00Z", id: "unknown", property_type: "Penthouse", status: "legacy_state", total_price: 0, unit_code: "C-99" },
];

const contractors = [
  { email: "sarah@example.com", full_name: "Sarah Lee", id: "sarah", status: "active", unit_id: "reserved" },
  { email: "jose@example.com", full_name: "Jose Costa", id: "jose", status: "active", unit_id: "assigned" },
  { email: "old@example.com", full_name: "Old Buyer", id: "old", status: "archived", unit_id: "available" },
];

const paymentSummaries = {
  jose: {
    items: [{ paid_amount: 25000, required_amount: 100000 }],
    plan: { currency: "USD", total_price: 135000 },
    totals: { totalPaidAmount: 25000, totalRequiredAmount: 100000 },
  },
};

describe("Admin Units CRM model", () => {
  it("calculates inventory KPIs from status and active contractor assignments", () => {
    assert.deepEqual(calculateUnitKpis(units, contractors), {
      assignedUnits: 1,
      availableUnits: 1,
      holdUnits: 1,
      reservedUnits: 1,
      totalUnits: 5,
    });
    assert.deepEqual(calculateUnitKpis(null, null, null), {
      assignedUnits: 0,
      availableUnits: 0,
      holdUnits: 0,
      reservedUnits: 0,
      totalUnits: 0,
    });
  });

  it("derives safe building and floor values only from recognizable unit codes", () => {
    assert.equal(getUnitFloor({ unit_code: "A-0501" }), "5");
    assert.equal(getUnitFloor({ unit_code: "C-99" }), "");
    assert.equal(getUnitStatus({ status: "active" }).key, "available");
    assert.equal(getUnitStatus({ status: "active" }, { id: "buyer" }).key, "assigned");
    assert.equal(getUnitStatus({ status: "blocked" }).key, "hold");
  });

  it("filters unit code, buyer identity, status, and assignment safely", () => {
    assert.deepEqual(filterUnitInventory(units, contractors, paymentSummaries, { query: "b-1203" }).map((row) => row.id), ["assigned"]);
    assert.deepEqual(filterUnitInventory(units, contractors, paymentSummaries, { query: "sarah@example.com" }).map((row) => row.id), ["reserved"]);
    assert.deepEqual(filterUnitInventory(units, contractors, paymentSummaries, { status: "available" }).map((row) => row.id), ["available"]);
    assert.deepEqual(filterUnitInventory(units, contractors, paymentSummaries, { assigned: "unassigned" }).map((row) => row.id), ["available", "hold", "unknown"]);
    assert.deepEqual(getUnitFilterOptions(units, contractors).buildings, ["A", "B", "C"]);
  });

  it("keeps payment zero values and computes unpaid from required minus paid", () => {
    const rows = buildUnitInventoryRows(units, contractors, paymentSummaries);
    const assigned = rows.find((row) => row.id === "assigned");
    const available = rows.find((row) => row.id === "available");

    assert.deepEqual(assigned.payment, { currency: "USD", hasData: true, totalPaid: 25000, totalRequired: 100000, unpaid: 75000 });
    assert.deepEqual(available.payment, { currency: "USD", hasData: false, totalPaid: 0, totalRequired: 0, unpaid: 0 });
  });

  it("provides the Units CRM labels in both languages", () => {
    for (const key of ["Units", "New Unit", "Unit Inventory", "Unit Code", "Buyer", "Inventory Summary", "Unit Map", "No units found.", "Delete Unit"]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
  });

  it("keeps the route connected to the existing unit form handlers", () => {
    const pageSource = readFileSync(new URL("../src/components/admin/UnitsPage.jsx", import.meta.url), "utf8");
    const layoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const serviceSource = readFileSync(new URL("../src/services/contractorService.js", import.meta.url), "utf8");
    assert.match(layoutSource, /<Route path="units" element={<UnitsInventoryPage \{\.\.\.shell\} \/>} \/>/);
    assert.match(layoutSource, /deleteUnitRecord/);
    assert.match(serviceSource, /export async function deleteUnit\(/);
    assert.match(serviceSource, /from\("units"\)\.delete\(\)/);
    assert.match(pageSource, /submitUnit/);
    assert.match(pageSource, /resetUnitForm/);
    assert.match(pageSource, /<UnitMap/);
    assert.doesNotMatch(pageSource, /unit_name/);
  });
});
