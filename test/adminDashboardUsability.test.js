import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { translations } from "../src/i18n/translations.js";
import {
  buildDashboardAlertDetailRows,
  buildDashboardAlertReason,
  getTodayScheduleAlerts,
  getUnreadDashboardAlerts,
  getPaymentAlerts,
} from "../src/services/adminDashboardModel.js";

const paymentSummaries = {
  jose: {
    plan: {
      contractor_id: "jose",
      currency: "USD",
      id: "plan-jose",
      unit: { unit_code: "A-0501" },
    },
    items: [
      { due_date: "2026-08-15", paid_amount: 250, required_amount: 1000, step_no: 1, title: "Booking Fee" },
      { paid_amount: 0, required_amount: 500, step_no: 2, title: "Deposit" },
    ],
  },
};

describe("Admin Dashboard usability", () => {
  it("builds payment alert details from the actual payment plan", () => {
    const [alert] = getPaymentAlerts(paymentSummaries, [{ full_name: "Jose Costa", id: "jose" }]);
    assert.equal(alert.alertType, "outstanding");
    assert.equal(alert.customerName, "Jose Costa");
    assert.equal(alert.unitCode, "A-0501");
    assert.equal(alert.planRequiredAmount, 1500);
    assert.equal(alert.planPaidAmount, 250);
    assert.equal(alert.unpaidSteps, 2);
    assert.match(buildDashboardAlertReason(alert, "en"), /outstanding unpaid balance/);
    assert.match(buildDashboardAlertReason(alert, "kr"), /미납 금액/);
    assert.deepEqual(buildDashboardAlertDetailRows(alert, "en").slice(0, 4).map((row) => row.value), [1500, 250, 1250, 2]);
  });

  it("provides safe reasons and detail fallbacks for supported alert types", () => {
    assert.match(buildDashboardAlertReason({ alertType: "document" }, "en"), /no uploaded documents/);
    assert.match(buildDashboardAlertReason({ alertType: "unit_assignment" }, "kr"), /배정된 세대/);
    assert.match(buildDashboardAlertReason(null, "en"), /requires attention/);
    assert.deepEqual(buildDashboardAlertDetailRows({ alertType: "unit_assignment", customerName: "Sarah Lee" }, "en").map((row) => row.value), ["Sarah Lee", "Unassigned"]);
  });

  it("builds concise today schedule alerts and excludes cancelled activities", () => {
    const alerts = getTodayScheduleAlerts({
      now: new Date(2026, 7, 10, 9, 0),
      events: [
        { event_date: "2026-08-10", event_type: "consultation", id: "event-1", start_time: "14:00", status: "scheduled", title: "Office consultation" },
        { event_date: "2026-08-10", event_type: "meeting", id: "event-2", status: "cancelled", title: "Cancelled meeting" },
      ],
      consultations: [{ consultation_date: "2026-08-10T15:00:00+09:00", id: "note-1", lead_id: "lead-1", next_follow_up_date: "2026-08-12" }],
      leads: [{ full_name: "Maria", id: "lead-1" }],
      limit: 5,
    });
    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].sourceType, "schedule");
    assert.equal(alerts[1].sourceType, "consultation");
    assert.equal(getUnreadDashboardAlerts(alerts, [alerts[0].id]).length, 1);
  });

  it("connects alert details, responsive shell state, and bilingual controls", () => {
    const dashboard = readFileSync(new URL("../src/components/admin/AdminDashboard.jsx", import.meta.url), "utf8");
    const shell = readFileSync(new URL("../src/components/admin/AdminShell.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/admin/AdminSidebar.jsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("../src/components/admin/AdminTopbar.jsx", import.meta.url), "utf8");
    const kpi = readFileSync(new URL("../src/components/admin/KpiCard.jsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    for (const key of [
      "Show sidebar",
      "Hide sidebar",
      "Alert details",
      "Why this alert appears",
      "Outstanding balance alert",
      "This alert appears because this customer has an outstanding unpaid balance.",
      "Document alert",
      "Unit assignment alert",
      "Total required",
      "Total paid",
      "Outstanding amount",
      "Unpaid steps",
      "No alert selected.",
      "No notifications.",
    ]) {
      assert.ok(translations.en[key], `Missing EN translation: ${key}`);
      assert.ok(translations.kr[key], `Missing KR translation: ${key}`);
    }
    assert.match(dashboard, /crm-kpi-card--amount/);
    assert.match(dashboard, /aria-expanded=\{expanded\}/);
    assert.match(dashboard, /buildDashboardAlertReason/);
    assert.match(dashboard, /crm-alert-detail/);
    assert.match(shell, /is-sidebar-collapsed/);
    assert.match(shell, /timorcrest_admin_sidebar_collapsed/);
    assert.match(shell, /dashboardAlerts/);
    assert.match(topbar, /Show sidebar/);
    assert.match(topbar, /Hide sidebar/);
    assert.match(topbar, /toggleNotifications/);
    assert.match(topbar, /aria-haspopup="dialog"/);
    assert.match(topbar, /buildDashboardAlertReason/);
    assert.match(topbar, /timorcrest_admin_acknowledged_alerts/);
    assert.match(topbar, /Mark as read/);
    assert.match(topbar, /No new alerts/);
    assert.match(sidebar, /data-label=\{t\(label\)\}/);
    assert.match(kpi, /className = \"\"/);
    assert.match(styles, /--crm-sidebar-collapsed-width/);
    assert.match(styles, /overflow-x: hidden/);
    assert.match(styles, /sidebar__link/);
    assert.match(styles, /notification/);
    assert.match(styles, /\.crm-shell\.is-sidebar-collapsed/);
    assert.match(styles, /\.crm-kpi-card--amount/);
    assert.match(styles, /\.crm-alert-detail/);
  });
});
