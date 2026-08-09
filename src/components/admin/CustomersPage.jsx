import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "./EmptyState.jsx";
import KpiCard from "./KpiCard.jsx";
import AdminIcon from "./AdminIcon.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { calculateCustomerKpis, filterCustomers, getCustomerDocuments, getCustomerPaymentSnapshot, getCustomerStatusTone } from "../../services/adminCustomersModel.js";

export default function CustomersPage({
  contractorForm,
  deleteContractorRecord,
  documents,
  editContractor,
  manualContractorMode,
  navigate: navigateFromParent,
  paymentSummaries,
  resetContractorForm,
  selectedContractor,
  selectedContractorId,
  selectDocumentContractor,
  setManualContractorMode,
  sortedContractors,
  sortedUnits,
  status,
  submitContractor,
  t,
  updateContractorField,
}) {
  const fallbackNavigate = useNavigate();
  const navigate = navigateFromParent || fallbackNavigate;
  const [filters, setFilters] = useState({ paymentMethod: "all", query: "", status: "all", unitAssigned: "all" });
  const [formOpen, setFormOpen] = useState(Boolean(selectedContractor));
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(selectedContractorId || "");

  const filteredCustomers = useMemo(() => filterCustomers(sortedContractors, filters), [filters, sortedContractors]);
  const kpis = useMemo(() => calculateCustomerKpis(sortedContractors), [sortedContractors]);
  const selectedCustomer = useMemo(
    () => filteredCustomers.find((customer) => customer.id === selectedCustomerId)
      || sortedContractors.find((customer) => customer.id === selectedCustomerId)
      || null,
    [filteredCustomers, selectedCustomerId, sortedContractors],
  );
  const statusOptions = useMemo(
    () => [...new Set(sortedContractors.map((customer) => String(customer.status || "").trim().toLowerCase()).filter(Boolean))],
    [sortedContractors],
  );

  useEffect(() => {
    if (selectedContractorId) {
      setSelectedCustomerId(selectedContractorId);
      setFormOpen(true);
      setCreateModalOpen(false);
      return;
    }

    setSelectedCustomerId((current) => (current && sortedContractors.some((customer) => customer.id === current) ? current : filteredCustomers[0]?.id || ""));
  }, [filteredCustomers, selectedContractorId, sortedContractors]);

  function handleSelect(customer) {
    setSelectedCustomerId(customer.id);
  }

  function handleEdit(customer) {
    setSelectedCustomerId(customer.id);
    editContractor(customer);
    setFormOpen(true);
    setCreateModalOpen(false);
  }

  function handleNewCustomer() {
    resetContractorForm();
    setSelectedCustomerId("");
    setFormOpen(true);
    setCreateModalOpen(true);
  }

  function handleCloseForm() {
    resetContractorForm();
    setFormOpen(false);
    setCreateModalOpen(false);
  }

  async function handleFormSubmit(event) {
    const didCreate = await submitContractor(event);
    if (didCreate === true && !selectedContractor) {
      setFormOpen(false);
      setCreateModalOpen(false);
    }
  }

  function handleManagePayments(customer) {
    editContractor(customer);
    navigate("/admin/payments");
  }

  function handleViewDocuments(customer) {
    selectDocumentContractor(customer);
    navigate("/admin/documents");
  }

  const createButtonLabel = manualContractorMode ? t("수동 계약자 생성") : t("Add Customer");

  return (
    <div className="crm-customers">
      <header className="crm-customers__header">
        <div>
          <span className="crm-eyebrow">TIMOR CREST CRM</span>
          <h1>{t("Customers")}</h1>
          <p>{t("Manage leads, buyers, and customer information.")}</p>
        </div>
        <button className="crm-customers__primary-action" onClick={handleNewCustomer} type="button">
          <AdminIcon name="customers" size={17} />
          {t("Add Customer")}
        </button>
      </header>

      <section aria-label={t("Customer KPIs")} className="crm-customers__kpis">
        <KpiCard icon="customers" label={t("Total Customers")} tone="blue" value={kpis.totalCustomers.toLocaleString()} />
        <KpiCard helper={t("Archived and deleted excluded")} icon="trend" label={t("Active Customers")} tone="success" value={kpis.activeCustomers.toLocaleString()} />
        <KpiCard helper={t("Customers with a unit")} icon="building" label={t("Assigned Units")} tone="blue" value={kpis.assignedUnits.toLocaleString()} />
        <KpiCard helper={t("Customers without a unit")} icon="customers" label={t("Unassigned Customers")} tone="warning" value={kpis.unassignedCustomers.toLocaleString()} />
      </section>

      {formOpen && selectedContractor ? (
        <CustomerForm
          contractorForm={contractorForm}
          createButtonLabel={createButtonLabel}
          manualContractorMode={manualContractorMode}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          onToggleManual={() => setManualContractorMode((current) => !current)}
          sortedUnits={sortedUnits}
          status={status}
          selectedContractor={selectedContractor}
          t={t}
          updateContractorField={updateContractorField}
        />
      ) : null}

      {createModalOpen ? (
        <CustomerModal onClose={handleCloseForm} t={t} titleId="crm-add-customer-title">
          <CustomerForm
            contractorForm={contractorForm}
            createButtonLabel={createButtonLabel}
            manualContractorMode={manualContractorMode}
            modal
            onClose={handleCloseForm}
            onSubmit={handleFormSubmit}
            onToggleManual={() => setManualContractorMode((current) => !current)}
            sortedUnits={sortedUnits}
            status={status}
            selectedContractor={null}
            t={t}
            titleId="crm-add-customer-title"
            updateContractorField={updateContractorField}
          />
        </CustomerModal>
      ) : null}

      <section className="crm-customers__workspace">
        <section className="crm-card crm-customers__list-card">
          <header className="crm-customers__list-header">
            <div>
              <h2>{t("Customers")}</h2>
              <span>{t("Showing {count} customers", { count: filteredCustomers.length })}</span>
            </div>
            <button className="crm-customers__clear-button" onClick={() => setFilters({ paymentMethod: "all", query: "", status: "all", unitAssigned: "all" })} type="button">
              {t("Clear filters")}
            </button>
          </header>
          <div className="crm-customers__filters">
            <label className="crm-customers__search">
              <AdminIcon name="search" size={17} />
              <input aria-label={t("Search customers...")} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder={t("Search customers...")} type="search" value={filters.query} />
            </label>
            <FilterSelect label={t("Status")} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={statusOptions} t={t} value={filters.status} />
            <FilterSelect label={t("Unit")} onChange={(value) => setFilters((current) => ({ ...current, unitAssigned: value }))} options={["assigned", "unassigned"]} t={t} value={filters.unitAssigned} />
            <FilterSelect label={t("Payment Method")} onChange={(value) => setFilters((current) => ({ ...current, paymentMethod: value }))} options={["cash", "bank_transfer", "unset"]} t={t} value={filters.paymentMethod} />
          </div>
          {filteredCustomers.length ? (
            <div className="crm-customers__table-wrap">
              <table className="crm-customers__table">
                <thead>
                  <tr><th>{t("Customer")}</th><th>{t("Status")}</th><th>{t("Unit")}</th><th>{t("Contact")}</th><th>{t("Passport No.")}</th><th>{t("Payment Method")}</th><th>{t("Created At")}</th><th>{t("Actions")}</th></tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <CustomerRow
                      customer={customer}
                      isSelected={customer.id === selectedCustomer?.id}
                      key={customer.id}
                      onDelete={deleteContractorRecord}
                      onEdit={handleEdit}
                      onSelect={handleSelect}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState>{t("No customers found.")}</EmptyState>}
        </section>

        <CustomerDetailPanel
          customer={selectedCustomer}
          documents={documents}
          onEdit={handleEdit}
          onManagePayments={handleManagePayments}
          onViewDocuments={handleViewDocuments}
          paymentSummaries={paymentSummaries}
          t={t}
          units={sortedUnits}
        />
      </section>
    </div>
  );
}

function CustomerModal({ children, onClose, t, titleId }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => dialog?.querySelector(focusableSelector)?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  return (
    <div className="crm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <div aria-labelledby={titleId} aria-modal="true" className="crm-modal" ref={dialogRef} role="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <span className="sr-only">{t("Add Customer")}</span>
        {children}
      </div>
    </div>
  );
}

function CustomerForm({ contractorForm, createButtonLabel, manualContractorMode, modal = false, onClose, onSubmit, onToggleManual, selectedContractor, sortedUnits, status, t, titleId, updateContractorField }) {
  return (
    <section className={`crm-card crm-customers__form-card${modal ? " crm-customers__form-card--modal" : ""}`}>
      <header className="crm-customers__form-header">
        <div><h2 id={titleId}>{selectedContractor ? t("Edit Customer") : t("Add Customer")}</h2><p>{selectedContractor ? t("Update customer information.") : t("Create a customer account and contract record.")}</p></div>
        <button aria-label={t("Close")} className="crm-customers__icon-button" onClick={onClose} type="button">×</button>
      </header>
      <form className="crm-customers__form" onSubmit={onSubmit}>
        <CustomerTextField label="full_name" name="full_name" onChange={updateContractorField} required t={t} value={contractorForm.full_name} />
        <CustomerTextField label="email" name="email" onChange={updateContractorField} required={!selectedContractor && !manualContractorMode} t={t} type="email" value={contractorForm.email} />
        {!selectedContractor && !manualContractorMode ? <CustomerTextField label="temporary_password" minLength="8" name="temporary_password" onChange={updateContractorField} required t={t} type="password" value={contractorForm.temporary_password} /> : null}
        <CustomerTextField label="phone" name="phone" onChange={updateContractorField} t={t} value={contractorForm.phone} />
        <CustomerTextField label="passport_no" name="passport_no" onChange={updateContractorField} t={t} value={contractorForm.passport_no} />
        <CustomerTextField label="address" name="address" onChange={updateContractorField} t={t} value={contractorForm.address} />
        <CustomerTextField label="status" name="status" onChange={updateContractorField} t={t} value={contractorForm.status} />
        <label className="field"><span>{t("Unit")}</span><select name="unit_id" onChange={updateContractorField} value={contractorForm.unit_id}><option value="">{t("Unassigned")}</option>{sortedUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_code}</option>)}</select></label>
        {selectedContractor || manualContractorMode ? <><p className="crm-customers__form-note">{t("Existing Auth users can be linked with profile_id.")}</p><CustomerTextField label="profile_id" name="profile_id" onChange={updateContractorField} t={t} value={contractorForm.profile_id} /></> : null}
        {!selectedContractor ? <button className="crm-customers__secondary-action" onClick={onToggleManual} type="button">{manualContractorMode ? t("Switch to automatic account creation") : t("Link existing Auth user")}</button> : null}
        <div className="crm-customers__form-actions"><button className="crm-customers__primary-action" disabled={status === "saving"} type="submit">{status === "saving" ? t("Saving...") : selectedContractor ? t("Edit Customer") : createButtonLabel}</button><button className="crm-customers__secondary-action" onClick={onClose} type="button">{t("Cancel")}</button></div>
      </form>
    </section>
  );
}

