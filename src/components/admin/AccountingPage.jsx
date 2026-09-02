import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../../context/ProjectContext.jsx";
import {
  ACCOUNTING_DIRECTIONS,
  ACCOUNTING_PAYMENT_METHODS,
  ACCOUNTING_PERIODS,
  ACCOUNTING_TAX_CATEGORIES,
  buildAccountingTransactionPayload,
  calculateAccountingSummary,
  calculateRunningBalance,
  filterAccountingTransactions,
  formatAccountingAmount,
  formatAccountingDate,
  getAccountCategoryLabel,
  getAccountCategoryOptions,
  getDirectionLabel,
  getPaymentMethodLabel,
  getSourceTypeLabel,
  getTaxCategoryLabel,
  sortAccountingTransactions,
  validateAccountingTransactionForm,
} from "../../services/accountingModel.js";
import {
  createAccountingTransaction,
  deleteAccountingTransaction,
  listAccountingReferenceData,
  listAccountingTransactions,
  updateAccountingTransaction,
} from "../../services/accountingService.js";
import {
  buildExcelTableHtml,
  buildUnitPaymentExportRows,
  buildUnitPaymentExportSummary,
} from "../../services/adminReportsModel.js";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import StatusBadge from "./StatusBadge.jsx";
import CustomerManagementModal from "./customer-management/CustomerManagementModal.jsx";
import DeleteConfirmModal from "./customer-management/DeleteConfirmModal.jsx";

const PERIOD_LABELS = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
};

const VALIDATION_LABELS = {
  project_required: "Project is required.",
  transaction_date_required: "Transaction date is required.",
  direction_invalid: "Select a valid direction.",
  account_category_required: "Account category is required.",
  account_category_invalid: "Select a valid account category.",
  description_required: "Description is required.",
  amount_required: "Amount is required.",
  amount_invalid: "Enter a valid amount.",
  amount_negative: "Amount must be 0 or greater.",
  payment_method_invalid: "Select a valid payment method.",
  tax_category_invalid: "Select a tax category.",
};

