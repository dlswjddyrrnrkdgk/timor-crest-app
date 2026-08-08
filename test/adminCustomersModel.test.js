import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  calculateCustomerKpis,
  filterCustomers,
  getCustomerDocuments,
  getCustomerPaymentSnapshot,
  getCustomerStatusTone,
} from "../src/services/adminCustomersModel.js";
import { translations } from "../src/i18n/translations.js";

const customersPageSource = readFileSync(new URL("../src/components/admin/CustomersPage.jsx", import.meta.url), "utf8");
const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

const customers = [
  {
    email: "jose@example.com",
    full_name: "Jose Costa",
    id: "one",
    passport_no: "P-100",
    payment_method: "cash",
    phone: "+670 7712 3456",
    status: "active",
    unit: { unit_code: "B-1203" },
    unit_id: "unit-one",
  },
  {
    email: "sarah@example.com",
    full_name: "Sarah Lee",
    id: "two",
    payment_method: null,
    status: "archived",
    unit_id: null,
  },
  {
    email: "antonio@example.com",
    full_name: "Antonio K.",
    id: "three",
    payment_method: "bank_transfer",
    phone: "+670 7700 0000",
    status: "reserved",
    unit: { unit_code: "C-1502" },
    unit_id: "unit-three",
  },
];

describe("Admin Customers CRM model", () => {
  it("calculates customer KPIs without replacing zero or null values", () => {
    assert.deepEqual(calculateCustomerKpis(customers), {
      activeCustomers: 2,
      assignedUnits: 2,
      totalCustomers: 3,
      unassignedCustomers: 1,
    });
    assert.deepEqual(calculateCustomerKpis(null), {
      activeCustomers: 0,
      assignedUnits: 0,
      totalCustomers: 0,
      unassignedCustomers: 0,
    });
  });

  it("filters customer search fields and CRM filter selections", () => {
    assert.deepEqual(filterCustomers(customers, { query: "b-1203" }).map((customer) => customer.id), ["one"]);
    assert.deepEqual(filterCustomers(customers, { query: "7700" }).map((customer) => customer.id), ["three"]);
    assert.deepEqual(filterCustomers(customers, { status: "reserved" }).map((customer) => customer.id), ["three"]);
    assert.deepEqual(filterCustomers(customers, { unitAssigned: "unassigned" }).map((customer) => customer.id), ["two"]);
    assert.deepEqual(filterCustomers(customers, { paymentMethod: "unset" }).map((customer) => customer.id), ["two"]);
  });

  it("builds a safe payment snapshot when no payment data exists", () => {
    assert.deepEqual(getCustomerPaymentSnapshot({}, "missing"), {
      currency: "USD",
      hasData: false,
      outstanding: 0,
      paymentProgress: 0,
      totalPaid: 0,
      totalRequired: 0,
    });

    assert.deepEqual(getCustomerPaymentSnapshot({ one: { plan: { currency: "USD", total_price: 0 }, items: [] } }, "one"), {
      currency: "USD",
      hasData: true,
      outstanding: 0,
      paymentProgress: 0,
      totalPaid: 0,
      totalRequired: 0,
    });

    assert.deepEqual(getCustomerPaymentSnapshot({ one: {
      items: [{ paid_amount: 25, required_amount: 100 }],
      plan: { currency: "USD", total_price: 1000 },
      totals: { progressPercent: 3, totalPaidAmount: 25, totalRequiredAmount: 100, unpaidAmount: 975 },
    } }, "one"), {
      currency: "USD",
      hasData: true,
      outstanding: 75,
      paymentProgress: 25,
      totalPaid: 25,
      totalRequired: 100,
    });
  });

  it("sorts customer documents and maps statuses to CRM tones", () => {
    const documents = getCustomerDocuments([
      { contractor_id: "one", created_at: "2026-05-01T00:00:00Z", id: "old" },
      { contractor_id: "two", created_at: "2026-05-03T00:00:00Z", id: "other" },
      { contractor_id: "one", created_at: "2026-06-01T00:00:00Z", id: "new" },
    ], "one");

    assert.deepEqual(documents.map((document) => document.id), ["new", "old"]);
    assert.equal(getCustomerStatusTone("active"), "success");
    assert.equal(getCustomerStatusTone("reserved"), "warning");
    assert.equal(getCustomerStatusTone("unknown"), "neutral");
  });

  it("connects the CRM page to the existing admin route and CRUD handlers", () => {
    assert.match(adminLayoutSource, /<Route path="contractors" element={<CustomersPage \{\.\.\.shell\} \/>} \/>/);
    assert.match(customersPageSource, /deleteContractorRecord/);
    assert.match(customersPageSource, /submitContractor/);
    assert.match(customersPageSource, /selectDocumentContractor\(customer\)/);
    assert.match(customersPageSource, /<CustomerDetailPanel/);
    assert.match(customersPageSource, /placeholder={t\("Search customers\.\.\."\)}/);
    assert.match(stylesSource, /\.crm-customers__workspace/);
    assert.match(stylesSource, /\.crm-customers__table/);
  });

  it("provides the Customers CRM labels in both languages", () => {
    for (const key of ["Customers", "New Customer", "Active Customers", "Assigned Units", "Unassigned Customers", "Customer Profile", "Unit Information", "Payment Snapshot", "Documents Snapshot", "No customers found."]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
  });
});