function CustomerTextField({ label, minLength, name, onChange, required, t, type = "text", value }) {
  return <label className="field"><span>{t(label)}</span><input minLength={minLength} name={name} onChange={onChange} required={required} type={type} value={value || ""} /></label>;
}

function FilterSelect({ label, onChange, options, t, value }) {
  return <label className="crm-customers__filter"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>{["all", ...options].map((option) => <option key={option} value={option}>{formatFilterLabel(option, t)}</option>)}</select></label>;
}

function CustomerRow({ customer, isSelected, onDelete, onEdit, onSelect, t }) {
  return (
    <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} onClick={() => onSelect(customer)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(customer); } }} tabIndex={0}>
      <td data-label={t("Customer")}><span className="crm-customers__identity"><span className="crm-customers__avatar">{getInitials(customer.full_name)}</span><span><strong>{customer.full_name || t("Not set")}</strong><small>{customer.email || t("Not set")}</small></span></span></td>
      <td data-label={t("Status")}><StatusBadge tone={getCustomerStatusTone(customer.status)}>{formatStatus(customer.status, t)}</StatusBadge></td>
      <td data-label={t("Unit")}><strong>{customer.unit?.unit_code || t("Unassigned")}</strong></td>
      <td data-label={t("Contact")}><span className="crm-customers__muted-value">{customer.phone || t("Not set")}</span></td>
      <td data-label={t("Passport No.")}><span className="crm-customers__muted-value">{customer.passport_no || t("Not set")}</span></td>
      <td data-label={t("Payment Method")}><span className="crm-customers__muted-value">{formatPaymentMethod(customer.payment_method, t)}</span></td>
      <td data-label={t("Created At")}><span className="crm-customers__muted-value">{formatDate(customer.updated_at || customer.created_at)}</span></td>
      <td data-label={t("Actions")}><span className="crm-customers__row-actions"><button aria-label={`${t("Edit Customer")} ${customer.full_name || ""}`} onClick={(event) => { event.stopPropagation(); onEdit(customer); }} type="button">{t("Edit")}</button><button aria-label={`${t("Delete")} ${customer.full_name || ""}`} onClick={(event) => { event.stopPropagation(); onDelete(customer); }} type="button">{t("Delete")}</button></span></td>
    </tr>
  );
}

