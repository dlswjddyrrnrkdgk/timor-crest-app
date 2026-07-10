import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createContractor,
  createUnit,
  getAdminContractors,
  getUnits,
  updateContractor,
  updateUnit,
} from "../services/contractorService.js";
import {
  calculatePaymentTotals,
  createDefaultPaymentItems,
  createPaymentPlan,
  getPaymentItems,
  getPaymentPlanByContractor,
  updatePaymentItem,
  updatePaymentPlan,
} from "../services/paymentService.js";
import { signOut } from "../services/authService.js";

const adminTabs = ["Dashboard", "호수 관리", "계약자 관리", "Journey 공정 관리", "납부 일정 관리", "문서 관리"];

const emptyUnitForm = {
  unit_code: "",
  unit_name: "",
  property_type: "",
  total_price: "",
  currency: "USD",
  status: "active",
};

const emptyContractorForm = {
  full_name: "",
  email: "",
  phone: "",
  passport_no: "",
  address: "",
  status: "active",
  unit_id: "",
  profile_id: "",
};

const emptyPaymentPlanForm = {
  total_price: "",
  currency: "USD",
  status: "active",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [contractorForm, setContractorForm] = useState(emptyContractorForm);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [paymentItems, setPaymentItems] = useState([]);
  const [paymentPlanForm, setPaymentPlanForm] = useState(emptyPaymentPlanForm);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) || null, [selectedUnitId, units]);
  const selectedContractor = useMemo(
    () => contractors.find((contractor) => contractor.id === selectedContractorId) || null,
    [contractors, selectedContractorId],
  );

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadPaymentForContractor(selectedContractor);
  }, [selectedContractorId]);

  async function loadDashboard() {
    setStatus("loading");
    setMessage("");
    const [unitResult, contractorResult] = await Promise.all([getUnits(), getAdminContractors()]);
    if (unitResult.error || contractorResult.error) {
      setStatus("ready");
      setMessage(unitResult.error || contractorResult.error);
      return;
    }
    setUnits(unitResult.data || []);
    setContractors(contractorResult.data || []);
    setStatus("ready");
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function loadPaymentForContractor(contractor) {
    setPaymentPlan(null);
    setPaymentItems([]);
    setPaymentPlanForm(emptyPaymentPlanForm);
    if (!contractor?.id) return;

    const planResult = await getPaymentPlanByContractor(contractor.id);
    if (planResult.error) {
      setMessage(planResult.error);
      return;
    }
    if (!planResult.data) return;

    setPaymentPlan(planResult.data);
    setPaymentPlanForm({
      total_price: planResult.data.total_price ?? "",
      currency: planResult.data.currency || "USD",
      status: planResult.data.status || "active",
    });

    const itemsResult = await getPaymentItems(planResult.data.id);
    if (itemsResult.error) {
      setMessage(itemsResult.error);
      return;
    }
    setPaymentItems(itemsResult.data || []);
  }

  function editUnit(unit) {
    setSelectedUnitId(unit.id);
    setUnitForm({
      unit_code: unit.unit_code || "",
      unit_name: unit.unit_name || "",
      property_type: unit.property_type || "",
      total_price: unit.total_price ?? "",
      currency: unit.currency || "USD",
      status: unit.status || "active",
    });
  }

  function resetUnitForm() {
    setSelectedUnitId("");
    setUnitForm(emptyUnitForm);
  }

  function editContractor(contractor) {
    setSelectedContractorId(contractor.id);
    setContractorForm({
      full_name: contractor.full_name || "",
      email: contractor.email || "",
      phone: contractor.phone || "",
      passport_no: contractor.passport_no || "",
      address: contractor.address || "",
      status: contractor.status || "active",
      unit_id: contractor.unit_id || "",
      profile_id: contractor.profile_id || "",
    });
  }

  function resetContractorForm() {
    setSelectedContractorId("");
    setContractorForm(emptyContractorForm);
  }

  function updateUnitField(event) {
    setUnitForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateContractorField(event) {
    setContractorForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updatePaymentPlanField(event) {
    setPaymentPlanForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitUnit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const result = selectedUnitId ? await updateUnit(selectedUnitId, unitForm) : await createUnit(unitForm);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    resetUnitForm();
    await loadDashboard();
    setMessage(selectedUnitId ? "호수 정보가 수정되었습니다." : "호수 정보가 생성되었습니다.");
  }

  async function submitContractor(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const result = selectedContractorId
      ? await updateContractor(selectedContractorId, contractorForm)
      : await createContractor(contractorForm);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    resetContractorForm();
    await loadDashboard();
    setMessage(selectedContractorId ? "계약자 정보가 수정되었습니다." : "계약자 정보가 생성되었습니다.");
  }

  async function submitPaymentPlan(event) {
    event.preventDefault();
    if (!paymentPlan) return;
    setStatus("saving");
    setMessage("");
    const result = await updatePaymentPlan(paymentPlan.id, paymentPlanForm);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    setPaymentPlan(result.data);
    setStatus("ready");
    setMessage("납부 계획이 수정되었습니다.");
  }

  async function createPlanForSelectedContractor() {
    if (!selectedContractor) return;
    setStatus("saving");
    setMessage("");
    const unit = selectedContractor.unit || {};
    const result = await createPaymentPlan(
      selectedContractor.id,
      selectedContractor.unit_id,
      unit.total_price || 0,
      unit.currency || "USD",
    );
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    setPaymentPlan(result.data);
    setPaymentPlanForm({
      total_price: result.data.total_price ?? "",
      currency: result.data.currency || "USD",
      status: result.data.status || "active",
    });
    setStatus("ready");
    setMessage("납부 계획이 생성되었습니다. 기본 8단계를 생성해 주세요.");
  }

  async function createDefaultItemsForPlan() {
    if (!paymentPlan) return;
    setStatus("saving");
    setMessage("");
    const result = await createDefaultPaymentItems(paymentPlan.id);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    setPaymentItems(result.data || []);
    setStatus("ready");
    setMessage("기본 8단계 납부 항목이 생성되었습니다.");
  }

  async function submitPaymentItem(itemId, values) {
    setStatus("saving");
    setMessage("");
    const result = await updatePaymentItem(itemId, values);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    const itemsResult = await getPaymentItems(result.data.payment_plan_id);
    setPaymentItems(itemsResult.data || []);
    setStatus("ready");
    setMessage("납부 단계가 수정되었습니다.");
  }

  const paymentTotals = calculatePaymentTotals(paymentPlan, paymentItems);

  return (
    <main className="demo-stage" aria-label="Timor Crest admin portal">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span>Admin</span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active admin-screen phase-shell">
            <div className="admin-topbar">
              <div>
                <span className="eyebrow">ADMIN</span>
                <h1>Dashboard</h1>
              </div>
              <button className="secondary-button shell-logout" onClick={handleLogout} type="button">
                로그아웃
              </button>
            </div>

            <div className="admin-tabs" aria-label="Admin sections">
              {adminTabs.map((label, index) => (
                <button className={index === 0 ? "is-active" : ""} disabled key={label} type="button">
                  {label}
                </button>
              ))}
            </div>

            <section className="admin-panel">
              <div className="metric-grid">
                <article className="metric-card">
                  <span>계약자</span>
                  <strong>{contractors.length}</strong>
                </article>
                <article className="metric-card">
                  <span>호수</span>
                  <strong>{units.length}</strong>
                </article>
              </div>
              <p className="security-note">
                계약자 로그인을 사용하려면 Supabase Auth에서 사용자를 먼저 생성한 뒤, 해당 User UID를 profile_id에 연결하세요.
              </p>
              {message ? <p className="form-error">{message}</p> : null}
              {status === "loading" ? <p>계약자와 호수 정보를 불러오고 있습니다.</p> : null}
            </section>

            <section className="admin-panel">
              <h2>계약자 목록</h2>
              <div className="admin-list">
                {contractors.length ? (
                  contractors.map((contractor) => (
                    <button
                      className={`admin-record-card ${selectedContractor?.id === contractor.id ? "is-selected" : ""}`}
                      key={contractor.id}
                      onClick={() => editContractor(contractor)}
                      type="button"
                    >
                      <span>
                        <strong>{contractor.full_name}</strong>
                        <small>{contractor.email || "이메일 없음"}</small>
                      </span>
                      <span>
                        <strong>{contractor.unit?.unit_code || "호수 미연결"}</strong>
                        <small>{contractor.phone || "연락처 없음"}</small>
                      </span>
                      <span className="status-chip">{contractor.status || "active"}</span>
                    </button>
                  ))
                ) : (
                  <p>등록된 계약자가 없습니다.</p>
                )}
              </div>
            </section>

            <section className="admin-panel">
              <h2>{selectedUnit ? "호수 수정" : "호수 생성"}</h2>
              <form className="admin-form compact-admin-form" onSubmit={submitUnit}>
                <TextField label="unit_code" name="unit_code" onChange={updateUnitField} required value={unitForm.unit_code} />
                <TextField label="unit_name" name="unit_name" onChange={updateUnitField} value={unitForm.unit_name} />
                <TextField label="property_type" name="property_type" onChange={updateUnitField} value={unitForm.property_type} />
                <TextField
                  label="total_price"
                  name="total_price"
                  onChange={updateUnitField}
                  type="number"
                  value={unitForm.total_price}
                />
                <TextField label="currency" name="currency" onChange={updateUnitField} value={unitForm.currency} />
                <TextField label="status" name="status" onChange={updateUnitField} value={unitForm.status} />
                <div className="button-row">
                  <button className="primary-button" disabled={status === "saving"} type="submit">
                    {selectedUnit ? "호수 수정" : "호수 생성"}
                  </button>
                  <button className="secondary-button" onClick={resetUnitForm} type="button">
                    신규 입력
                  </button>
                </div>
              </form>
              <div className="unit-chip-list">
                {units.map((unit) => (
                  <button key={unit.id} onClick={() => editUnit(unit)} type="button">
                    {unit.unit_code}
                  </button>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <h2>{selectedContractor ? "계약자 수정" : "계약자 생성"}</h2>
              <form className="admin-form compact-admin-form" onSubmit={submitContractor}>
                <TextField label="full_name" name="full_name" onChange={updateContractorField} required value={contractorForm.full_name} />
                <TextField label="email" name="email" onChange={updateContractorField} type="email" value={contractorForm.email} />
                <TextField label="phone" name="phone" onChange={updateContractorField} value={contractorForm.phone} />
                <TextField label="passport_no" name="passport_no" onChange={updateContractorField} value={contractorForm.passport_no} />
                <TextField label="address" name="address" onChange={updateContractorField} value={contractorForm.address} />
                <TextField label="status" name="status" onChange={updateContractorField} value={contractorForm.status} />
                <label className="field">
                  <span>unit_id</span>
                  <select name="unit_id" onChange={updateContractorField} value={contractorForm.unit_id}>
                    <option value="">호수 선택</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_code} {unit.unit_name ? `/ ${unit.unit_name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField label="profile_id" name="profile_id" onChange={updateContractorField} value={contractorForm.profile_id} />
                <div className="button-row">
                  <button className="primary-button" disabled={status === "saving"} type="submit">
                    {selectedContractor ? "계약자 수정" : "계약자 생성"}
                  </button>
                  <button className="secondary-button" onClick={resetContractorForm} type="button">
                    신규 입력
                  </button>
                </div>
              </form>
            </section>

            <section className="admin-panel">
              <h2>Payment Management</h2>
              {!selectedContractor ? (
                <p>계약자 목록에서 계약자를 선택하면 납부 계획을 관리할 수 있습니다.</p>
              ) : (
                <>
                  <div className="payment-context-card">
                    <span className="eyebrow">SELECTED CONTRACTOR</span>
                    <strong>{selectedContractor.full_name}</strong>
                    <p>
                      {selectedContractor.email || "이메일 없음"} / {selectedContractor.unit?.unit_code || "호수 미연결"}
                    </p>
                  </div>

                  {!paymentPlan ? (
                    <button className="primary-button" disabled={status === "saving"} onClick={createPlanForSelectedContractor} type="button">
                      Create payment plan
                    </button>
                  ) : (
                    <>
                      <div className="metric-grid">
                        <Metric label="총 계약금액" value={formatMoney(paymentTotals.totalPrice, paymentPlan.currency)} />
                        <Metric label="납부 완료" value={formatMoney(paymentTotals.totalPaidAmount, paymentPlan.currency)} />
                        <Metric label="미납 금액" value={formatMoney(paymentTotals.unpaidAmount, paymentPlan.currency)} />
                        <Metric label="진행률" value={`${paymentTotals.progressPercent}%`} />
                      </div>
                      <form className="admin-form compact-admin-form" onSubmit={submitPaymentPlan}>
                        <TextField
                          label="total_price"
                          name="total_price"
                          onChange={updatePaymentPlanField}
                          type="number"
                          value={paymentPlanForm.total_price}
                        />
                        <TextField label="currency" name="currency" onChange={updatePaymentPlanField} value={paymentPlanForm.currency} />
                        <TextField label="status" name="status" onChange={updatePaymentPlanField} value={paymentPlanForm.status} />
                        <button className="primary-button" disabled={status === "saving"} type="submit">
                          납부 계획 수정
                        </button>
                      </form>

                      {!paymentItems.length ? (
                        <button className="secondary-button" disabled={status === "saving"} onClick={createDefaultItemsForPlan} type="button">
                          기본 8단계 payment_items 생성
                        </button>
                      ) : (
                        <div className="admin-list">
                          {paymentItems.map((item) => (
                            <PaymentItemForm item={item} key={item.id} onSubmit={submitPaymentItem} saving={status === "saving"} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}

function TextField({ defaultValue, label, name, onChange, required = false, type = "text", value }) {
  const inputProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value: value ?? "" };
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} onChange={onChange} required={required} type={type} {...inputProps} />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PaymentItemForm({ item, onSubmit, saving }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(item.id, Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <form className="admin-card payment-item-form" onSubmit={handleSubmit}>
      <header>
        <h3>
          {item.step_no}. {item.title}
        </h3>
        <span className="status-chip">{item.status}</span>
      </header>
      <TextField label="title" name="title" defaultValue={item.title} />
      <TextField label="required_amount" name="required_amount" defaultValue={item.required_amount} type="number" />
      <TextField label="paid_amount" name="paid_amount" defaultValue={item.paid_amount} type="number" />
      <TextField label="due_date" name="due_date" defaultValue={item.due_date || ""} type="date" />
      <TextField label="paid_date" name="paid_date" defaultValue={item.paid_date || ""} type="date" />
      <label className="field">
        <span>status</span>
        <select defaultValue={item.status || "unpaid"} name="status">
          <option value="unpaid">unpaid</option>
          <option value="partial">partial</option>
          <option value="paid">paid</option>
          <option value="overdue">overdue</option>
        </select>
      </label>
      <label className="field">
        <span>note</span>
        <input defaultValue={item.note || ""} name="note" />
      </label>
      <button className="primary-button" disabled={saving} type="submit">
        단계 저장
      </button>
    </form>
  );
}

function formatMoney(value, currency = "USD") {
  return `${Number(value || 0).toLocaleString("ko-KR")} ${currency}`;
}