export default function AccountingPage({ contractors = [], language = "en", paymentSummaries = {}, t, units = [] }) {
  const { selectedProject, selectedProjectId } = useProject();
  const [transactions, setTransactions] = useState([]);
  const [referenceData, setReferenceData] = useState({ contractors, units });
  const [loadState, setLoadState] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [period, setPeriod] = useState("all");
  const [filters, setFilters] = useState({ search: "", direction: "all", accountCategory: "all", taxCategory: "all", paymentMethod: "all", dateFrom: "", dateTo: "" });
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState(null);
  const [formState, setFormState] = useState(createEmptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteState, setDeleteState] = useState("idle");
  const [modalError, setModalError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const exportTimerRef = useRef(null);

  useEffect(() => {
    setSelectedId("");
    setEditor(null);
    setDeleteTarget(null);
    setFilters({ search: "", direction: "all", accountCategory: "all", taxCategory: "all", paymentMethod: "all", dateFrom: "", dateTo: "" });
    setPeriod("all");
    refreshAccountingData();
  }, [selectedProjectId]);

  useEffect(() => () => {
    if (exportTimerRef.current) window.clearTimeout(exportTimerRef.current);
  }, []);

  const periodRows = useMemo(
    () => filterAccountingTransactions(transactions, { period }),
    [period, transactions],
  );
  const periodSummary = useMemo(() => calculateAccountingSummary(periodRows), [periodRows]);
  const allTimeSummary = useMemo(() => calculateAccountingSummary(transactions), [transactions]);
  const summary = useMemo(() => ({ ...periodSummary, currentBalance: allTimeSummary.currentBalance }), [allTimeSummary.currentBalance, periodSummary]);
  const filteredRows = useMemo(
    () => sortAccountingTransactions(filterAccountingTransactions(transactions, { ...filters, period })),
    [filters, period, transactions],
  );
  const runningBalanceById = useMemo(
    () => new Map(calculateRunningBalance(transactions).map((row) => [row.id, row.runningBalance])),
    [transactions],
  );
  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === selectedId) || null,
    [selectedId, transactions],
  );
  const unitById = useMemo(() => new Map((referenceData.units || []).map((unit) => [unit.id, unit])), [referenceData.units]);
  const contractorById = useMemo(() => new Map((referenceData.contractors || []).map((contractor) => [contractor.id, contractor])), [referenceData.contractors]);
  const accountFilterOptions = useMemo(() => filters.direction === "all"
    ? [...getAccountCategoryOptions("income"), ...getAccountCategoryOptions("expense")]
    : getAccountCategoryOptions(filters.direction), [filters.direction]);
  const exportRows = useMemo(
    () => buildUnitPaymentExportRows({ contractors, paymentSummaries, units }, language),
    [contractors, language, paymentSummaries, units],
  );
  const exportSummary = useMemo(
    () => buildUnitPaymentExportSummary({ contractors, paymentSummaries, units }, language, exportRows),
    [contractors, exportRows, language, paymentSummaries, units],
  );

  useEffect(() => {
    if (selectedId && !filteredRows.some((row) => row.id === selectedId)) setSelectedId("");
  }, [filteredRows, selectedId]);

  async function refreshAccountingData() {
    setLoadState("loading");
    setError("");
    if (!selectedProjectId || String(selectedProjectId).startsWith("local-")) {
      setTransactions([]);
      setReferenceData({ contractors: [], units: [] });
      setLoadState("ready");
      return;
    }
    const [transactionsResult, referencesResult] = await Promise.all([
      listAccountingTransactions({ projectId: selectedProjectId }),
      listAccountingReferenceData({ projectId: selectedProjectId }),
    ]);
    if (transactionsResult.error) {
      setError(transactionsResult.error);
    } else {
      setTransactions(transactionsResult.data || []);
    }
    if (referencesResult.error) setError((current) => current || referencesResult.error);
    setReferenceData(referencesResult.data || { contractors: [], units: [] });
    setLoadState("ready");
  }

  function openCreateModal() {
    setEditor({ mode: "create", id: "" });
    setFormState(createEmptyForm());
    setFieldErrors({});
    setModalError("");
  }

  function openEditModal(transaction) {
    setEditor({ mode: "edit", id: transaction.id });
    setFormState({
      transaction_date: transaction.transaction_date || localDateKey(),
      direction: transaction.direction || "income",
      account_category: transaction.account_category || "",
      tax_category: transaction.tax_category || "not_reviewed",
      counterparty_name: transaction.counterparty_name || "",
      description: transaction.description || "",
      payment_method: transaction.payment_method || "bank_transfer",
      amount: transaction.amount ?? 0,
      reference_no: transaction.reference_no || "",
      related_unit_id: transaction.related_unit_id || "",
      related_contractor_id: transaction.related_contractor_id || "",
      source_type: transaction.source_type || "manual",
      memo: transaction.memo || "",
    });
    setFieldErrors({});
    setModalError("");
  }

  function closeEditor() {
    if (saveState === "saving") return;
    setEditor(null);
    setFieldErrors({});
    setModalError("");
  }

  function updateFormField(event) {
    const { name, value } = event.target;
    setFormState((current) => {
      if (name !== "direction") return { ...current, [name]: value };
      return {
        ...current,
        direction: value,
        account_category: getAccountCategoryOptions(value).includes(current.account_category) ? current.account_category : "",
      };
    });
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  async function submitTransaction(event) {
    event.preventDefault();
    const validation = validateAccountingTransactionForm(formState, selectedProjectId);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setModalError(t("Please review the highlighted fields."));
      return;
    }
    setSaveState("saving");
    setModalError("");
    const payload = buildAccountingTransactionPayload(formState, selectedProjectId);
    const result = editor?.mode === "edit"
      ? await updateAccountingTransaction(editor.id, payload, selectedProjectId)
      : await createAccountingTransaction(payload, selectedProjectId);
    if (result.error) {
      setSaveState("idle");
      setFieldErrors(result.fieldErrors || {});
      setModalError(result.error);
      return;
    }
    const savedId = result.data?.id || editor?.id || "";
    setEditor(null);
    setSaveState("idle");
    await refreshAccountingData();
    setSelectedId(savedId);
    setMessage(t("Transaction saved successfully."));
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleteState("deleting");
    setModalError("");
    const result = await deleteAccountingTransaction(deleteTarget.id, selectedProjectId);
    if (result.error) {
      setDeleteState("idle");
      setModalError(result.error);
      return;
    }
    if (selectedId === deleteTarget.id) setSelectedId("");
    setDeleteTarget(null);
    setDeleteState("idle");
    await refreshAccountingData();
    setMessage(t("Transaction deleted successfully."));
  }

  function handleExport() {
    const html = buildExcelTableHtml(exportSummary, exportRows, language);
    const blob = new Blob([`\ufeff${html}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timor-crest-unit-payment-report-${getLocalDateStamp()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setExportMessage(t("Excel report downloaded successfully."));
    if (exportTimerRef.current) window.clearTimeout(exportTimerRef.current);
    exportTimerRef.current = window.setTimeout(() => setExportMessage(""), 3000);
  }

  function selectTransaction(transaction) {
    setSelectedId((current) => current === transaction.id ? "" : transaction.id);
  }

  return (
    <div className="crm-page crm-accounting">
      <header className="crm-page-heading crm-accounting__heading">
        <div>
          <span className="crm-eyebrow">{t("Accounting Management")}</span>
          <h1>{t("Accounting")}</h1>
          <p>{t("Manage single-entry cashbook records, project cash flow, and tax reference categories.")}</p>
          <span className="crm-project-scope-note">{t("Current Project")}: {selectedProject?.name || t("Not available")} · {t("Showing project-specific data.")}</span>
        </div>
        <div className="crm-accounting__header-actions">
          <label className="crm-accounting__period-filter">
            <span>{t("Date Range")}</span>
            <select onChange={(event) => setPeriod(event.target.value)} value={period}>
              {ACCOUNTING_PERIODS.map((value) => <option key={value} value={value}>{t(PERIOD_LABELS[value])}</option>)}
            </select>
          </label>
          <button className="crm-button crm-button--primary" disabled={!selectedProjectId || String(selectedProjectId).startsWith("local-")} onClick={openCreateModal} type="button">
            <AdminIcon name="payment" size={16} />{t("Add Transaction")}
          </button>
        </div>
      </header>

      {message ? <p className="crm-accounting__message" role="status">{message}</p> : null}
      {error ? <p className="crm-accounting__error" role="alert">{error}</p> : null}
      {exportMessage ? <p className="crm-reports__feedback" role="status">{exportMessage}</p> : null}

      <section aria-labelledby="accounting-export-title" className="crm-card crm-reports__export-preview crm-accounting__export-card">
        <div className="crm-reports__export-preview-heading">
          <div>
            <span className="crm-reports__section-icon"><AdminIcon name="download" size={17} /></span>
            <div>
              <h2 id="accounting-export-title">{t("Unit Payment Excel Export")}</h2>
              <p>{t("Export unit-by-unit payment status including installment details.")}</p>
            </div>
          </div>
          <div className="crm-reports__export-preview-actions">
            <StatusBadge tone="info">.xls</StatusBadge>
            <button className="crm-button crm-button--primary" onClick={handleExport} type="button">
              <AdminIcon name="download" size={16} />{t("Export Excel")}
            </button>
          </div>
        </div>
        <div className="crm-reports__export-preview-stats">
          <ExportMetric label={t("Export rows")} value={formatNumber(exportSummary.rowCount, language)} />
          <ExportMetric label={t("Total Units")} value={formatNumber(exportSummary.totalUnits, language)} />
          <ExportMetric label={t("Assigned Units")} value={formatNumber(exportSummary.assignedUnits, language)} />
          <ExportMetric label={t("Total Paid")} tone="success" value={formatAccountingAmount(exportSummary.totalPaid, language)} />
          <ExportMetric label={t("Outstanding Balance")} tone="danger" value={formatAccountingAmount(exportSummary.outstandingBalance, language)} />
        </div>
      </section>

      <section aria-labelledby="accounting-summary-title" className="crm-accounting__section">
        <div className="crm-accounting__section-heading">
          <div><span className="crm-eyebrow">{t("Single-entry Cashbook")}</span><h2 id="accounting-summary-title">{t("Accounting Summary")}</h2></div>
          <span>{t("Summary period")}: {t(PERIOD_LABELS[period])}</span>
        </div>
        <div className="crm-accounting__kpis">
          <KpiCard className="crm-kpi-card--amount" icon="trend" label={t("Total Income")} tone="success" value={formatAccountingAmount(summary.totalIncome, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="payment" label={t("Total Expense")} tone="danger" value={formatAccountingAmount(summary.totalExpense, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="trend" label={t("Net Cash Flow")} tone={summary.netCashFlow < 0 ? "danger" : "blue"} value={formatAccountingAmount(summary.netCashFlow, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="payment" label={t("Current Balance")} tone={summary.currentBalance < 0 ? "danger" : "blue"} value={formatAccountingAmount(summary.currentBalance, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="calendar" label={t("Today Income")} tone="success" value={formatAccountingAmount(allTimeSummary.todayIncome, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="calendar" label={t("Today Expense")} tone="danger" value={formatAccountingAmount(allTimeSummary.todayExpense, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="calendar" label={t("This Month Income")} tone="success" value={formatAccountingAmount(allTimeSummary.monthIncome, language)} />
          <KpiCard className="crm-kpi-card--amount" icon="calendar" label={t("This Month Expense")} tone="danger" value={formatAccountingAmount(allTimeSummary.monthExpense, language)} />
        </div>
      </section>

      <section aria-labelledby="cashbook-title" className="crm-accounting__section">
        <div className="crm-accounting__section-heading">
          <div><span className="crm-eyebrow">{t("Accounting")}</span><h2 id="cashbook-title">{t("Cashbook")}</h2></div>
          <span>{formatNumber(filteredRows.length, language)} {t("Transactions")}</span>
        </div>
        <div className="crm-card crm-accounting__filters">
          <label className="crm-accounting__filter crm-accounting__filter--search"><span>{t("Search")}</span><input onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder={t("Search transactions")} type="search" value={filters.search} /></label>
          <FilterSelect label={t("Direction")} onChange={(value) => setFilters((current) => ({ ...current, direction: value, accountCategory: "all" }))} value={filters.direction}>
            <option value="all">{t("All Directions")}</option>
            {ACCOUNTING_DIRECTIONS.map((value) => <option key={value} value={value}>{getDirectionLabel(value, language)}</option>)}
          </FilterSelect>
          <FilterSelect label={t("Account Category")} onChange={(value) => setFilters((current) => ({ ...current, accountCategory: value }))} value={filters.accountCategory}>
            <option value="all">{t("All Categories")}</option>
            {accountFilterOptions.map((value) => <option key={value} value={value}>{getAccountCategoryLabel(value, language)}</option>)}
          </FilterSelect>
          <FilterSelect label={t("Tax Category")} onChange={(value) => setFilters((current) => ({ ...current, taxCategory: value }))} value={filters.taxCategory}>
            <option value="all">{t("All Tax Categories")}</option>
            {ACCOUNTING_TAX_CATEGORIES.map((value) => <option key={value} value={value}>{getTaxCategoryLabel(value, language)}</option>)}
          </FilterSelect>
          <FilterSelect label={t("Payment Method")} onChange={(value) => setFilters((current) => ({ ...current, paymentMethod: value }))} value={filters.paymentMethod}>
            <option value="all">{t("All Payment Methods")}</option>
            {ACCOUNTING_PAYMENT_METHODS.map((value) => <option key={value} value={value}>{getPaymentMethodLabel(value, language)}</option>)}
          </FilterSelect>
          <label className="crm-accounting__filter"><span>{t("From Date")}</span><input onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} type="date" value={filters.dateFrom} /></label>
          <label className="crm-accounting__filter"><span>{t("To Date")}</span><input onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} type="date" value={filters.dateTo} /></label>
        </div>

        <div className={`crm-accounting__ledger-layout${selectedTransaction ? " has-detail" : ""}`}>
          <div className="crm-card crm-accounting__ledger-card">
            {loadState === "loading" ? <p className="crm-accounting__loading">{t("데이터를 불러오고 있습니다.")}</p> : filteredRows.length ? (
              <>
                <div className="crm-accounting__table-wrap">
                  <table className="crm-accounting__table">
                    <thead><tr><th>{t("Date")}</th><th>{t("Direction")}</th><th>{t("Account Category")}</th><th>{t("Tax Category")}</th><th>{t("Counterparty")}</th><th>{t("Description")}</th><th>{t("Payment Method")}</th><th>{t("Inflow")}</th><th>{t("Outflow")}</th><th>{t("Balance")}</th><th>{t("Related Unit")}</th><th>{t("Related Customer")}</th><th>{t("Actions")}</th></tr></thead>
                    <tbody>{filteredRows.map((transaction) => <AccountingTableRow contractorById={contractorById} key={transaction.id} language={language} onDelete={setDeleteTarget} onEdit={openEditModal} onSelect={selectTransaction} runningBalance={runningBalanceById.get(transaction.id) || 0} selected={transaction.id === selectedId} transaction={transaction} unitById={unitById} />)}</tbody>
                  </table>
                </div>
                <div className="crm-accounting__mobile-list">{filteredRows.map((transaction) => <AccountingMobileCard contractorById={contractorById} key={transaction.id} language={language} onDelete={setDeleteTarget} onEdit={openEditModal} onSelect={selectTransaction} runningBalance={runningBalanceById.get(transaction.id) || 0} selected={transaction.id === selectedId} transaction={transaction} unitById={unitById} />)}</div>
              </>
            ) : <EmptyState>{transactions.length ? t("No matching accounting transactions.") : t("No accounting transactions yet.")}</EmptyState>}
          </div>
          {selectedTransaction ? <AccountingDetail contractorById={contractorById} language={language} onClose={() => setSelectedId("")} onDelete={setDeleteTarget} onEdit={openEditModal} runningBalance={runningBalanceById.get(selectedTransaction.id) || 0} t={t} transaction={selectedTransaction} unitById={unitById} /> : null}
        </div>
      </section>

      <section aria-labelledby="tax-reference-title" className="crm-card crm-accounting__tax-notice">
        <span className="crm-accounting__tax-icon"><AdminIcon name="document" size={19} /></span>
        <div><h2 id="tax-reference-title">{t("Tax Reference Notice")}</h2><p>{t("This accounting page is for internal bookkeeping and tax preparation reference only. Please confirm final tax filing requirements with a local Timor-Leste accountant or tax advisor.")}</p></div>
      </section>

      {editor ? <AccountingTransactionModal busy={saveState === "saving"} fieldErrors={fieldErrors} formState={formState} language={language} onChange={updateFormField} onClose={closeEditor} onSubmit={submitTransaction} referenceData={referenceData} t={t} title={editor.mode === "edit" ? t("Edit Transaction") : t("Add Transaction")} error={modalError} /> : null}
      {deleteTarget ? <DeleteConfirmModal busy={deleteState === "deleting"} closeLabel={t("Cancel")} error={modalError} message={t("Delete this accounting transaction? This action cannot be undone.")} onClose={() => { if (deleteState !== "deleting") { setDeleteTarget(null); setModalError(""); } }} onConfirm={confirmDelete} title={t("Delete Transaction")} titleId="delete-accounting-transaction" warning={t("This action cannot be undone.")} /> : null}
    </div>
  );
}

function AccountingTransactionModal({ busy, error, fieldErrors, formState, language, onChange, onClose, onSubmit, referenceData, t, title }) {
  const accountOptions = getAccountCategoryOptions(formState.direction);
  return (
    <CustomerManagementModal closeLabel={t("Close")} description={t("Project is assigned automatically from the current selection.")} onClose={onClose} title={title} titleId="accounting-transaction-editor">
      <form className="crm-cm-modal__body" noValidate onSubmit={onSubmit}>
        {error ? <p className="crm-cm-modal__error" role="alert">{error}</p> : null}
        <div className="crm-accounting__form-grid">
          <AccountingField error={fieldErrors.transaction_date ? t(VALIDATION_LABELS[fieldErrors.transaction_date]) : ""} label={t("Transaction Date")} required><input autoFocus name="transaction_date" onChange={onChange} required type="date" value={formState.transaction_date} /></AccountingField>
          <AccountingField error={fieldErrors.direction ? t(VALIDATION_LABELS[fieldErrors.direction]) : ""} label={t("Direction")} required><select name="direction" onChange={onChange} required value={formState.direction}>{ACCOUNTING_DIRECTIONS.map((value) => <option key={value} value={value}>{getDirectionLabel(value, language)}</option>)}</select></AccountingField>
          <AccountingField error={fieldErrors.account_category ? t(VALIDATION_LABELS[fieldErrors.account_category]) : ""} label={t("Account Category")} required><select name="account_category" onChange={onChange} required value={formState.account_category}><option value="">{t("Select")}</option>{accountOptions.map((value) => <option key={value} value={value}>{getAccountCategoryLabel(value, language)}</option>)}</select></AccountingField>
          <AccountingField error={fieldErrors.tax_category ? t(VALIDATION_LABELS[fieldErrors.tax_category]) : ""} label={t("Tax Category")} required><select name="tax_category" onChange={onChange} required value={formState.tax_category}>{ACCOUNTING_TAX_CATEGORIES.map((value) => <option key={value} value={value}>{getTaxCategoryLabel(value, language)}</option>)}</select></AccountingField>
          <AccountingField label={t("Counterparty")}><input name="counterparty_name" onChange={onChange} value={formState.counterparty_name} /></AccountingField>
          <AccountingField error={fieldErrors.amount ? t(VALIDATION_LABELS[fieldErrors.amount]) : ""} label={t("Amount")} required><input min="0" name="amount" onChange={onChange} required step="0.01" type="number" value={formState.amount} /></AccountingField>
          <AccountingField className="crm-accounting__field--wide" error={fieldErrors.description ? t(VALIDATION_LABELS[fieldErrors.description]) : ""} label={t("Description")} required><input name="description" onChange={onChange} required value={formState.description} /></AccountingField>
          <AccountingField error={fieldErrors.payment_method ? t(VALIDATION_LABELS[fieldErrors.payment_method]) : ""} label={t("Payment Method")} required><select name="payment_method" onChange={onChange} required value={formState.payment_method}>{ACCOUNTING_PAYMENT_METHODS.map((value) => <option key={value} value={value}>{getPaymentMethodLabel(value, language)}</option>)}</select></AccountingField>
          <AccountingField label={t("Reference No.")}><input name="reference_no" onChange={onChange} value={formState.reference_no} /></AccountingField>
          <AccountingField label={t("Related Unit")}><select name="related_unit_id" onChange={onChange} value={formState.related_unit_id}><option value="">{t("None")}</option>{(referenceData.units || []).map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_code || unit.id}</option>)}</select></AccountingField>
          <AccountingField label={t("Related Customer")}><select name="related_contractor_id" onChange={onChange} value={formState.related_contractor_id}><option value="">{t("None")}</option>{(referenceData.contractors || []).map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.full_name || contractor.email || contractor.id}</option>)}</select></AccountingField>
          <AccountingField className="crm-accounting__field--wide" label={t("Memo")}><textarea name="memo" onChange={onChange} rows="3" value={formState.memo} /></AccountingField>
        </div>
        <div className="crm-cm-modal__actions"><button className="secondary-button" disabled={busy} onClick={onClose} type="button">{t("Cancel")}</button><button className="crm-button crm-button--primary" disabled={busy} type="submit"><AdminIcon name="payment" size={15} />{busy ? t("Saving...") : t("Save Transaction")}</button></div>
      </form>
    </CustomerManagementModal>
  );
}

function AccountingField({ children, className = "", error, label, required = false }) {
  return <label className={`crm-accounting__field ${className}`.trim()}><span>{label}{required ? " *" : ""}</span>{children}{error ? <small className="crm-accounting__field-error">{error}</small> : null}</label>;
}

function AccountingTableRow({ contractorById, language, onDelete, onEdit, onSelect, runningBalance, selected, transaction, unitById }) {
  const unitName = transaction.unit?.unit_code || unitById.get(transaction.related_unit_id)?.unit_code || "-";
  const customerName = transaction.contractor?.full_name || contractorById.get(transaction.related_contractor_id)?.full_name || "-";
  return <tr aria-selected={selected} className={selected ? "is-selected" : ""} onClick={() => onSelect(transaction)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(transaction); } }} tabIndex="0"><td>{formatAccountingDate(transaction.transaction_date, language)}</td><td><StatusBadge tone={transaction.direction === "income" ? "success" : "danger"}>{getDirectionLabel(transaction.direction, language)}</StatusBadge></td><td>{getAccountCategoryLabel(transaction.account_category, language)}</td><td>{getTaxCategoryLabel(transaction.tax_category, language)}</td><td>{transaction.counterparty_name || "-"}</td><td className="crm-accounting__description-cell">{transaction.description}</td><td>{getPaymentMethodLabel(transaction.payment_method, language)}</td><td className="is-income">{transaction.direction === "income" ? formatAccountingAmount(transaction.amount, language) : "-"}</td><td className="is-expense">{transaction.direction === "expense" ? formatAccountingAmount(transaction.amount, language) : "-"}</td><td>{formatAccountingAmount(runningBalance, language)}</td><td>{unitName}</td><td>{customerName}</td><td><RowActions language={language} onDelete={() => onDelete(transaction)} onEdit={() => onEdit(transaction)} /></td></tr>;
}

function AccountingMobileCard(props) {
  const { contractorById, language, onDelete, onEdit, onSelect, runningBalance, selected, transaction, unitById } = props;
  const unitName = transaction.unit?.unit_code || unitById.get(transaction.related_unit_id)?.unit_code || "-";
  const customerName = transaction.contractor?.full_name || contractorById.get(transaction.related_contractor_id)?.full_name || "-";
  return <article className={`crm-accounting__mobile-card${selected ? " is-selected" : ""}`}><div className="crm-accounting__mobile-card-trigger" onClick={() => onSelect(transaction)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(transaction); } }} role="button" tabIndex="0"><header><div><span>{formatAccountingDate(transaction.transaction_date, language)}</span><strong>{transaction.description}</strong></div><StatusBadge tone={transaction.direction === "income" ? "success" : "danger"}>{getDirectionLabel(transaction.direction, language)}</StatusBadge></header><dl><DetailRow label={getAccountCategoryLabel(transaction.account_category, language)} value={formatAccountingAmount(transaction.amount, language)} /><DetailRow label={unitName} value={customerName} /><DetailRow label={getPaymentMethodLabel(transaction.payment_method, language)} value={formatAccountingAmount(runningBalance, language)} /></dl></div><RowActions language={language} onDelete={() => onDelete(transaction)} onEdit={() => onEdit(transaction)} /></article>;
}

function RowActions({ language, onDelete, onEdit }) {
  const editLabel = language === "kr" ? "수정" : "Edit";
  const deleteLabel = language === "kr" ? "삭제" : "Delete";
  return <span className="crm-accounting__row-actions"><button aria-label={editLabel} className="crm-accounting__icon-action" onClick={(event) => { event.stopPropagation(); onEdit(); }} title={editLabel} type="button"><AdminIcon name="edit" size={14} /></button><button aria-label={deleteLabel} className="crm-accounting__icon-action crm-accounting__icon-action--danger" onClick={(event) => { event.stopPropagation(); onDelete(); }} title={deleteLabel} type="button"><AdminIcon name="trash" size={14} /></button></span>;
}

function AccountingDetail({ contractorById, language, onClose, onDelete, onEdit, runningBalance, t, transaction, unitById }) {
  const unitName = transaction.unit?.unit_code || unitById.get(transaction.related_unit_id)?.unit_code || t("None");
  const customerName = transaction.contractor?.full_name || contractorById.get(transaction.related_contractor_id)?.full_name || t("None");
  return <aside className="crm-card crm-accounting__detail"><header><div><span className="crm-eyebrow">{getDirectionLabel(transaction.direction, language)}</span><h3>{t("Transaction Details")}</h3></div><button aria-label={t("Close")} className="crm-accounting__icon-action" onClick={onClose} type="button"><AdminIcon name="close" size={15} /></button></header><dl><DetailRow label={t("Transaction Date")} value={formatAccountingDate(transaction.transaction_date, language)} /><DetailRow label={t("Account Category")} value={getAccountCategoryLabel(transaction.account_category, language)} /><DetailRow label={t("Tax Category")} value={getTaxCategoryLabel(transaction.tax_category, language)} /><DetailRow label={t("Counterparty")} value={transaction.counterparty_name || t("None")} /><DetailRow label={t("Description")} value={transaction.description} /><DetailRow label={t("Payment Method")} value={getPaymentMethodLabel(transaction.payment_method, language)} /><DetailRow label={t("Amount")} value={formatAccountingAmount(transaction.amount, language)} /><DetailRow label={t("Balance")} value={formatAccountingAmount(runningBalance, language)} /><DetailRow label={t("Related Unit")} value={unitName} /><DetailRow label={t("Related Customer")} value={customerName} /><DetailRow label={t("Reference No.")} value={transaction.reference_no || t("None")} /><DetailRow label={t("Source Type")} value={getSourceTypeLabel(transaction.source_type, language)} /><DetailRow label={t("Memo")} value={transaction.memo || t("None")} /><DetailRow label={t("Created At")} value={formatDateTime(transaction.created_at, language)} /><DetailRow label={t("Updated")} value={formatDateTime(transaction.updated_at, language)} /></dl><footer><button className="crm-button crm-button--secondary" onClick={() => onEdit(transaction)} type="button"><AdminIcon name="edit" size={14} />{t("Edit Transaction")}</button><button className="crm-accounting__delete-button" onClick={() => onDelete(transaction)} type="button"><AdminIcon name="trash" size={14} />{t("Delete Transaction")}</button></footer></aside>;
}

function DetailRow({ label, value }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function FilterSelect({ children, label, onChange, value }) {
  return <label className="crm-accounting__filter"><span>{label}</span><select onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function ExportMetric({ label, tone = "default", value }) {
  return <div className={`crm-reports__metric crm-reports__metric--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function createEmptyForm() {
  return { transaction_date: localDateKey(), direction: "income", account_category: "", tax_category: "not_reviewed", counterparty_name: "", description: "", payment_method: "bank_transfer", amount: "", reference_no: "", related_unit_id: "", related_contractor_id: "", source_type: "manual", memo: "" };
}

function localDateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function getLocalDateStamp(date = new Date()) {
  return localDateKey(date);
}

function formatNumber(value, language) {
  return Number(value ?? 0).toLocaleString(language === "kr" ? "ko-KR" : "en-US");
}

function formatDateTime(value, language) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
