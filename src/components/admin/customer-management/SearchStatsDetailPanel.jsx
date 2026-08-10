import AdminIcon from "../AdminIcon.jsx";
import EmptyState from "../EmptyState.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { formatCustomerManagementDateTime } from "../../../services/adminCustomerManagementModel.js";
import { formatInteger, formatPercent, formatPosition, formatSearchPerformanceDate, getSearchSourceLabel } from "../../../services/adminCustomerManagementSearchStatsModel.js";

export default function SearchStatsDetailPanel({ language, onDelete, onEdit, record, t }) {
  if (!record) return <aside className="crm-cm-detail crm-cm-search-stats__detail"><EmptyState>{t("Select a search performance record to view details.")}</EmptyState></aside>;
  const pageUrl = record.page_url || t("Unknown page");
  return <aside className="crm-cm-detail crm-cm-search-stats__detail"><header className="crm-cm-detail__header"><div><span className="crm-eyebrow">{t("Search Performance Details")}</span><h3>{record.query || t("Unknown query")}</h3><p className="crm-cm-search-stats__detail-url">{pageUrl}</p></div><StatusBadge tone="info">{getSearchSourceLabel(record.source, language)}</StatusBadge></header><dl className="crm-cm-detail__rows"><Row label={t("Report Date")} value={formatSearchPerformanceDate(record.report_date, language) || t("Not available")} /><Row label={t("Clicks")} value={formatInteger(record.clicks, language)} /><Row label={t("Impressions")} value={formatInteger(record.impressions, language)} /><Row label={t("CTR")} value={formatPercent(record.ctr, language)} /><Row label={t("Average Position")} value={formatPosition(record.average_position, language) || t("Not available")} /><Row label={t("Source")} value={getSearchSourceLabel(record.source, language)} /><Row label={t("Created At")} value={formatCustomerManagementDateTime(record.created_at, language) || t("Not available")} /><Row label={t("Updated At")} value={formatCustomerManagementDateTime(record.updated_at, language) || t("Not available")} /></dl>{record.memo ? <div className="crm-cm-detail__text"><strong>{t("Memo")}</strong><p>{record.memo}</p></div> : null}<div className="crm-cm-detail__actions"><button className="crm-customers__primary-action" onClick={() => onEdit(record)} type="button"><AdminIcon name="edit" size={14} />{t("Edit")}</button><button className="crm-cm-row-action crm-cm-row-action--danger" onClick={() => onDelete(record)} type="button"><AdminIcon name="trash" size={14} />{t("Delete")}</button>{/^https?:\/\//i.test(record.page_url || "") ? <a className="crm-cm-row-action" href={record.page_url} rel="noreferrer" target="_blank">{t("Open")}</a> : null}</div></aside>;
}

function Row({ label, value }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
