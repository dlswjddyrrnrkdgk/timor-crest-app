import { useMemo, useState } from "react";
import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import DeleteConfirmModal from "./DeleteConfirmModal.jsx";
import SearchStatsDetailPanel from "./SearchStatsDetailPanel.jsx";
import SearchStatsImportModal from "./SearchStatsImportModal.jsx";
import SearchStatsModal from "./SearchStatsModal.jsx";
import {
  bulkCreateSearchPerformanceSnapshots,
  createSearchPerformanceSnapshot,
  deleteSearchPerformanceSnapshot,
  updateSearchPerformanceSnapshot,
} from "../../../services/adminCustomerManagementService.js";
import {
  calculateSearchStats,
  filterSearchPerformanceSnapshots,
  formatInteger,
  formatPercent,
  formatPosition,
  formatSearchPerformanceDate,
  getSearchSourceLabel,
  getTopPages,
  getTopSearchQueries,
  SEARCH_DATE_RANGE_OPTIONS,
  SEARCH_SOURCE_OPTIONS,
  sortSearchPerformanceSnapshots,
  buildSearchTrendData,
} from "../../../services/adminCustomerManagementSearchStatsModel.js";

export default function SearchStatsManagementPanel({ language, onRefresh, projectId, rows, t }) {
  const [filters, setFilters] = useState({ query: "", source: "all", dateRange: "all" });
  const [selectedId, setSelectedId] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutation, setMutation] = useState({ state: "idle", error: "" });
  const [feedback, setFeedback] = useState("");
  const values = Array.isArray(rows) ? rows : [];
  const filteredRows = useMemo(() => sortSearchPerformanceSnapshots(filterSearchPerformanceSnapshots(values, filters)), [filters, values]);
  const stats = useMemo(() => calculateSearchStats(filteredRows), [filteredRows]);
  const topQueries = useMemo(() => getTopSearchQueries(filteredRows, 5), [filteredRows]);
  const topPages = useMemo(() => getTopPages(filteredRows, 5), [filteredRows]);
  const trends = useMemo(() => buildSearchTrendData(filteredRows, 30), [filteredRows]);
  const selectedRecord = values.find((row) => row.id === selectedId) || null;
  const hasFilters = Boolean(filters.query || filters.source !== "all" || filters.dateRange !== "all");

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({ query: "", source: "all", dateRange: "all" });
  }

  async function saveSearchData(form) {
    setMutation({ state: "saving", error: "" });
    const result = modal?.record ? await updateSearchPerformanceSnapshot(modal.record.id, form, projectId) : await createSearchPerformanceSnapshot(form, projectId);
    if (result.error) {
      setMutation({ state: "error", error: result.error });
      return result;
    }
    await onRefresh();
    setSelectedId(result.data?.id || modal?.record?.id || "");
    setMutation({ state: "idle", error: "" });
    setModal(null);
    setFeedback(t("Search data saved successfully."));
    return result;
  }

  async function importSearchData(payloads) {
    setMutation({ state: "importing", error: "" });
    const result = await bulkCreateSearchPerformanceSnapshots(payloads, projectId);
    if (result.error) {
      setMutation({ state: "error", error: result.error });
      return result;
    }
    await onRefresh();
    setMutation({ state: "idle", error: "" });
    setModal(null);
    setFeedback(t("Import completed successfully."));
    return result;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setMutation({ state: "deleting", error: "" });
    const result = await deleteSearchPerformanceSnapshot(deleteTarget.id, projectId);
    if (result.error) {
      setMutation({ state: "error", error: result.error });
      return;
    }
    await onRefresh();
    if (selectedId === deleteTarget.id) setSelectedId("");
    setDeleteTarget(null);
    setMutation({ state: "idle", error: "" });
    setFeedback(t("Search data deleted successfully."));
  }

  return <article className="crm-card crm-customer-management__panel crm-cm-search-stats">
    <header className="crm-card__header crm-customer-management__panel-header crm-cm-search-stats__header"><span className="crm-customer-management__panel-title"><span className="crm-customer-management__panel-icon"><AdminIcon name="trend" size={16} /></span><h2>{t("Statistics Management")}</h2></span><div className="crm-cm-search-stats__actions"><button aria-label={t("Import Data")} className="secondary-button" onClick={() => { setFeedback(""); setModal({ type: "import" }); }} type="button"><AdminIcon name="upload" size={14} />{t("Import Data")}</button><button aria-label={t("Add Search Data")} className="crm-customers__primary-action" onClick={() => { setFeedback(""); setModal({ type: "record", record: null }); }} type="button"><AdminIcon name="plus" size={14} />{t("Add Search Data")}</button></div></header>
    <div className="crm-customer-management__panel-body">
      {feedback ? <p className="crm-cm-schedule-feedback" role="status">{feedback}</p> : null}
      {mutation.error ? <p className="crm-customer-management__message" role="alert">{mutation.error}</p> : null}
      <div className="crm-cm-search-stats__summary">{[
        [t("Impressions"), formatInteger(stats.impressions, language), "blue"],
        [t("Clicks"), formatInteger(stats.clicks, language), "success"],
        [t("CTR"), formatPercent(stats.ctr, language), "purple"],
        [t("Average Position"), formatPosition(stats.averagePosition, language) || t("Not available"), "warning"],
        [t("Queries"), formatInteger(stats.queryCount, language), "neutral"],
        [t("Pages"), formatInteger(stats.pageCount, language), "neutral"],
      ].map(([label, value, tone]) => <div className={`crm-cm-search-stats__metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="crm-cm-filters crm-cm-search-stats__filters"><label className="crm-cm-search"><AdminIcon name="search" size={15} /><input aria-label={t("Search search performance")} onChange={(event) => updateFilter("query", event.target.value)} placeholder={t("Search search performance")} type="search" value={filters.query} /></label><label className="crm-cm-filter"><span>{t("Source")}</span><select aria-label={t("Source")} onChange={(event) => updateFilter("source", event.target.value)} value={filters.source}><option value="all">{t("All Sources")}</option>{SEARCH_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{getSearchSourceLabel(source, language)}</option>)}</select></label><label className="crm-cm-filter"><span>{t("Date Range")}</span><select aria-label={t("Date Range")} onChange={(event) => updateFilter("dateRange", event.target.value)} value={filters.dateRange}>{SEARCH_DATE_RANGE_OPTIONS.map((range) => <option key={range} value={range}>{dateRangeLabel(range, t)}</option>)}</select></label><button aria-label={t("Clear filters")} className="crm-cm-filter-clear" onClick={clearFilters} type="button">{t("Clear filters")}</button></div>
      <div className="crm-cm-search-stats__workspace"><div className="crm-cm-search-stats__list"><div className="crm-cm-search-stats__list-heading"><div><span className="crm-eyebrow">{t("Search Performance")}</span><h3>{formatInteger(filteredRows.length, language)} {t("Records")}</h3></div><StatusBadge tone="info">{hasFilters ? t("Filtered") : t("All Time")}</StatusBadge></div>{filteredRows.length ? <><div className="crm-customer-management__table-wrap crm-cm-search-stats__table"><table><thead><tr>{[t("Report Date"), t("Query"), t("Page URL"), t("Clicks"), t("Impressions"), t("CTR"), t("Average Position"), t("Source"), t("Actions")].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{filteredRows.map((record) => <SearchStatsRow key={record.id} language={language} onDelete={() => setDeleteTarget(record)} onEdit={() => setModal({ type: "record", record })} onSelect={() => setSelectedId(record.id)} record={record} selected={record.id === selectedId} t={t} />)}</tbody></table></div><div className="crm-cm-search-stats__mobile-list">{filteredRows.map((record) => <SearchStatsMobileRow key={`mobile-${record.id}`} language={language} onDelete={() => setDeleteTarget(record)} onEdit={() => setModal({ type: "record", record })} onSelect={() => setSelectedId(record.id)} record={record} selected={record.id === selectedId} t={t} />)}</div></> : <EmptyState>{hasFilters ? t("No matching search performance data.") : t("No search performance data yet.")}</EmptyState>}</div><SearchStatsDetailPanel language={language} onDelete={setDeleteTarget} onEdit={(record) => setModal({ type: "record", record })} record={selectedRecord} t={t} /></div>
      <div className="crm-cm-search-stats__insights"><TrendCard title={t("Impressions Trend")} points={trends} valueKey="impressions" heightKey="impressionsHeight" tone="blue" t={t} /><TrendCard title={t("Clicks Trend")} points={trends} valueKey="clicks" heightKey="clicksHeight" tone="success" t={t} /><InsightList label={t("Top Search Queries")} rows={topQueries} valueKey="query" language={language} t={t} /><InsightList label={t("Top Pages")} rows={topPages} valueKey="page_url" language={language} t={t} /></div>
      <p className="crm-customer-management__manual-note">{t("Manual data only")} · {t("Google Search Console integration is not connected yet.")}</p>
    </div>
    {modal?.type === "record" ? <SearchStatsModal language={language} onClose={() => setModal(null)} onSave={saveSearchData} record={modal.record} saving={mutation.state === "saving"} t={t} /> : null}
    {modal?.type === "import" ? <SearchStatsImportModal onClose={() => setModal(null)} onConfirm={importSearchData} saving={mutation.state === "importing"} t={t} /> : null}
    {deleteTarget ? <DeleteConfirmModal busy={mutation.state === "deleting"} closeLabel={t("Cancel")} error={mutation.error} message={t("Delete this search performance record?")} onClose={() => { setDeleteTarget(null); setMutation({ state: "idle", error: "" }); }} onConfirm={confirmDelete} title={t("Delete Search Data")} titleId="crm-search-stats-delete-title" warning={t("This action cannot be undone.")} /> : null}
  </article>;
}

function SearchStatsRow({ language, onDelete, onEdit, onSelect, record, selected, t }) {
  return <tr aria-selected={selected} className={selected ? "is-selected" : ""} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}><td>{formatSearchPerformanceDate(record.report_date, language) || t("Not available")}</td><td><strong>{record.query || t("Unknown query")}</strong><small>{record.memo || ""}</small></td><td className="crm-cm-search-stats__url">{record.page_url || t("Unknown page")}</td><td>{formatInteger(record.clicks, language)}</td><td>{formatInteger(record.impressions, language)}</td><td>{formatPercent(record.ctr, language)}</td><td>{formatPosition(record.average_position, language) || "—"}</td><td>{getSearchSourceLabel(record.source, language)}</td><td><span className="crm-cm-row-actions"><button aria-label={`${t("Edit")} ${record.query || t("Unknown query")}`} className="crm-cm-row-action" onClick={(event) => { event.stopPropagation(); onEdit(); }} type="button"><AdminIcon name="edit" size={13} /></button><button aria-label={`${t("Delete")} ${record.query || t("Unknown query")}`} className="crm-cm-row-action crm-cm-row-action--danger" onClick={(event) => { event.stopPropagation(); onDelete(); }} type="button"><AdminIcon name="trash" size={13} /></button></span></td></tr>;
}

function SearchStatsMobileRow({ language, onDelete, onEdit, onSelect, record, selected, t }) {
  return <article aria-selected={selected} className={`crm-cm-search-stats__mobile-row${selected ? " is-selected" : ""}`} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}><div><span className="crm-eyebrow">{formatSearchPerformanceDate(record.report_date, language) || t("Not available")}</span><strong>{record.query || t("Unknown query")}</strong><small>{record.page_url || t("Unknown page")}</small><span>{t("Clicks")}: {formatInteger(record.clicks, language)} · {t("Impressions")}: {formatInteger(record.impressions, language)} · {formatPercent(record.ctr, language)}</span></div><div className="crm-cm-row-actions"><button aria-label={t("Edit")} className="crm-cm-row-action" onClick={(event) => { event.stopPropagation(); onEdit(); }} type="button"><AdminIcon name="edit" size={13} /></button><button aria-label={t("Delete")} className="crm-cm-row-action crm-cm-row-action--danger" onClick={(event) => { event.stopPropagation(); onDelete(); }} type="button"><AdminIcon name="trash" size={13} /></button></div></article>;
}

function TrendCard({ heightKey, points, title, tone, t, valueKey }) {
  return <section className="crm-cm-search-stats__insight-card"><h3>{title}</h3>{points.length ? <div className="crm-cm-search-stats__trend" aria-label={title}>{points.map((point) => <span className={`is-${tone}`} key={`${title}-${point.date}`} style={{ "--bar-height": `${point[heightKey]}%` }} title={`${point.date}: ${point[valueKey]}`} />)}</div> : <p className="crm-cm-search-stats__empty-insight">{t("No search performance data yet.")}</p>}</section>;
}

function InsightList({ label, language, rows, t, valueKey }) {
  return <section className="crm-cm-search-stats__insight-card"><h3>{label}</h3>{rows.length ? <ol className="crm-cm-search-stats__ranked-list">{rows.map((row, index) => <li key={`${valueKey}-${row[valueKey] || "unknown"}`}><span>{index + 1}. {row[valueKey] || (valueKey === "query" ? t("Unknown query") : t("Unknown page"))}</span><strong>{formatInteger(row.impressions, language)}</strong></li>)}</ol> : <p className="crm-cm-search-stats__empty-insight">{t("No search performance data yet.")}</p>}</section>;
}

function dateRangeLabel(value, t) {
  const labels = { all: t("All Time"), last_7_days: t("Last 7 days"), last_30_days: t("Last 30 days"), this_month: t("This Month"), this_year: t("This Year") };
  return labels[value] || value;
}
