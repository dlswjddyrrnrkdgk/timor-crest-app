import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchPerformanceBulkPayloads,
  buildSearchPerformancePayload,
  buildSearchTrendData,
  calculateCtr,
  calculateSearchStats,
  filterByDateRange,
  filterSearchPerformanceSnapshots,
  getTopPages,
  getTopSearchQueries,
  parseSearchPerformanceImportText,
  sortSearchPerformanceSnapshots,
  validateSearchPerformanceForm,
} from "../src/services/adminCustomerManagementSearchStatsModel.js";

test("search stats payload preserves zero values and calculates ctr", () => {
  const payload = buildSearchPerformancePayload({ report_date: "2026-08-10", query: "timor crest", clicks: "0", impressions: "0", ctr: "", average_position: "0", source: "manual", page_url: "", memo: "" });
  assert.equal(payload.clicks, 0);
  assert.equal(payload.impressions, 0);
  assert.equal(payload.ctr, 0);
  assert.equal(payload.average_position, 0);
  assert.equal(payload.page_url, null);
});

test("search stats validation catches required and unsafe metrics", () => {
  assert.equal(validateSearchPerformanceForm({ report_date: "", clicks: "", impressions: "" }).valid, false);
  assert.deepEqual(validateSearchPerformanceForm({ report_date: "2026-08-10", clicks: "12", impressions: "10", page_url: "bad-url" }).errors, ["clicks_greater_than_impressions", "page_url"]);
  assert.equal(calculateCtr(12, 300, null), 4);
});

test("search stats filtering and sorting use query fields and date ranges", () => {
  const rows = [
    { id: "old", report_date: "2026-07-01", query: "old", page_url: "/old", clicks: 1, impressions: 10, source: "manual", created_at: "2026-07-01T01:00:00Z" },
    { id: "new", report_date: "2026-08-10", query: "Timor Crest", page_url: "/home", clicks: 4, impressions: 40, source: "csv_import", memo: "launch", created_at: "2026-08-10T02:00:00Z" },
    { id: "newer", report_date: "2026-08-10", query: "Other", page_url: "/other", clicks: 3, impressions: 50, source: "manual", created_at: "2026-08-10T03:00:00Z" },
  ];
  assert.equal(filterSearchPerformanceSnapshots(rows, { query: "launch", source: "all", dateRange: "all" }).length, 1);
  assert.equal(filterSearchPerformanceSnapshots(rows, { query: "", source: "csv_import", dateRange: "all" })[0].id, "new");
  assert.equal(filterByDateRange(rows, "last_7_days", new Date("2026-08-10T12:00:00"))[0].id, "new");
  assert.deepEqual(sortSearchPerformanceSnapshots(rows).map((row) => row.id), ["newer", "new", "old"]);
});

test("search summaries group unknown values and ignore missing positions", () => {
  const rows = [
    { query: "timor crest", page_url: "/", clicks: 2, impressions: 20, average_position: 5 },
    { query: "timor crest", page_url: "/", clicks: 3, impressions: 30, average_position: 7 },
    { query: null, page_url: null, clicks: 0, impressions: 0, average_position: null },
  ];
  const summary = calculateSearchStats(rows);
  assert.equal(summary.impressions, 50);
  assert.equal(summary.clicks, 5);
  assert.equal(summary.ctr, 10);
  assert.equal(summary.averagePosition, 6);
  assert.equal(summary.queryCount, 1);
  assert.equal(getTopSearchQueries(rows)[0].impressions, 50);
  assert.equal(getTopSearchQueries(rows)[1].query, null);
  assert.equal(getTopPages(rows)[1].page_url, null);
});

test("search trend data groups dates and normalizes zero-safe bar heights", () => {
  const trend = buildSearchTrendData([{ report_date: "2026-08-09", clicks: 0, impressions: 0 }, { report_date: "2026-08-10", clicks: 2, impressions: 10 }]);
  assert.deepEqual(trend.map((point) => point.date), ["2026-08-09", "2026-08-10"]);
  assert.equal(trend[0].impressionsHeight, 0);
  assert.equal(trend[1].impressionsHeight, 100);
});

test("search stats import accepts CSV, TSV aliases, percentages, comma numbers, and row errors", () => {
  const csv = ["Query,Clicks,Impressions,CTR,Position", "timor crest,12,300,4%,8.5", "bad row,10,2,1%,4"].join("\n");
  const parsedCsv = parseSearchPerformanceImportText(csv, { defaultReportDate: "2026-08-10" });
  assert.equal(parsedCsv.validRows.length, 1);
  assert.equal(parsedCsv.errorRows.length, 1);
  assert.equal(parsedCsv.validRows[0].report_date, "2026-08-10");
  assert.equal(parsedCsv.validRows[0].ctr, 4);

  const tsv = "Top queries\tClicks\tImpressions\tCTR\tPosition\nTimor Crest\t1,234\t5,678\t21.73%\t8.2";
  const parsedTsv = parseSearchPerformanceImportText(tsv, { defaultReportDate: "2026-08-10" });
  assert.equal(parsedTsv.validRows[0].clicks, 1234);
  assert.equal(parsedTsv.validRows[0].impressions, 5678);
  assert.equal(parsedTsv.validRows[0].average_position, 8.2);
  assert.equal(buildSearchPerformanceBulkPayloads(parsedTsv.previewRows).length, 1);
});

test("search stats import defaults missing metrics to zero", () => {
  const parsed = parseSearchPerformanceImportText("Query,Position\ntimor crest,8.5", { defaultReportDate: "2026-08-10" });
  assert.equal(parsed.errorRows.length, 0);
  assert.equal(parsed.validRows[0].clicks, 0);
  assert.equal(parsed.validRows[0].impressions, 0);
  assert.equal(parsed.validRows[0].ctr, 0);
  assert.equal(parsed.validRows[0].average_position, 8.5);
});
