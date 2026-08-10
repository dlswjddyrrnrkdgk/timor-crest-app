import { useEffect, useMemo, useState } from "react";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import AdminIcon from "./AdminIcon.jsx";
import StatusBadge from "./StatusBadge.jsx";
import {
  buildUnitInventoryRows,
  calculateUnitKpis,
  filterUnitInventory,
  getUnitFilterOptions,
} from "../../services/adminUnitsModel.js";
import { clampPage, getPaginationWindow } from "../../services/adminListModel.js";
import { formatCurrencyAmount } from "../../services/formatters.js";

const PAGE_SIZE = 10;
const STATUS_FILTERS = ["available", "assigned", "reserved", "hold", "unknown"];

export default function UnitsPage({
  contractors,
  deleteUnitRecord,
  editUnit,
  paymentSummaries,
  resetUnitForm,
  selectedUnit,
  selectedUnitId,
  sortedUnits,
  status,
  submitUnit,
  t,
  unitForm,
  updateUnitField,
}) {
  const [filters, setFilters] = useState({ assigned: "all", building: "all", floor: "all", query: "", status: "all", type: "all" });
  const [formOpen, setFormOpen] = useState(Boolean(selectedUnit));
  const [page, setPage] = useState(1);
  const [selectedInventoryId, setSelectedInventoryId] = useState(selectedUnitId || "");
  const allRows = useMemo(() => buildUnitInventoryRows(sortedUnits, contractors, paymentSummaries), [contractors, paymentSummaries, sortedUnits]);
  const filteredRows = useMemo(() => filterUnitInventory(sortedUnits, contractors, paymentSummaries, filters), [contractors, filters, paymentSummaries, sortedUnits]);
  const filterOptions = useMemo(() => getUnitFilterOptions(sortedUnits, contractors, paymentSummaries), [contractors, paymentSummaries, sortedUnits]);
  const kpis = useMemo(() => calculateUnitKpis(sortedUnits, contractors, paymentSummaries), [contractors, paymentSummaries, sortedUnits]);
  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedInventoryId) || allRows.find((row) => row.id === selectedInventoryId) || null,
    [allRows, filteredRows, selectedInventoryId],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginationPages = getPaginationWindow(page, pageCount, 5);
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => clampPage(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (selectedUnitId) {
      setSelectedInventoryId(selectedUnitId);
      setFormOpen(true);
    }
  }, [selectedUnitId]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ assigned: "all", building: "all", floor: "all", query: "", status: "all", type: "all" });
    setPage(1);
  }

  function handleNewUnit() {
    resetUnitForm();
    setSelectedInventoryId("");
    setFormOpen(true);
  }

  function handleEdit(row) {
    setSelectedInventoryId(row.id);
    editUnit(row.raw);
    setFormOpen(true);
  }

  function handleCloseForm() {
    resetUnitForm();
    setFormOpen(false);
  }

  async function handleDelete(row) {
    await deleteUnitRecord(row.raw);
    if (selectedInventoryId === row.id) setSelectedInventoryId("");
  }

  const pageStart = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredRows.length);
  const firstPaginationPage = paginationPages[0] || 1;
  const lastPaginationPage = paginationPages[paginationPages.length - 1] || pageCount;

  return (
    <div className="crm-units">
      <header className="crm-units__header">
        <div>
          <span className="crm-eyebrow">TIMOR CREST CRM</span>
          <h1>{t("Units")}</h1>
          <p>{t("Manage unit inventory, availability, and assigned buyers.")}</p>
        </div>
        <button className="crm-units__primary-action" onClick={handleNewUnit} type="button">
          <AdminIcon name="building" size={17} />
          {t("New Unit")}
        </button>
      </header>

      <section aria-label={t("Unit Inventory")} className="crm-units__kpis">
        <KpiCard helper={t("100% of inventory")} icon="building" label={t("Total Units")} tone="blue" value={kpis.totalUnits.toLocaleString()} />
        <KpiCard helper={formatShare(kpis.availableUnits, kpis.totalUnits, t)} icon="journey" label={t("Available Units")} tone="success" value={kpis.availableUnits.toLocaleString()} />
        <KpiCard helper={formatShare(kpis.assignedUnits, kpis.totalUnits, t)} icon="customers" label={t("Assigned Units")} tone="blue" value={kpis.assignedUnits.toLocaleString()} />
        <KpiCard helper={formatShare(kpis.reservedUnits, kpis.totalUnits, t)} icon="calendar" label={t("Reserved")} tone="warning" value={kpis.reservedUnits.toLocaleString()} />
        <KpiCard helper={formatShare(kpis.holdUnits, kpis.totalUnits, t)} icon="settings" label={t("Hold")} tone="danger" value={kpis.holdUnits.toLocaleString()} />
      </section>

      <section className="crm-card crm-units__filters-card">
        <label className="crm-units__search">
          <AdminIcon name="search" size={17} />
          <input aria-label={t("Search units...")} onChange={(event) => updateFilter("query", event.target.value)} placeholder={t("Search units...")} type="search" value={filters.query} />
        </label>
        <UnitFilterSelect label={t("Building")} onChange={(value) => updateFilter("building", value)} options={filterOptions.buildings} placeholder={t("All Buildings")} value={filters.building} />
        <UnitFilterSelect label={t("Floor")} onChange={(value) => updateFilter("floor", value)} options={filterOptions.floors} placeholder={t("All Floors")} value={filters.floor} />
        <UnitFilterSelect label={t("Type")} onChange={(value) => updateFilter("type", value)} options={filterOptions.types} placeholder={t("All Types")} value={filters.type} />
        <UnitFilterSelect label={t("Status")} onChange={(value) => updateFilter("status", value)} formatOption={(value) => formatStatus(value, t)} options={STATUS_FILTERS} placeholder={t("All Statuses")} value={filters.status} />
        <UnitFilterSelect label={t("Buyer")} onChange={(value) => updateFilter("assigned", value)} formatOption={(value) => formatAssigned(value, t)} options={["assigned", "unassigned"]} placeholder={t("All")} value={filters.assigned} />
        <button className="crm-units__clear-button" onClick={clearFilters} type="button">{t("Clear filters")}</button>
      </section>

      {formOpen ? (
        <UnitForm
          onClose={handleCloseForm}
          onSubmit={submitUnit}
          selectedUnit={selectedUnit}
          status={status}
          t={t}
          unitForm={unitForm}
          updateUnitField={updateUnitField}
        />
      ) : null}

      <section className="crm-units__workspace">
        <section className="crm-card crm-units__table-card">
          <header className="crm-units__section-header">
            <div><h2>{t("Unit Inventory")}</h2><span>{t("Showing {count} units", { count: filteredRows.length })}</span></div>
            <button className="crm-units__secondary-action" disabled type="button"><AdminIcon name="upload" size={15} />{t("Export")}</button>
          </header>
          {pageRows.length ? (
            <div className="crm-units__table-wrap">
              <table className="crm-units__table">
                <thead><tr><th>{t("Unit Code")}</th><th>{t("Type")}</th><th>{t("Floor")}</th><th>{t("Status")}</th><th>{t("Buyer")}</th><th>{t("Price")}</th><th>{t("Paid")}</th><th>{t("Unpaid")}</th><th>{t("Actions")}</th></tr></thead>
                <tbody>
                  {pageRows.map((row) => <UnitRow isSelected={row.id === selectedRow?.id} key={row.id} onDelete={handleDelete} onEdit={handleEdit} onSelect={() => setSelectedInventoryId(row.id)} row={row} t={t} />)}
                </tbody>
              </table>
            </div>
          ) : <EmptyState>{t("No units found.")}</EmptyState>}
          <footer className="crm-units__pagination">
            <span>{pageStart ? `${pageStart}-${pageEnd} / ${filteredRows.length}` : t("No units found.")}</span>
            <div>
              <button aria-label={t("Previous pages")} disabled={firstPaginationPage === 1} onClick={() => setPage(firstPaginationPage - 5)} type="button">‹</button>
              {paginationPages.map((pageNumber) => <button aria-current={pageNumber === page ? "page" : undefined} aria-label={`${t("Page")} ${pageNumber}`} className={pageNumber === page ? "is-active" : ""} key={pageNumber} onClick={() => setPage(pageNumber)} type="button">{pageNumber}</button>)}
              <button aria-label={t("Next pages")} disabled={lastPaginationPage === pageCount} onClick={() => setPage(lastPaginationPage + 1)} type="button">›</button>
            </div>
          </footer>
        </section>

        <aside className="crm-units__aside">
          <InventorySummary kpis={kpis} t={t} />
          <UnitDetail onEdit={handleEdit} row={selectedRow} t={t} />
        </aside>
      </section>
    </div>
  );
}