function CustomerDetailPanel({ customer, documents, onEdit, onManagePayments, onViewDocuments, paymentSummaries, t, units }) {
  if (!customer) return <aside className="crm-card crm-customers__detail-card"><EmptyState>{t("Select a customer to view details.")}</EmptyState></aside>;

  const unit = customer.unit || units.find((candidate) => candidate.id === customer.unit_id);
  const payment = getCustomerPaymentSnapshot(paymentSummaries, customer.id);
  const customerDocuments = getCustomerDocuments(documents, customer.id);

  return (
    <aside className="crm-card crm-customers__detail-card">
      <header className="crm-customers__detail-header"><span className="crm-customers__detail-avatar">{getInitials(customer.full_name)}</span><div><h2>{customer.full_name || t("Not set")}</h2><p>{customer.email || t("Not set")}</p></div><StatusBadge tone={getCustomerStatusTone(customer.status)}>{formatStatus(customer.status, t)}</StatusBadge></header>
      <DetailSection title={t("Customer Profile")}><DetailGrid items={[[t("Contact"), customer.phone || t("Not set")], [t("Passport No."), customer.passport_no || t("Not set")], [t("Address"), customer.address || t("Not set")], [t("Payment Method"), formatPaymentMethod(customer.payment_method, t)], ...(customer.bank_name ? [[t("Bank Name"), customer.bank_name]] : []), ...(customer.bank_account_number ? [[t("Account Number"), customer.bank_account_number]] : []), ...(customer.bank_account_holder ? [[t("Account Holder"), customer.bank_account_holder]] : []), [t("Created At"), formatDate(customer.created_at)] ]} /></DetailSection>
      <DetailSection title={t("Unit Information")}>
        {unit ? <DetailGrid items={[[t("Unit"), unit.unit_code || t("Not set")], [t("Property Type"), unit.property_type || t("Not set")], ...(unit.floor ? [[t("Floor"), unit.floor]] : []), [t("Total Price"), formatMoney(unit.total_price, unit.currency, t)] ]} /> : <EmptyState>{t("No unit assigned.")}</EmptyState>}
      </DetailSection>
      <DetailSection title={t("Payment Snapshot")}>
        {payment.hasData ? <div className="crm-customers__payment-snapshot"><SnapshotMetric label={t("Total Required")} value={formatMoney(payment.totalRequired, payment.currency, t)} /><SnapshotMetric label={t("Total Paid")} value={formatMoney(payment.totalPaid, payment.currency, t)} /><SnapshotMetric label={t("Outstanding")} value={formatMoney(payment.outstanding, payment.currency, t)} /><div className="crm-customers__progress"><span><b>{t("Payment Progress")}</b><b>{payment.paymentProgress}%</b></span><i><em style={{ width: `${payment.paymentProgress}%` }} /></i></div></div> : <EmptyState>{t("No payment data.")}</EmptyState>}
      </DetailSection>
      <DetailSection title={t("Documents Snapshot")}>
        {customerDocuments.length ? <div className="crm-customers__documents"><span className="crm-customers__document-count">{customerDocuments.length} {t("Documents")}</span>{customerDocuments.slice(0, 3).map((document) => <div className="crm-customers__document-item" key={document.id}><AdminIcon name="document" size={15} /><span><strong>{document.title || document.file_name || t("Not set")}</strong><small>{formatDate(document.updated_at || document.uploaded_at || document.created_at)}</small></span></div>)}</div> : <EmptyState>{t("No documents found.")}</EmptyState>}
      </DetailSection>
      <section className="crm-customers__quick-actions"><h3>{t("Quick Actions")}</h3><div><button onClick={() => onEdit(customer)} type="button"><AdminIcon name="customers" size={15} />{t("Edit Customer")}</button><button onClick={() => onManagePayments(customer)} type="button"><AdminIcon name="payment" size={15} />{t("Manage Payments")}</button><button onClick={() => onViewDocuments(customer)} type="button"><AdminIcon name="document" size={15} />{t("View Documents")}</button><button onClick={() => onEdit(customer)} type="button"><AdminIcon name="building" size={15} />{t("Assign Unit")}</button></div></section>
    </aside>
  );
}

function DetailSection({ children, title }) {
  return <section className="crm-customers__detail-section"><h3>{title}</h3>{children}</section>;
}

function DetailGrid({ items }) {
  return <dl className="crm-customers__detail-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function SnapshotMetric({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatFilterLabel(value, t) {
  return { all: t("All"), assigned: t("Assigned"), unassigned: t("Unassigned"), cash: t("Cash"), bank_transfer: t("Bank Transfer"), unset: t("Not set") }[value] || value;
}

function formatPaymentMethod(value, t) {
  return { bank_transfer: t("Bank Transfer"), cash: t("Cash") }[value] || t("Not set");
}

function formatStatus(value, t) {
  return { active: t("Active"), archived: t("Archived"), contracted: t("Contracted"), deleted: t("Deleted"), pending: t("Pending"), reserved: t("Reserved") }[String(value || "").toLowerCase()] || value || t("Not set");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function formatMoney(value, currency, t) {
  if (value === null || value === undefined || value === "") return t("Not set");
  const number = Number(value);
  if (!Number.isFinite(number)) return t("Not set");
  return `${Math.trunc(number).toLocaleString()} ${currency || "USD"}`;
}

function getInitials(value) {
  return String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}
