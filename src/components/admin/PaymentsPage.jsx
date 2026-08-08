import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminIcon from "./AdminIcon.jsx";
import EmptyState from "./EmptyState.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { getPaymentStepTitle } from "../../services/paymentModel.js";
import {
  buildPaymentSummary,
  filterPaymentContractors,
  getPaymentItemStatus,
  getPaymentItemUnpaid,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "../../services/adminPaymentsModel.js";

export default function PaymentsPage({
  createDefaultItemsForPlan,
  createPlanForSelectedContractor,
  paymentDetailRef,
  paymentItems,
  paymentMethodForm,
  paymentPlan,
  paymentPlanForm,
  hasPaymentItemChanges,
  language,
  selectPaymentContractor,
  selectedContractor,
  selectedContractorId,
  sortedContractors,
  status,
  submitPaymentItems,
  submitPaymentMethod,
  submitPaymentPlan,
  t,
  updatePaymentDraftItem,
  updatePaymentMethodField,
  updatePaymentPlanField,
}) {
  const navigate = useNavigate();
  const [customerQuery, setCustomerQuery] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [methodOpen, setMethodOpen] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const filteredContractors = useMemo(
    () => filterPaymentContractors(sortedContractors, customerQuery),
    [customerQuery, sortedContractors],
  );
  const summary = useMemo(
    () => buildPaymentSummary({ contractor: selectedContractor, items: paymentItems, plan: paymentPlan }),
    [paymentItems, paymentPlan, selectedContractor],
  );

  useEffect(() => {
    setCustomerQuery("");
    setScheduleOpen(true);
    setPlanOpen(false);
  }, [selectedContractorId]);

  function handleSelect(contractor) {
    selectPaymentContractor(contractor);
  }

  return (
    <div className="crm-payments">
      <header className="crm-payments__header">
        <div>
          <span className="crm-eyebrow">TIMOR CREST CRM</span>
          <h1>{t("Payments")}</h1>
          <p>{t("Manage buyer payment schedules, ratios, and outstanding balances.")}</p>
        </div>
        <button className="crm-payments__secondary-action" onClick={() => navigate("/admin/contractors")} type="button">
          <AdminIcon name="customers" size={16} />
          {t("Back to Customers")}
        </button>
      </header>

      <section className="crm-card crm-payments__selector-card" aria-label={t("Select Customer")}>
        <div className="crm-payments__section-header">
          <div>
            <h2>{t("Select Customer")}</h2>
            <span>{t("Select a customer to manage payments.")}</span>
          </div>
          <span className="crm-payments__count">{filteredContractors.length.toLocaleString()}</span>
        </div>
        <label className="crm-payments__search">
          <AdminIcon name="search" size={16} />
          <span className="sr-only">{t("Search customers...")}</span>
          <input
            aria-label={t("Search customers...")}
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder={t("Search customers...")}
            value={customerQuery}
          />
        </label>
        {filteredContractors.length ? (
          <div className="crm-payments__customer-list">
            {filteredContractors.map((contractor) => (
              <button
                aria-pressed={contractor.id === selectedContractorId}
                className={`crm-payments__customer ${contractor.id === selectedContractorId ? "is-selected" : ""}`}
                key={contractor.id}
                onClick={() => handleSelect(contractor)}
                type="button"
              >
                <span className="crm-payments__avatar">{getInitials(contractor.full_name)}</span>
                <span className="crm-payments__customer-main">
                  <strong>{contractor.full_name || t("Not set")}</strong>
                  <small>{contractor.email || t("Not set")}</small>
                </span>
                <span className="crm-payments__customer-unit">{contractor.unit?.unit_code || t("Unassigned")}</span>
                <AdminIcon name="chevron" size={15} />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState>{sortedContractors.length ? t("No customers found.") : t("No customers found.")}</EmptyState>
        )}
      </section>

      <main className="crm-payments__detail" ref={paymentDetailRef}>
        {!selectedContractor ? (
          <section className="crm-card">
            <EmptyState>{t("Select a customer to manage payments.")}</EmptyState>
          </section>
        ) : (
          <>
            <PaymentSummary contractor={selectedContractor} summary={summary} t={t} />
            <PaymentMethodCard
              form={paymentMethodForm}
              isOpen={methodOpen}
              onChange={updatePaymentMethodField}
              onSubmit={submitPaymentMethod}
              onToggle={() => setMethodOpen((current) => !current)}
              saving={status === "saving"}
              t={t}
            />
            {paymentPlan ? (
              <PaymentPlanCard
                form={paymentPlanForm}
                isOpen={planOpen}
                onChange={updatePaymentPlanField}
                onSubmit={submitPaymentPlan}
                onToggle={() => setPlanOpen((current) => !current)}
                saving={status === "saving"}
                summary={summary}
                t={t}
              />
            ) : (
              <section className="crm-card crm-payments__empty-plan">
                <EmptyState>{t("No payment data.")}</EmptyState>
                <button className="crm-payments__primary-action" disabled={status === "saving"} onClick={createPlanForSelectedContractor} type="button">
                  <AdminIcon name="payment" size={16} />
                  {t("Create Payment Plan")}
                </button>
              </section>
            )}
            {paymentPlan && !paymentItems.length ? (
              <section className="crm-card crm-payments__empty-plan">
                <EmptyState>{t("No payment data.")}</EmptyState>
                <button className="crm-payments__secondary-action" disabled={status === "saving"} onClick={createDefaultItemsForPlan} type="button">
                  <AdminIcon name="payment" size={16} />
                  {t("Create 8-Step Schedule")}
                </button>
              </section>
            ) : null}
            {paymentPlan && paymentItems.length ? (
              <PaymentScheduleCard
                hasChanges={hasPaymentItemChanges}
                isOpen={scheduleOpen}
                items={summary.rows}
                language={language}
                onChange={updatePaymentDraftItem}
                onSave={submitPaymentItems}
                onToggle={() => setScheduleOpen((current) => !current)}
                saving={status === "saving"}
                summary={summary}
                t={t}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function PaymentSummary({ contractor, summary, t }) {
  const paymentMethod = contractor.payment_method || "";
  const methodLabel = getPaymentMethodLabel(paymentMethod, t);

  return (
    <section className="crm-card crm-payments__summary-card">
      <div className="crm-payments__summary-identity">
        <span className="crm-payments__detail-avatar">{getInitials(contractor.full_name)}</span>
        <div>
          <strong>{contractor.full_name || t("Not set")}</strong>
          <span>{contractor.email || t("Not set")}</span>
          <small>{contractor.phone || t("Not set")}</small>
        </div>
      </div>
      <div className="crm-payments__summary-unit">
        <span>{t("Unit")}</span>
        <strong>{contractor.unit?.unit_code || t("Unassigned")}</strong>
        <small>{contractor.unit?.property_type || t("Not set")}</small>
      </div>
      <div className="crm-payments__summary-metrics">
        <SummaryMetric label={t("Total Contract Price")} value={formatMoney(summary.totalContractPrice, summary.currency)} />
        <SummaryMetric label={t("Total Required")} value={formatMoney(summary.totalRequired, summary.currency)} />
        <SummaryMetric label={t("Total Paid")} tone="success" value={formatMoney(summary.totalPaid, summary.currency)} />
        <SummaryMetric label={t("Outstanding Balance")} tone="danger" value={formatMoney(summary.outstanding, summary.currency)} />
      </div>
      <div className="crm-payments__summary-method">
        <span>{t("Payment Method")}</span>
        <strong>{methodLabel}</strong>
        {paymentMethod === "bank_transfer" ? (
          <small>{contractor.bank_name || t("Not set")} · {contractor.bank_account_number || t("Not set")}</small>
        ) : <small>{t("Payment Method")}</small>}
      </div>
      <div aria-label={`${t("Payment Progress")}: ${summary.paymentProgress}%`} className="crm-payments__progress-ring" style={{ "--crm-payment-progress": `${Math.min(summary.paymentProgress, 100)}%` }}>
        <strong>{summary.paymentProgress}%</strong>
        <span>{t("Payment Progress")}</span>
      </div>
    </section>
  );
}

function PaymentMethodCard({ form, isOpen, onChange, onSubmit, onToggle, saving, t }) {
  const usesBankTransfer = form.payment_method === "bank_transfer";
  return (
    <section className="crm-card crm-payments__method-card">
      <SectionHeader isOpen={isOpen} onToggle={onToggle} summary={getPaymentMethodLabel(form.payment_method, t)} title={t("Payment Method")} />
      {isOpen ? (
        <form className="crm-payments__form" onSubmit={onSubmit}>
          <label className="crm-payments__field">
            <span>{t("Payment Method")}</span>
            <select name="payment_method" onChange={onChange} value={form.payment_method}>
              <option value="">{t("Not set")}</option>
              <option value="cash">{t("Cash")}</option>
              <option value="bank_transfer">{t("Bank Transfer")}</option>
            </select>
          </label>
          {usesBankTransfer ? (
            <>
              <PaymentField label={t("Bank Name")} name="bank_name" onChange={onChange} required value={form.bank_name} />
              <PaymentField label={t("Bank Account Number")} name="bank_account_number" onChange={onChange} required value={form.bank_account_number} />
              <PaymentField label={t("Bank Account Holder")} name="bank_account_holder" onChange={onChange} required value={form.bank_account_holder} />
            </>
          ) : null}
          <div className="crm-payments__form-actions">
            <button className="crm-payments__primary-action" disabled={saving} type="submit">{saving ? t("Saving...") : t("Save Payment Method")}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function PaymentPlanCard({ form, isOpen, onChange, onSubmit, onToggle, saving, summary, t }) {
  return (
    <section className="crm-card crm-payments__plan-card">
      <SectionHeader isOpen={isOpen} onToggle={onToggle} summary={`${formatMoney(form.total_price, form.currency)} · ${summary.ratioTotal}%`} title={t("Payment Plan")}/>
      {isOpen ? (
        <form className="crm-payments__form" onSubmit={onSubmit}>
          <PaymentField label={t("Total Contract Price")} name="total_price" onChange={onChange} min="0" step="1" type="number" value={form.total_price} />
          <PaymentField label={t("Currency")} name="currency" onChange={onChange} value={form.currency} />
          <label className="crm-payments__field">
            <span>{t("Status")}</span>
            <select name="status" onChange={onChange} value={form.status}>
              <option value="active">{t("Active")}</option>
              <option value="completed">{t("Completed")}</option>
              <option value="cancelled">{t("Cancelled")}</option>
            </select>
          </label>
          <div className="crm-payments__form-actions">
            <button className="crm-payments__primary-action" disabled={saving} type="submit">{saving ? t("Saving...") : t("Save Plan")}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function PaymentScheduleCard({ hasChanges, isOpen, items, language, onChange, onSave, onToggle, saving, summary, t }) {
  const ratioIsComplete = Math.round(summary.ratioTotal) === 100;
  return (
    <section className="crm-card crm-payments__schedule-card">
      <SectionHeader isOpen={isOpen} onToggle={onToggle} summary={`${items.length} ${t("Steps")} · ${Math.round(summary.ratioTotal)}%`} title={t("Payment Schedule")}/>
      {isOpen ? (
        <>
          {!ratioIsComplete ? <p className="crm-payments__notice crm-payments__notice--warning">{t("Ratio total")} {Math.round(summary.ratioTotal)}% · {t("Review the schedule before saving.")}</p> : null}
          <div className="crm-payments__table-wrap">
            <table className="crm-payments__table">
              <thead><tr><th>{t("Step")}</th><th>{t("Milestone")}</th><th>{t("Ratio")}</th><th>{t("Required Amount")}</th><th>{t("Paid Amount")}</th><th>{t("Unpaid Amount")}</th><th>{t("Dates")}</th><th>{t("Status")}</th></tr></thead>
              <tbody>
                {items.map((item) => <PaymentRow currency={summary.currency} item={item} key={item.id} language={language} onChange={onChange} t={t} />)}
              </tbody>
              <tfoot><tr><th colSpan="2">{t("Total")}</th><th>{Math.round(summary.ratioTotal)}%</th><th>{formatMoney(summary.totalRequired, summary.currency)}</th><th className="is-success">{formatMoney(summary.totalPaid, summary.currency)}</th><th className="is-danger">{formatMoney(summary.outstanding, summary.currency)}</th><th colSpan="2" /></tr></tfoot>
            </table>
          </div>
          <div className={`crm-payments__save-bar ${hasChanges ? "is-dirty" : ""}`}>
            <div><strong>{hasChanges ? t("Unsaved changes") : t("Payment schedule saved.")}</strong><span>{t("0 values remain valid and are saved as entered.")}</span></div>
            <button className="crm-payments__primary-action" disabled={!hasChanges || saving} onClick={onSave} type="button">{saving ? t("Saving...") : t("Save Changes")}</button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function PaymentRow({ currency, item, language, onChange, t }) {
  const itemStatus = getPaymentItemStatus(item);
  const handleChange = (event) => onChange(item.id, event.target.name, event.target.value);
  return (
    <tr>
      <td data-label={t("Step")}><span className="crm-payments__step-number">{item.step_no}</span></td>
      <td data-label={t("Milestone")}>
        <div className="crm-payments__milestone">
          <PaymentField label={t("Milestone")} name="title" onChange={handleChange} value={item.title || getPaymentStepTitle(item, language)} />
          <PaymentField label={t("Note")} name="note" onChange={handleChange} value={item.note || ""} />
        </div>
      </td>
      <td data-label={t("Ratio")}><PaymentField label={t("Ratio")} name="payment_ratio" max="100" min="0" onChange={handleChange} step="1" type="number" value={item.payment_ratio ?? 0} suffix="%" /></td>
      <td data-label={t("Required Amount")}><PaymentField label={t("Required Amount")} name="required_amount" min="0" onChange={handleChange} step="1" type="number" value={item.required_amount ?? 0} /></td>
      <td data-label={t("Paid Amount")}><PaymentField label={t("Paid Amount")} name="paid_amount" min="0" onChange={handleChange} step="1" type="number" value={item.paid_amount ?? 0} /></td>
      <td data-label={t("Unpaid Amount")}><strong className="crm-payments__unpaid">{formatMoney(getPaymentItemUnpaid(item), currency)}</strong></td>
      <td data-label={t("Dates")}><div className="crm-payments__dates"><PaymentField label={t("Due Date")} name="due_date" onChange={handleChange} type="date" value={item.due_date || ""} /><PaymentField label={t("Paid Date")} name="paid_date" onChange={handleChange} type="date" value={item.paid_date || ""} /></div></td>
      <td data-label={t("Status")}><div className="crm-payments__status-cell"><StatusBadge tone={itemStatus.tone}>{getPaymentStatusLabel(itemStatus.key, t)}</StatusBadge><select aria-label={t("Status")} name="status" onChange={handleChange} value={item.status || "unpaid"}><option value="unpaid">{t("Pending")}</option><option value="partial">{t("Partially Paid")}</option><option value="paid">{t("Paid")}</option></select></div></td>
    </tr>
  );
}

function SectionHeader({ isOpen, onToggle, summary, title }) {
  return <header className="crm-payments__section-header"><div><h2>{title}</h2><span>{summary}</span></div><button aria-expanded={isOpen} className="crm-payments__icon-button" onClick={onToggle} type="button"><AdminIcon name="chevron" size={16} /></button></header>;
}

function SummaryMetric({ label, tone, value }) {
  return <div className={`crm-payments__metric ${tone ? `is-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function PaymentField({ label, name, onChange, suffix, ...props }) {
  return <label className="crm-payments__field"><span>{label}</span><div className="crm-payments__input-wrap"><input aria-label={label} name={name} onChange={onChange} {...props} />{suffix ? <em>{suffix}</em> : null}</div></label>;
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", { currency: currency || "USD", maximumFractionDigits: 0, style: "currency" }).format(safeAmount);
  } catch {
    return `${currency || "USD"} ${safeAmount.toLocaleString("en-US")}`;
  }
}

function getInitials(value) {
  return String(value || "??").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "??";
}