function UnitForm({ onClose, onSubmit, selectedUnit, status, t, unitForm, updateUnitField }) {
  return (
    <section className="crm-card crm-units__form-card">
      <header className="crm-units__form-header"><div><h2>{selectedUnit ? t("Edit Unit") : t("New Unit")}</h2><p>{selectedUnit ? t("Update unit information.") : t("Create a new unit record.")}</p></div><button aria-label={t("Close")} className="crm-units__icon-button" onClick={onClose} type="button">×</button></header>
      <form className="crm-units__form" onSubmit={onSubmit}>
        <UnitField label={t("Unit Code")} name="unit_code" onChange={updateUnitField} required t={t} value={unitForm.unit_code} />
        <UnitField label={t("Type")} name="property_type" onChange={updateUnitField} t={t} value={unitForm.property_type} />
        <UnitField label={t("Price")} name="total_price" onChange={updateUnitField} t={t} type="number" value={unitForm.total_price} />
        <UnitField label={t("Currency")} name="currency" onChange={updateUnitField} t={t} value={unitForm.currency} />
        <UnitField label={t("Status")} name="status" onChange={updateUnitField} t={t} value={unitForm.status} />
        <div className="crm-units__form-actions"><button className="crm-units__primary-action" disabled={status === "saving"} type="submit">{status === "saving" ? t("Saving...") : selectedUnit ? t("Edit Unit") : t("New Unit")}</button><button className="crm-units__secondary-action" onClick={onClose} type="button">{t("Cancel")}</button></div>
      </form>
    </section>
  );
}

