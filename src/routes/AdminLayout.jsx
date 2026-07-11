import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedProgress from "../components/AnimatedProgress.jsx";
import ExpandableSelectList from "../components/ExpandableSelectList.jsx";
import {
  createContractor,
  createContractorWithAuth,
  deleteContractor,
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
  getAdminPaymentPlans,
  getPaymentItems,
  getPaymentPlanByContractor,
  updatePaymentItem,
  updatePaymentPlan,
} from "../services/paymentService.js";
import {
  calculateJourneyOverallProgress,
  ensureDefaultJourneySteps,
  getJourneySteps,
  updateJourneyStep,
} from "../services/journeyService.js";
import {
  createDocumentSignedUrl,
  deleteDocument,
  getAdminDocuments,
  getDocumentsByContractor,
  updateDocumentMetadata,
  uploadDocument,
} from "../services/documentService.js";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, formatFileSize } from "../services/documentModel.js";
import { sortContractors, sortUnits } from "../services/adminListModel.js";
import { signOut } from "../services/authService.js";

const adminTabs = [
  ["", "Dashboard"],
  ["contractors", "계약자 관리"],
  ["units", "호수 관리"],
  ["payments", "납부일정 관리"],
  ["journey", "Journey 관리"],
  ["documents", "문서 관리"],
];

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
  temporary_password: "",
};

const emptyPaymentPlanForm = {
  total_price: "",
  currency: "USD",
  status: "active",
};

