import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import { getChangedPaymentItemPayloads } from "../src/services/paymentModel.js";
import {
  buildPaymentSummary,
  filterPaymentContractors,
  getPaymentItemStatus,
} from "../src/services/adminPaymentsModel.js";

const contractor = {
  email: "jose@example.com",
  full_name: "Jose Costa",
  id: "jose",
  payment_method: "bank_transfer",
  unit: { currency: "USD", total_price: 245000, unit_code: "B-1203" },
};

describe("Admin Payments CRM model", () => {
  it("calculates required, paid, outstanding, progress, and ratio totals safely", () => {
    assert.deepEqual(buildPaymentSummary({
      contractor,
      items: [
        { paid_amount: 4900, payment_ratio: 2, required_amount: 4900 },
        { paid_amount: 20000, payment_ratio: 10, required_amount: 24500 },
        { paid_amount: 0, payment_ratio: 88, required_amount: 215600 },
      ],
      plan: { currency: "USD", total_price: 245000 },
    }), {
      currency: "USD",
      outstanding: 220100,
      paymentProgress: 10,
      ratioTotal: 100,
      rows: [
        { paid_amount: 4900, payment_ratio: 2, required_amount: 4900 },
        { paid_amount: 20000, payment_ratio: 10, required_amount: 24500 },
        { paid_amount: 0, payment_ratio: 88, required_amount: 215600 },
      ],
      totalContractPrice: 245000,
      totalPaid: 24900,
      totalRequired: 245000,
    });
    assert.equal(buildPaymentSummary({
      plan: { total_price: 0 },
      items: [{ paid_amount: 0, required_amount: 0, payment_ratio: 0 }],
    }).paymentProgress, 0);
  });

  it("maps payment rows to paid, partial, pending, and no amount states", () => {
    assert.equal(getPaymentItemStatus({ paid_amount: 100, required_amount: 100 }).key, "paid");
    assert.equal(getPaymentItemStatus({ paid_amount: 25, required_amount: 100 }).key, "partial");
    assert.equal(getPaymentItemStatus({ paid_amount: 0, required_amount: 100 }).key, "pending");
    assert.equal(getPaymentItemStatus({ paid_amount: 0, required_amount: 0 }).key, "no_amount");
  });

  it("filters customers by name, email, phone, and unit code", () => {
    const customers = [
      contractor,
      { email: "sarah@example.com", full_name: "Sarah Lee", phone: "+670 7777", unit: { unit_code: "A-0501" } },
    ];
    assert.deepEqual(filterPaymentContractors(customers, "jose").map((item) => item.id), ["jose"]);
    assert.deepEqual(filterPaymentContractors(customers, "A-0501").map((item) => item.full_name), ["Sarah Lee"]);
    assert.deepEqual(filterPaymentContractors(customers, "+670").map((item) => item.full_name), ["Sarah Lee"]);
  });

  it("detects zero-to-nonzero and nonzero-to-zero payment edits", () => {
    assert.equal(getChangedPaymentItemPayloads(
      [{ id: "one", payment_ratio: 50, required_amount: 50000, paid_amount: 0 }],
      [{ id: "one", payment_ratio: 0, required_amount: 0, paid_amount: 0 }],
      100000,
    )[0].values.payment_ratio, 0);
    assert.equal(getChangedPaymentItemPayloads(
      [{ id: "one", payment_ratio: 0, required_amount: 0, paid_amount: 0 }],
      [{ id: "one", payment_ratio: 5, required_amount: 5000, paid_amount: 0 }],
      100000,
    )[0].values.payment_ratio, 5);
  });

  it("contains the Payments route, CRM component, and bilingual labels", () => {
    const layoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
    const pageSource = readFileSync(new URL("../src/components/admin/PaymentsPage.jsx", import.meta.url), "utf8");
    for (const key of ["Payments", "Payment Summary", "Payment Schedule", "Outstanding Balance", "Save Changes", "Unsaved changes", "Partially Paid", "No Amount"]) {
      assert.ok(translations.en[key], "Missing EN translation: " + key);
      assert.ok(translations.kr[key], "Missing KR translation: " + key);
    }
    assert.ok(layoutSource.includes('<Route path="payments" element={<PaymentsCrmPage {...shell} />} />'));
    assert.match(pageSource, /crm-payments__save-bar/);
    assert.match(pageSource, /submitPaymentItems/);
    assert.match(pageSource, /submitPaymentMethod/);
    assert.match(pageSource, /updatePaymentDraftItem/);
    assert.match(pageSource, /Payment Schedule/);
    assert.match(pageSource, /useState\(false\)/);
    assert.match(pageSource, /setMethodOpen\(false\)/);
    assert.match(pageSource, /setScheduleOpen\(false\)/);
    assert.match(pageSource, /aria-controls={contentId}/);
  });
});