function UnitField({ label, name, onChange, required, t, type = "text", value }) {
  return <label className="field"><span>{label || t(name)}</span><input name={name} onChange={onChange} required={required} type={type} value={value ?? ""} /></label>;
}

function UnitFilterSelect({ formatOption = (value) => value, label, onChange, options, placeholder, value }) {
  return <label className="crm-units__filter"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}><option value="all">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select></label>;
}

function UnitRow({ isSelected, onDelete, onEdit, onSelect, row, t }) {
  return (
    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} tabIndex={0}>
      <td data-label={t("Unit Code")}><strong className="crm-units__unit-code">{row.unitCode || t("Empty")}</strong><small>{row.building ? `${t("Building")} ${row.building}` : ""}</small></td>
      <td data-label={t("Type")}><span className="crm-units__muted-value">{row.type || t("Empty")}</span></td>
      <td data-label={t("Floor")}><span className="crm-units__muted-value">{row.floor || t("Empty")}</span></td>
      <td data-label={t("Status")}><StatusBadge tone={row.status.tone}>{formatStatus(row.status.key, t)}</StatusBadge></td>
      <td data-label={t("Buyer")}><span className="crm-units__buyer"><strong>{row.buyerName || t("Empty")}</strong>{row.buyerEmail ? <small>{row.buyerEmail}</small> : null}</span></td>
      <td data-label={t("Price")}><span className="crm-units__money">{formatMoney(row.price, row.raw.currency)}</span></td>
      <td data-label={t("Paid")}><span className="crm-units__money">{formatPaymentMoney(row.payment, t)}</span></td>
      <td data-label={t("Unpaid")}><span className="crm-units__money">{formatPaymentMoney(row.payment, t, "unpaid")}</span></td>
      <td data-label={t("Actions")}><span className="crm-units__row-actions"><button aria-label={`${t("Edit Unit")} ${row.unitCode}`} onClick={(event) => { event.stopPropagation(); onEdit(row); }} type="button">{t("Edit")}</button><button aria-label={`${t("Delete Unit")} ${row.unitCode}`} onClick={(event) => { event.stopPropagation(); onDelete(row); }} type="button">{t("Delete")}</button></span></td>
    </tr>
  );
}