const emptyDocumentForm = {
  title: "",
  category: "other",
  note: "",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const paymentDetailRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const [units, setUnits] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [contractorForm, setContractorForm] = useState(emptyContractorForm);
  const [manualContractorMode, setManualContractorMode] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [paymentItems, setPaymentItems] = useState([]);
  const [paymentSummaries, setPaymentSummaries] = useState({});
  const [paymentPlanForm, setPaymentPlanForm] = useState(emptyPaymentPlanForm);
  const [journeySteps, setJourneySteps] = useState([]);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentContractorId, setSelectedDocumentContractorId] = useState("");
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentMessage, setDocumentMessage] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) || null, [selectedUnitId, units]);
  const selectedContractor = useMemo(
    () => contractors.find((contractor) => contractor.id === selectedContractorId) || null,
    [contractors, selectedContractorId],
  );
  const selectedDocumentContractor = useMemo(
    () => contractors.find((contractor) => contractor.id === selectedDocumentContractorId) || null,
    [contractors, selectedDocumentContractorId],
  );
  const selectedContractorDocuments = useMemo(
    () => documents.filter((document) => document.contractor_id === selectedDocumentContractorId),
    [documents, selectedDocumentContractorId],
  );
  const sortedContractors = useMemo(() => sortContractors(contractors), [contractors]);
  const sortedUnits = useMemo(() => sortUnits(units), [units]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadPaymentForContractor(selectedContractor);
  }, [selectedContractorId]);

  async function loadDashboard() {
    setStatus("loading");
    setMessage("");
    setJourneyMessage("");
    setDocumentMessage("");
    const [unitResult, contractorResult, planResult, journeyResult, documentResult] = await Promise.all([
      getUnits(),
      getAdminContractors(),
      getAdminPaymentPlans(),
      getJourneySteps(),
      getAdminDocuments(),
    ]);
    if (unitResult.error || contractorResult.error || planResult.error) {
      setStatus("ready");
      setMessage(unitResult.error || contractorResult.error || planResult.error);
      return;
    }
    let nextJourneySteps = journeyResult.data || [];
    let nextJourneyMessage = journeyResult.error || "";
    if (!journeyResult.error && nextJourneySteps.length < 8) {
      const ensuredResult = await ensureDefaultJourneySteps();
      nextJourneySteps = ensuredResult.data || nextJourneySteps;
      nextJourneyMessage = ensuredResult.error || "";
    }
    setUnits(unitResult.data || []);
    setContractors(contractorResult.data || []);
    setJourneySteps(nextJourneySteps);
    setJourneyMessage(nextJourneyMessage);
    setDocuments(documentResult.data || []);
    setDocumentMessage(documentResult.error || "");
    await loadPaymentSummaries(planResult.data || []);
    setStatus("ready");
  }

  async function loadPaymentSummaries(plans) {
    const entries = await Promise.all(
      plans.map(async (plan) => {
        const itemsResult = await getPaymentItems(plan.id);
        const items = itemsResult.data || [];
        return [plan.contractor_id, { plan, items, totals: calculatePaymentTotals(plan, items) }];
      }),
    );
    setPaymentSummaries(Object.fromEntries(entries));
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
      temporary_password: "",
    });
    setManualContractorMode(false);
  }

  function resetContractorForm() {
    setSelectedContractorId("");
    setContractorForm(emptyContractorForm);
    setManualContractorMode(false);
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
      : manualContractorMode
        ? await createContractor(contractorForm)
        : await createContractorWithAuth(contractorForm);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }
    const createdEmail = result.data?.user?.email || contractorForm.email;
    const createdPassword = result.data?.temporary_password || contractorForm.temporary_password;
    resetContractorForm();
    await loadDashboard();
    if (selectedContractorId) {
      setMessage("계약자 정보가 수정되었습니다.");
    } else if (manualContractorMode) {
      setMessage("계약자 정보가 수동 연결 방식으로 생성되었습니다.");
    } else {
      setMessage(`계약자 계정이 생성되었습니다. 로그인 이메일: ${createdEmail} / 임시 비밀번호: ${createdPassword}`);
    }
  }

  async function deleteContractorRecord(contractor) {
    if (!contractor?.id) return;
    if (!window.confirm("이 계약자를 완전히 삭제하시겠습니까? 이 작업은 목록에서 계약자를 제거하며, 연결된 납부/문서 메타데이터에도 영향을 줄 수 있습니다. Auth 계정은 삭제되지 않습니다.")) return;

    setStatus("saving");
    setMessage("");

    const documentResult = await getDocumentsByContractor(contractor.id);
    if (documentResult.error) {
      setStatus("ready");
      setMessage(`계약자 문서 확인에 실패했습니다: ${documentResult.error}`);
      return;
    }

    for (const document of documentResult.data || []) {
      const deletedDocument = await deleteDocument(document.id);
      if (deletedDocument.error) {
        setStatus("ready");
        setMessage(`계약자 문서 Storage cleanup에 실패했습니다: ${deletedDocument.error}`);
        return;
      }
    }

    const result = await deleteContractor(contractor.id);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }

    if (selectedContractorId === contractor.id) resetContractorForm();
    if (selectedDocumentContractorId === contractor.id) {
      setSelectedDocumentContractorId("");
      setDocumentForm(emptyDocumentForm);
      setDocumentFile(null);
      if (documentFileInputRef.current) documentFileInputRef.current.value = "";
    }

    await loadDashboard();
    setMessage("계약자가 목록에서 완전히 삭제되었습니다. Auth user와 profile은 삭제되지 않았습니다.");
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
    await refreshPaymentState(selectedContractor);
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
    await refreshPaymentState(selectedContractor);
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
    await refreshPaymentState(selectedContractor);
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
    await refreshPaymentState(selectedContractor);
    setMessage("납부 단계가 수정되었습니다.");
  }

  async function refreshPaymentState(contractor) {
    await loadPaymentForContractor(contractor);
    const planResult = await getAdminPaymentPlans();
    if (!planResult.error) await loadPaymentSummaries(planResult.data || []);
    setStatus("ready");
  }

  async function submitJourneyStep(stepId, values) {
    setStatus("saving");
    setMessage("");
    setJourneyMessage("");
    const result = await updateJourneyStep(stepId, values);
    if (result.error) {
      setStatus("ready");
      setJourneyMessage(result.error);
      return;
    }
    setJourneySteps((current) => current.map((step) => (step.id === stepId ? result.data : step)));
    setStatus("ready");
    setMessage("Journey 단계가 수정되었습니다.");
  }

  async function ensureJourneyDefaults() {
    setStatus("saving");
    setMessage("");
    setJourneyMessage("");
    const result = await ensureDefaultJourneySteps();
    if (result.error) {
      setStatus("ready");
      setJourneyMessage(result.error);
      return;
    }
    setJourneySteps(result.data || []);
    setStatus("ready");
    setMessage("기본 8단계 Journey가 생성 또는 보완되었습니다.");
  }

  function selectDocumentContractor(contractor) {
    setSelectedDocumentContractorId(contractor.id);
    setDocumentMessage("");
    setDocumentForm(emptyDocumentForm);
    setDocumentFile(null);
    if (documentFileInputRef.current) documentFileInputRef.current.value = "";
  }

  function updateDocumentFormField(event) {
    setDocumentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function showDocumentSelectionError() {
    setDocumentMessage("문서를 업로드할 계약자를 선택해 주세요.");
  }

  async function submitDocumentUpload(event) {
    event.preventDefault();
    if (!selectedDocumentContractor) {
      setDocumentMessage("문서를 업로드할 계약자를 선택해 주세요.");
      return;
    }

    const formValues = Object.fromEntries(new FormData(event.currentTarget));
    if (!String(formValues.title || "").trim()) {
      setDocumentMessage("문서 제목을 입력해 주세요.");
      return;
    }
    if (!String(formValues.category || "").trim()) {
      setDocumentMessage("문서 카테고리를 선택해 주세요.");
      return;
    }
    if (!documentFile) {
      setDocumentMessage("업로드할 파일을 선택해 주세요.");
      return;
    }

    setStatus("saving");
    setDocumentMessage("");
    try {
      const result = await uploadDocument({
        ...formValues,
        contractorId: selectedDocumentContractor.id,
        unitId: selectedDocumentContractor.unit_id,
        file: documentFile,
      });

      if (result.error) {
        setStatus("ready");
        setDocumentMessage(result.error);
        return;
      }

      setDocumentForm(emptyDocumentForm);
      setDocumentFile(null);
      if (documentFileInputRef.current) documentFileInputRef.current.value = "";
      const refreshed = await reloadDocumentsForContractor(selectedDocumentContractor.id);
      setStatus("ready");
      if (refreshed) setDocumentMessage("문서가 업로드되었습니다.");
    } catch (error) {
      setStatus("ready");
      setDocumentMessage(error.message || "문서 업로드에 실패했습니다.");
    }
  }

  async function reloadDocuments() {
    const result = await getAdminDocuments();
    if (result.error) {
      setDocumentMessage(result.error);
      return;
    }
    setDocuments(result.data || []);
  }

  async function reloadDocumentsForContractor(contractorId) {
    const result = await getDocumentsByContractor(contractorId);
    if (result.error) {
      setDocumentMessage(result.error);
      return false;
    }
    setDocuments((current) => [
      ...(result.data || []),
      ...current.filter((document) => document.contractor_id !== contractorId),
    ]);
    return true;
  }

  async function submitDocumentMetadata(documentId, values) {
    setStatus("saving");
    setDocumentMessage("");
    const result = await updateDocumentMetadata(documentId, values);
    if (result.error) {
      setStatus("ready");
      setDocumentMessage(result.error);
      return;
    }
    const refreshed = await reloadDocumentsForContractor(selectedDocumentContractorId);
    setStatus("ready");
    if (refreshed) setDocumentMessage("문서 정보가 수정되었습니다.");
  }

  async function openDocument(filePath) {
    setDocumentMessage("");
    const result = await createDocumentSignedUrl(filePath);
    if (result.error) {
      setDocumentMessage(result.error);
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  }

  async function removeDocument(document) {
    if (!window.confirm(`${document.title} 문서를 삭제할까요?`)) return;

    setStatus("saving");
    setDocumentMessage("");
    const result = await deleteDocument(document.id);
    if (result.error) {
      setStatus("ready");
      setDocumentMessage(result.error);
      return;
    }
    const refreshed = await reloadDocumentsForContractor(selectedDocumentContractorId);
    setStatus("ready");
    if (refreshed) setDocumentMessage("문서가 삭제되었습니다.");
  }

  function selectPaymentContractor(contractor) {
    editContractor(contractor);
    window.setTimeout(() => paymentDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  const activeContractors = contractors.filter((contractor) => contractor.status === "active").length;
  const activeUnits = units.filter((unit) => unit.status === "active").length;
  const paymentTotals = calculatePaymentTotals(paymentPlan, paymentItems);
  const journeyOverallProgress = calculateJourneyOverallProgress(journeySteps);

  const shell = {
    activeContractors,
    activeUnits,
    contractors,
    editContractor,
    editUnit,
    manualContractorMode,
    message,
    paymentDetailRef,
    paymentItems,
    paymentPlan,
    paymentPlanForm,
    paymentSummaries,
    paymentTotals,
    journeyOverallProgress,
    journeyMessage,
    journeySteps,
    ensureJourneyDefaults,
    resetContractorForm,
    resetUnitForm,
    deleteContractorRecord,
    selectPaymentContractor,
    selectedContractor,
    selectedContractorId,
    selectedUnit,
    selectedUnitId,
    status,
    submitContractor,
    submitPaymentItem,
    submitPaymentPlan,
    submitJourneyStep,
    submitUnit,
    units,
    sortedContractors,
    sortedUnits,
    updateContractorField,
    setManualContractorMode,
    updatePaymentPlanField,
    updateUnitField,
    createDefaultItemsForPlan,
    createPlanForSelectedContractor,
    contractorForm,
    documents,
    documentFile,
    documentForm,
    documentMessage,
    openDocument,
    removeDocument,
    selectedContractorDocuments,
    selectedDocumentContractor,
    selectedDocumentContractorId,
    selectDocumentContractor,
    setDocumentFile,
    documentFileInputRef,
    showDocumentSelectionError,
    submitDocumentMetadata,
    submitDocumentUpload,
    unitForm,
    updateDocumentFormField,
  };

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
              {adminTabs.map(([path, label]) => (
                <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} end={path === ""} key={path || "home"} to={path}>
                  {label}
                </NavLink>
              ))}
            </div>
            {message ? <p className="form-error">{message}</p> : null}
            {status === "loading" ? <p>데이터를 불러오고 있습니다.</p> : null}
            <Routes>
              <Route index element={<AdminHome {...shell} />} />
              <Route path="contractors" element={<ContractorsPage {...shell} />} />
              <Route path="units" element={<UnitsPage {...shell} />} />
              <Route path="payments" element={<PaymentsPage {...shell} />} />
              <Route path="journey" element={<JourneyPage {...shell} />} />
              <Route path="documents" element={<DocumentsPage {...shell} />} />
            </Routes>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminHome({
  activeContractors,
  activeUnits,
  editContractor,
  editUnit,
  selectedContractorId,
  selectedUnitId,
  sortedContractors,
  sortedUnits,
}) {
  return (
    <>
      <section className="admin-panel">
        <div className="metric-grid">
          <Metric label="전체 계약자" value={sortedContractors.length} />
          <Metric label="전체 호수" value={sortedUnits.length} />
          <Metric label="active 계약자" value={activeContractors} />
          <Metric label="active 호수" value={activeUnits} />
        </div>
      </section>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage="등록된 호수가 없습니다."
          items={sortedUnits}
          onSelect={editUnit}
          renderPreviewItem={renderUnitPreview}
          renderItem={renderUnitRecord}
          selectedId={selectedUnitId}
          title="호수 목록"
        />
      </section>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage="등록된 계약자가 없습니다."
          items={sortedContractors}
          onSelect={editContractor}
          renderPreviewItem={renderContractorPreview}
          renderItem={renderContractorRecord}
          selectedId={selectedContractorId}
          title="계약자 목록"
        />
      </section>
    </>
  );
}

function ContractorsPage({
  contractorForm,
  deleteContractorRecord,
  editContractor,
  manualContractorMode,
  resetContractorForm,
  selectedContractor,
  selectedContractorId,
  setManualContractorMode,
  sortedContractors,
  sortedUnits,
  status,
  submitContractor,
  updateContractorField,
}) {
  const createButtonLabel = manualContractorMode ? "수동 계약자 생성" : "계약자 계정 생성";

  return (
    <>
      <section className="admin-panel">
        <h2>계약자 목록</h2>
        <p className="security-note">
          기본 생성은 Supabase Auth 사용자, profile, contractor row를 함께 만듭니다. 이미 만든 Auth user를 연결해야 할 때만 수동 연결 모드를 사용하세요.
        </p>
        <ExpandableSelectList
          emptyMessage="등록된 계약자가 없습니다."
          items={sortedContractors}
          onSelect={editContractor}
          renderActions={(contractor) => <DeleteContractorButton contractor={contractor} onDelete={deleteContractorRecord} />}
          renderItem={renderContractorRecord}
          selectedId={selectedContractorId}
          title="계약자 목록"
        />
      </section>
      <section className="admin-panel">
        <h2>{selectedContractor ? "계약자 수정" : createButtonLabel}</h2>
        <form className="admin-form compact-admin-form" onSubmit={submitContractor}>
          <TextField label="full_name" name="full_name" onChange={updateContractorField} required value={contractorForm.full_name} />
          <TextField label="email" name="email" onChange={updateContractorField} required={!selectedContractor && !manualContractorMode} type="email" value={contractorForm.email} />
          {!selectedContractor && !manualContractorMode ? (
            <TextField
              label="temporary_password"
              minLength="8"
              name="temporary_password"
              onChange={updateContractorField}
              required
              type="password"
              value={contractorForm.temporary_password}
            />
          ) : null}
          <TextField label="phone" name="phone" onChange={updateContractorField} value={contractorForm.phone} />
          <TextField label="passport_no" name="passport_no" onChange={updateContractorField} value={contractorForm.passport_no} />
          <TextField label="address" name="address" onChange={updateContractorField} value={contractorForm.address} />
          <TextField label="status" name="status" onChange={updateContractorField} value={contractorForm.status} />
          <label className="field">
            <span>unit_id</span>
            <select name="unit_id" onChange={updateContractorField} value={contractorForm.unit_id}>
              <option value="">호수 선택</option>
              {sortedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_code} {unit.unit_name ? `/ ${unit.unit_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          {selectedContractor || manualContractorMode ? (
            <>
              <p className="security-note">기존 Supabase Auth user와 수동 연결할 때만 User UID를 profile_id에 입력하세요.</p>
              <TextField label="profile_id" name="profile_id" onChange={updateContractorField} value={contractorForm.profile_id} />
            </>
          ) : null}
          {!selectedContractor ? (
            <button
              className="secondary-button"
              onClick={() => setManualContractorMode((current) => !current)}
              type="button"
            >
              {manualContractorMode ? "자동 계정 생성으로 전환" : "기존 Supabase Auth user와 수동 연결"}
            </button>
          ) : null}
          <div className="button-row">
            <button className="primary-button" disabled={status === "saving"} type="submit">
              {status === "saving" ? "저장 중..." : selectedContractor ? "계약자 수정" : createButtonLabel}
            </button>
            <button className="secondary-button" onClick={resetContractorForm} type="button">
              신규 입력
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function UnitsPage({ editUnit, resetUnitForm, selectedUnit, selectedUnitId, sortedUnits, status, submitUnit, unitForm, updateUnitField }) {
  return (
    <>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage="등록된 호수가 없습니다."
          items={sortedUnits}
          onSelect={editUnit}
          renderItem={renderUnitRecord}
          selectedId={selectedUnitId}
          title="호수 목록"
        />
      </section>
      <section className="admin-panel">
        <h2>{selectedUnit ? "호수 수정" : "호수 생성"}</h2>
        <form className="admin-form compact-admin-form" onSubmit={submitUnit}>
          <TextField label="unit_code" name="unit_code" onChange={updateUnitField} required value={unitForm.unit_code} />
          <TextField label="unit_name" name="unit_name" onChange={updateUnitField} value={unitForm.unit_name} />
          <TextField label="property_type" name="property_type" onChange={updateUnitField} value={unitForm.property_type} />
          <TextField label="total_price" name="total_price" onChange={updateUnitField} type="number" value={unitForm.total_price} />
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
      </section>
    </>
  );
}

function PaymentsPage({
  createDefaultItemsForPlan,
  createPlanForSelectedContractor,
  paymentDetailRef,
  paymentItems,
  paymentPlan,
  paymentPlanForm,
  paymentSummaries,
  paymentTotals,
  selectPaymentContractor,
  selectedContractor,
  selectedContractorId,
  sortedContractors,
  status,
  submitPaymentItem,
  submitPaymentPlan,
  updatePaymentPlanField,
}) {
  return (
    <>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage="등록된 계약자가 없습니다."
          items={sortedContractors}
          onSelect={selectPaymentContractor}
          renderItem={(contractor) => renderPaymentContractorRecord(contractor, paymentSummaries[contractor.id])}
          selectedId={selectedContractorId}
          title="납부일정 관리"
        />
      </section>
      <section className="admin-panel" ref={paymentDetailRef}>
        <h2>Payment Management</h2>
        {!selectedContractor ? (
          <p>계약자를 선택하면 납부 상세를 관리할 수 있습니다.</p>
        ) : (
          <>
            <div className="payment-context-card">
              <span className="eyebrow">SELECTED CONTRACTOR</span>
              <strong>{selectedContractor.full_name}</strong>
              <p>{selectedContractor.email || "이메일 없음"} / {selectedContractor.unit?.unit_code || "호수 미연결"}</p>
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
                  <Metric label="필요 금액 합계" value={formatMoney(paymentTotals.totalRequiredAmount, paymentPlan.currency)} />
                </div>
                <AnimatedProgress label="납부 진행률" value={paymentTotals.progressPercent} />
                <form className="admin-form compact-admin-form" onSubmit={submitPaymentPlan}>
                  <TextField label="total_price" name="total_price" onChange={updatePaymentPlanField} type="number" value={paymentPlanForm.total_price} />
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
    </>
  );
}

function JourneyPage({ ensureJourneyDefaults, journeyMessage, journeyOverallProgress, journeySteps, status, submitJourneyStep }) {
  return (
    <>
      <section className="admin-panel">
        <span className="eyebrow">PROJECT JOURNEY</span>
        <h2>Journey 공정 관리</h2>
        <p>이 공정 정보는 전체 프로젝트 공통이며, 수정 내용은 모든 계약자에게 동일하게 표시됩니다.</p>
        <AnimatedProgress label="전체 공정 진행률" value={journeyOverallProgress} />
        {journeySteps.length < 8 ? (
          <button className="secondary-button journey-default-button" disabled={status === "saving"} onClick={ensureJourneyDefaults} type="button">
            기본 8단계 Journey 생성/보완
          </button>
        ) : null}
      </section>
      {journeyMessage ? <p className="form-error">{journeyMessage}</p> : null}
      <section className="admin-panel">
        <h2>8단계 공정</h2>
        <div className="admin-list">
          {journeySteps.length ? (
            journeySteps.map((step) => <JourneyStepForm item={step} key={step.id} onSubmit={submitJourneyStep} saving={status === "saving"} />)
          ) : (
            <p>Journey 단계가 아직 등록되지 않았습니다. migration seed를 확인해 주세요.</p>
          )}
        </div>
      </section>
    </>
  );
}

function DocumentsPage({
  documentFile,
  documentFileInputRef,
  documentForm,
  documentMessage,
  openDocument,
  removeDocument,
  selectedContractorDocuments,
  selectedDocumentContractor,
  selectDocumentContractor,
  selectedDocumentContractorId,
  setDocumentFile,
  showDocumentSelectionError,
  sortedContractors,
  status,
  submitDocumentMetadata,
  submitDocumentUpload,
  updateDocumentFormField,
}) {
  const isUploading = status === "saving";

  return (
    <>
      <section className="admin-panel">
        <span className="eyebrow">DOCUMENTS</span>
        <h2>문서 관리</h2>
        <p className="security-note">
          문서는 private Storage bucket에 저장되며, 계약자는 자기 contractor_id 폴더의 문서만 signed URL로 열 수 있습니다.
        </p>
        <ExpandableSelectList
          emptyMessage="등록된 계약자가 없습니다."
          items={sortedContractors}
          onSelect={selectDocumentContractor}
          renderItem={renderContractorRecord}
          selectedId={selectedDocumentContractorId}
          title="계약자 선택"
        />
      </section>
      {documentMessage ? <p className="form-error">{documentMessage}</p> : null}
      <section className="admin-panel">
        <h2>문서 업로드</h2>
        {!selectedDocumentContractor ? (
          <>
            <p>계약자를 선택하면 해당 계약자에게 문서를 업로드할 수 있습니다.</p>
            <button className="primary-button document-open-button" onClick={showDocumentSelectionError} type="button">
              문서 업로드
            </button>
          </>
        ) : (
          <>
            <div className="payment-context-card">
              <span className="eyebrow">SELECTED CONTRACTOR</span>
              <strong>{selectedDocumentContractor.full_name}</strong>
              <p>{selectedDocumentContractor.email || "이메일 없음"} / {selectedDocumentContractor.unit?.unit_code || "호수 미연결"}</p>
            </div>
            <form className="admin-form compact-admin-form" key={selectedDocumentContractor.id} onSubmit={submitDocumentUpload}>
              <TextField label="title" name="title" onChange={updateDocumentFormField} value={documentForm.title} />
              <label className="field">
                <span>category</span>
                <select name="category" onChange={updateDocumentFormField} value={documentForm.category}>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>file</span>
                <input
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                  ref={documentFileInputRef}
                  type="file"
                />
              </label>
              {documentFile ? <p className="file-hint">{documentFile.name} / {formatFileSize(documentFile.size)}</p> : null}
              <TextAreaField label="note" name="note" onChange={updateDocumentFormField} value={documentForm.note} />
              <button className="primary-button" disabled={isUploading} type="submit">
                {isUploading ? "업로드 중..." : "문서 업로드"}
              </button>
            </form>
          </>
        )}
      </section>
      <section className="admin-panel">
        <h2>선택 계약자 문서</h2>
        {!selectedDocumentContractor ? (
          <p>문서 목록을 보려면 계약자를 선택해 주세요.</p>
        ) : (
          <div className="document-list">
            {selectedContractorDocuments.length ? (
              selectedContractorDocuments.map((document) => (
                <AdminDocumentCard
                  document={document}
                  key={document.id}
                  onDelete={removeDocument}
                  onOpen={openDocument}
                  onSubmit={submitDocumentMetadata}
                  saving={status === "saving"}
                />
              ))
            ) : (
              <p>선택한 계약자에게 등록된 문서가 없습니다.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function renderContractorRecord(contractor) {
  return (
    <>
      <span>
        <strong>{contractor.full_name}</strong>
        <small>{contractor.status || "active"}</small>
      </span>
      <span>
        <strong>{contractor.email || "이메일 없음"}</strong>
        <small>{contractor.phone || "연락처 없음"}</small>
      </span>
      <span>
        <strong>{contractor.unit?.unit_code || "호수 미연결"}</strong>
        <small>{formatDate(contractor.created_at)}</small>
      </span>
    </>
  );
}

function renderPaymentContractorRecord(contractor, summary) {
  return (
    <>
      <span>
        <strong>{contractor.full_name}</strong>
        <small>{contractor.email || "이메일 없음"}</small>
      </span>
      <span>
        <strong>{contractor.unit?.unit_code || "호수 미연결"}</strong>
        <small>{contractor.status || "active"}</small>
      </span>
      <span>
        <strong>{summary ? `${summary.totals.progressPercent}%` : "미생성"}</strong>
        <small>{summary ? `${summary.items.length}/8 단계` : "payment plan 없음"}</small>
      </span>
    </>
  );
}

function renderUnitRecord(unit) {
  return (
    <>
      <span>
        <strong>{unit.unit_code}</strong>
        <small>{unit.status || "active"}</small>
      </span>
      <span>
        <strong>{unit.unit_name || "이름 미등록"}</strong>
        <small>{unit.property_type || "타입 미등록"}</small>
      </span>
      <span>
        <strong>{formatMoney(unit.total_price, unit.currency)}</strong>
        <small>{formatDate(unit.created_at)}</small>
      </span>
    </>
  );
}

function renderContractorPreview(contractor) {
  return (
    <span className="compact-preview-name">{contractor.full_name || "이름 미등록"}</span>
  );
}

function renderUnitPreview(unit) {
  return (
    <span className="compact-preview-name">{unit.unit_code || unit.unit_name || "호수 미등록"}</span>
  );
}

function DeleteContractorButton({ contractor, onDelete }) {
  return (
    <button className="danger-button delete-button" onClick={() => onDelete(contractor)} type="button">
      삭제
    </button>
  );
}

function TextField({ defaultValue, label, max, min, minLength, name, onChange, required = false, step, type = "text", value }) {
  const inputProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value: value ?? "" };
  return (
    <label className="field">
      <span>{label}</span>
      <input max={max} min={min} minLength={minLength} name={name} onChange={onChange} required={required} step={step} type={type} {...inputProps} />
    </label>
  );
}

function AdminDocumentCard({ document, onDelete, onOpen, onSubmit, saving }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(document.id, Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <article className="document-card admin-document-card">
      <header>
        <div>
          <span className="document-kind">{document.category}</span>
          <h3>{document.title}</h3>
          <p className="file-name">{document.file_name}</p>
        </div>
        <span className="status-chip">{document.status}</span>
      </header>
      <div className="stage-meta">
        <MiniStat label="파일 크기" value={formatFileSize(document.file_size)} />
        <MiniStat label="등록일" value={formatDate(document.created_at)} />
      </div>
      {document.note ? <p>{document.note}</p> : null}
      <div className="button-row document-actions">
        <button className="secondary-button" onClick={() => onOpen(document.file_path)} type="button">
          열기 / 다운로드
        </button>
        <button className="danger-button" disabled={saving} onClick={() => onDelete(document)} type="button">
          문서 삭제
        </button>
      </div>
      <form className="admin-form compact-admin-form document-metadata-form" onSubmit={handleSubmit}>
        <TextField label="title" name="title" defaultValue={document.title} required />
        <label className="field">
          <span>category</span>
          <select defaultValue={document.category || "other"} name="category">
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>status</span>
          <select defaultValue={document.status || "active"} name="status">
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <TextAreaField label="note" name="note" defaultValue={document.note || ""} />
        <button className="primary-button" disabled={saving} type="submit">
          문서 정보 저장
        </button>
      </form>
    </article>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function JourneyStepForm({ item, onSubmit, saving }) {
  const [progress, setProgress] = useState(clampProgress(item.progress_percent));

  useEffect(() => {
    setProgress(clampProgress(item.progress_percent));
  }, [item.progress_percent]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(item.id, Object.fromEntries(new FormData(event.currentTarget)));
  }

  function updateProgress(event) {
    setProgress(clampProgress(event.target.value));
  }

  return (
    <form className="admin-card journey-step-form" onSubmit={handleSubmit}>
      <header>
        <div>
          <span className="eyebrow">STEP {item.step_no}</span>
          <h3>{item.title}</h3>
        </div>
        <JourneyStatusChip status={item.status} />
      </header>
      <TextField label="title" name="title" defaultValue={item.title} required />
      <TextField label="subtitle" name="subtitle" defaultValue={item.subtitle || ""} />
      <TextAreaField label="description" name="description" defaultValue={item.description || ""} />
      <label className="field">
        <span>status</span>
        <select defaultValue={item.status || "pending"} name="status">
          <option value="pending">pending</option>
          <option value="in_progress">in_progress</option>
          <option value="completed">completed</option>
          <option value="delayed">delayed</option>
        </select>
      </label>
      <label className="field progress-edit-field">
        <span>progress_percent</span>
        <input aria-label={`STEP ${item.step_no} 진행률 슬라이더`} max="100" min="0" onChange={updateProgress} type="range" value={progress} />
      </label>
      <TextField label="progress_percent 숫자" name="progress_percent" max="100" min="0" onChange={updateProgress} step="1" type="number" value={progress} />
      <TextField label="target_date" name="target_date" defaultValue={item.target_date || ""} type="date" />
      <TextField label="completed_date" name="completed_date" defaultValue={item.completed_date || ""} type="date" />
      <TextAreaField label="note" name="note" defaultValue={item.note || ""} />
      <button className="primary-button" disabled={saving} type="submit">
        Journey 저장
      </button>
    </form>
  );
}

function TextAreaField({ defaultValue, label, name, onChange, value }) {
  const textareaProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value: value ?? "" };
  return (
    <label className="field">
      <span>{label}</span>
      <textarea name={name} onChange={onChange} rows="3" {...textareaProps} />
    </label>
  );
}

function JourneyStatusChip({ status }) {
  return <span className={`status-chip status-${status || "pending"}`}>{formatJourneyStatus(status)}</span>;
}

function clampProgress(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(Math.round(next), 100));
}

function formatJourneyStatus(status) {
  return {
    completed: "완료",
    delayed: "지연",
    in_progress: "진행 중",
    pending: "대기",
  }[status] || status || "대기";
}

function formatMoney(value, currency = "USD") {
  return `${Number(value || 0).toLocaleString("ko-KR")} ${currency || "USD"}`;
}

function formatDate(value) {
  if (!value) return "미등록";
  return new Date(value).toLocaleDateString("ko-KR");
}