function InventorySummary({ kpis, t }) {
  const rows = [["available", t("Available Units"), kpis.availableUnits], ["assigned", t("Assigned Units"), kpis.assignedUnits], ["reserved", t("Reserved"), kpis.reservedUnits], ["hold", t("Hold"), kpis.holdUnits]];
  return <section className="crm-card crm-units__summary-card"><header className="crm-units__section-header"><h2>{t("Inventory Summary")}</h2></header><div className="crm-units__summary-list">{rows.map(([key, label, count]) => <div className="crm-units__summary-row" key={key}><span><i className={`is-${key}`} />{label}</span><strong>{count.toLocaleString()}</strong><small>{formatShare(count, kpis.totalUnits, t)}</small></div>)}<div className="crm-units__summary-total"><span>{t("Total Units")}</span><strong>{kpis.totalUnits.toLocaleString()}</strong></div></div></section>;
}

function UnitDetail({ onEdit, row, t }) {
  if (!row) return <section className="crm-card crm-units__detail-card"><EmptyState>{t("No unit selected.")}</EmptyState></section>;
  return <section className="crm-card crm-units__detail-card"><header><div><span className="crm-eyebrow">UNIT DETAIL</span><h2>{row.unitCode || t("Empty")}</h2></div><StatusBadge tone={row.status.tone}>{formatStatus(row.status.key, t)}</StatusBadge></header><dl className="crm-units__detail-grid"><div><dt>{t("Type")}</dt><dd>{row.type || t("Empty")}</dd></div><div><dt>{t("Floor")}</dt><dd>{row.floor || t("Empty")}</dd></div><div><dt>{t("Assigned Contractor")}</dt><dd>{row.buyerName || t("Empty")}</dd></div><div><dt>{t("Price")}</dt><dd>{formatMoney(row.price, row.raw.currency)}</dd></div><div><dt>{t("Paid")}</dt><dd>{formatPaymentMoney(row.payment, t)}</dd></div><div><dt>{t("Unpaid")}</dt><dd>{formatPaymentMoney(row.payment, t, "unpaid")}</dd></div><div><dt>{t("Created At")}</dt><dd>{formatDate(row.raw.created_at)}</dd></div><div><dt>{t("Updated At")}</dt><dd>{formatDate(row.raw.updated_at)}</dd></div></dl><button className="crm-units__primary-action crm-units__detail-action" onClick={() => onEdit(row)} type="button"><AdminIcon name="building" size={15} />{t("Edit Unit")}</button></section>;
}

function formatStatus(value, t) {
  return { available: t("Available"), assigned: t("Assigned"), reserved: t("Reserved"), hold: t("Hold"), unknown: t("Unknown") }[value] || t("Unknown");
}

function formatAssigned(value, t) {
  return { assigned: t("Assigned"), unassigned: t("Unassigned") }[value] || value;
}

function formatShare(value, total, t) {
  if (!total) return `0% ${t("of total")}`;
  return `${((value / total) * 100).toFixed(1)}% ${t("of total")}`;
}

function formatMoney(value, currency = "USD") {
  return formatCurrencyAmount(value, currency, "en");
}

function formatPaymentMoney(payment, t, key = "paid") {
  if (!payment.hasData) return t("Empty");
  return formatMoney(payment[key === "unpaid" ? "unpaid" : "totalPaid"], payment.currency);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
