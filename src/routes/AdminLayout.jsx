import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedProgress from "../components/AnimatedProgress.jsx";
import CollapsiblePanel from "../components/CollapsiblePanel.jsx";
import ExpandableSelectList from "../components/ExpandableSelectList.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import {
  createContractor,
  createContractorWithAuth,
  deleteContractor,
  createUnit,
  getAdminContractors,
  getUnits,
  updateContractor,
  updateContractorPaymentMethod,
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
import { getPaymentStepTitle } from "../services/paymentModel.js";
import {
  calculateJourneyOverallProgress,
  ensureDefaultJourneySteps,
  getJourneySteps,
  updateJourneyStep,
} from "../services/journeyService.js";
import { getChangedJourneyStepPayloads, getJourneyStepTitle, normalizeProgressPercent } from "../services/journeyModel.js";
import {
  createDocumentSignedUrl,
  deleteDocument,
  getAdminDocuments,
  getDocumentsByContractor,
  updateDocumentMetadata,
  uploadDocument,
} from "../services/documentService.js";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, formatFileSize } from "../services/documentModel.js";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage.js";
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

const UNIT_PAGE_SIZE = 10;

const emptyUnitForm = {
  unit_code: "",
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

const emptyPaymentMethodForm = {
  payment_method: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
};

const emptyDocumentForm = {
  title: "",
  category: "other",
  note: "",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const paymentDetailRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const [units, setUnits] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [unitPage, setUnitPage] = useState(1);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [contractorForm, setContractorForm] = useState(emptyContractorForm);
  const [manualContractorMode, setManualContractorMode] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [paymentItems, setPaymentItems] = useState([]);
  const [paymentSummaries, setPaymentSummaries] = useState({});
  const [paymentPlanForm, setPaymentPlanForm] = useState(emptyPaymentPlanForm);
  const [paymentMethodForm, setPaymentMethodForm] = useState(emptyPaymentMethodForm);
  const [journeyOriginalSteps, setJourneyOriginalSteps] = useState([]);
  const [journeySteps, setJourneySteps] = useState([]);
  const [journeyMessage, setJourneyMessage] = useAutoDismissMessage("", 10000);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentContractorId, setSelectedDocumentContractorId] = useState("");
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentMessage, setDocumentMessage] = useAutoDismissMessage("", 10000);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useAutoDismissMessage("", 10000);

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
  const contractorByUnitId = useMemo(() => {
    const nextContractorByUnitId = new Map();
    for (const contractor of sortedContractors) {
      if (!contractor.unit_id || ["archived", "deleted"].includes(contractor.status)) continue;
      if (!nextContractorByUnitId.has(contractor.unit_id)) {
        nextContractorByUnitId.set(contractor.unit_id, contractor.full_name || "empty");
      }
    }

    return nextContractorByUnitId;
  }, [sortedContractors]);
  const sortedUnits = useMemo(
    () => sortUnits(units).map((unit) => ({ ...unit, assignedContractorName: contractorByUnitId.get(unit.id) || "empty" })),
    [contractorByUnitId, units],
  );
  const unitPageCount = Math.max(1, Math.ceil(sortedUnits.length / UNIT_PAGE_SIZE));
  const paginatedUnits = useMemo(() => {
    const startIndex = (unitPage - 1) * UNIT_PAGE_SIZE;
    return sortedUnits.slice(startIndex, startIndex + UNIT_PAGE_SIZE);
  }, [sortedUnits, unitPage]);
  const journeyChanges = useMemo(
    () => getChangedJourneyStepPayloads(journeyOriginalSteps, journeySteps),
    [journeyOriginalSteps, journeySteps],
  );
  const hasJourneyChanges = journeyChanges.length > 0;

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setUnitPage((current) => Math.min(current, Math.max(1, Math.ceil(sortedUnits.length / UNIT_PAGE_SIZE))));
  }, [sortedUnits.length]);

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
    setJourneyOriginalSteps(nextJourneySteps);
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
    setPaymentMethodForm(buildPaymentMethodForm(contractor));
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

  function changeUnitPage(nextPage) {
    const nextUnitPage = Math.min(Math.max(nextPage, 1), unitPageCount);
    const startIndex = (nextUnitPage - 1) * UNIT_PAGE_SIZE;
    const nextPageUnitIds = new Set(sortedUnits.slice(startIndex, startIndex + UNIT_PAGE_SIZE).map((unit) => unit.id));

    if (selectedUnitId && !nextPageUnitIds.has(selectedUnitId)) {
      resetUnitForm();
    }
    setUnitPage(nextUnitPage);
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

  function updatePaymentMethodField(event) {
    setPaymentMethodForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
    setUnitPage(1);
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
      setMessage(`${t("계약자 계정이 생성되었습니다.")} ${t("로그인 이메일")}: ${createdEmail} / ${t("임시 비밀번호")}: ${createdPassword}`);
    }
  }

  async function deleteContractorRecord(contractor) {
    if (!contractor?.id) return;
    if (!window.confirm(t("이 계약자를 완전히 삭제하시겠습니까? 이 작업은 목록에서 계약자를 제거하며, 연결된 납부/문서 메타데이터에 영향을 줄 수 있습니다. Auth 계정은 삭제되지 않습니다."))) return;

    setStatus("saving");
    setMessage("");

    const documentResult = await getDocumentsByContractor(contractor.id);
    if (documentResult.error) {
      setStatus("ready");
      setMessage(`${t("계약자 문서 확인에 실패했습니다")}: ${documentResult.error}`);
      return;
    }

    for (const document of documentResult.data || []) {
      const deletedDocument = await deleteDocument(document.id);
      if (deletedDocument.error) {
        setStatus("ready");
        setMessage(`${t("계약자 문서 Storage cleanup에 실패했습니다")}: ${deletedDocument.error}`);
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

  async function submitPaymentMethod(event) {
    event.preventDefault();
    if (!selectedContractor) return;
    if (paymentMethodForm.payment_method === "bank_transfer") {
      const missingBankField = !paymentMethodForm.bank_name.trim()
        || !paymentMethodForm.bank_account_number.trim()
        || !paymentMethodForm.bank_account_holder.trim();
      if (missingBankField) {
        setMessage(t("계좌이체 선택 시 은행명, 계좌번호, 계좌명을 모두 입력해 주세요."));
        return;
      }
    }

    setStatus("saving");
    setMessage("");
    const result = await updateContractorPaymentMethod(selectedContractor.id, paymentMethodForm);
    if (result.error) {
      setStatus("ready");
      setMessage(result.error);
      return;
    }

    setContractors((current) => current.map((contractor) => (contractor.id === selectedContractor.id ? result.data : contractor)));
    setPaymentMethodForm(buildPaymentMethodForm(result.data));
    setStatus("ready");
    setMessage("납부방법이 저장되었습니다.");
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

  function updateJourneyDraftStep(stepId, field, value) {
    setJourneySteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? {
              ...step,
              [field]: field === "progress_percent" ? normalizeProgressPercent(value) : value,
            }
          : step,
      ),
    );
  }

  async function submitJourneyChanges() {
    const changes = getChangedJourneyStepPayloads(journeyOriginalSteps, journeySteps);
    if (!changes.length) return;

    setStatus("saving");
    setMessage("");
    setJourneyMessage("");
    const results = await Promise.all(changes.map((change) => updateJourneyStep(change.id, change.values)));
    const failedResult = results.find((result) => result.error);
    if (failedResult) {
      setStatus("ready");
      setJourneyMessage(failedResult.error);
      return;
    }
    const updatedById = new Map(results.filter((result) => result.data?.id).map((result) => [result.data.id, result.data]));
    const nextSteps = journeySteps.map((step) => updatedById.get(step.id) || step);
    setJourneyOriginalSteps(nextSteps);
    setJourneySteps(nextSteps);
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
    setJourneyOriginalSteps(result.data || []);
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
    if (!window.confirm(t("이 문서를 삭제하시겠습니까?"))) return;

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
    paymentMethodForm,
    paymentSummaries,
    paymentTotals,
    hasJourneyChanges,
    journeyOverallProgress,
    journeyMessage,
    journeySteps,
    language,
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
    submitPaymentMethod,
    submitPaymentPlan,
    submitJourneyChanges,
    submitUnit,
    units,
    sortedContractors,
    sortedUnits,
    paginatedUnits,
    unitPage,
    unitPageCount,
    changeUnitPage,
    updateContractorField,
    setManualContractorMode,
    updatePaymentPlanField,
    updatePaymentMethodField,
    updateJourneyDraftStep,
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
    t,
  };

  return (
    <main className="demo-stage" aria-label="Timor Crest admin portal">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span className="status-actions">
            <span>{t("Admin")}</span>
            <LanguageToggle />
          </span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active admin-screen phase-shell">
            <div className="admin-topbar">
              <div>
                <span className="eyebrow">ADMIN</span>
                <h1>{t("Dashboard")}</h1>
              </div>
              <button className="secondary-button shell-logout" onClick={handleLogout} type="button">
                {t("로그아웃")}
              </button>
            </div>
            <div className="admin-tabs" aria-label="Admin sections">
              {adminTabs.map(([path, label]) => (
                <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} end={path === ""} key={path || "home"} to={path}>
                  {t(label)}
                </NavLink>
              ))}
            </div>
            {message ? <p className="form-error">{t(message)}</p> : null}
            {status === "loading" ? <p>{t("데이터를 불러오고 있습니다.")}</p> : null}
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
  t,
}) {
  return (
    <>
      <section className="admin-panel">
        <div className="metric-grid">
          <Metric label={t("전체 계약자")} value={sortedContractors.length} />
          <Metric label={t("전체 호수")} value={sortedUnits.length} />
          <Metric label={t("active 계약자")} value={activeContractors} />
          <Metric label={t("active 호수")} value={activeUnits} />
        </div>
      </section>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage={t("등록된 호수가 없습니다.")}
          items={sortedUnits}
          onSelect={editUnit}
          renderPreviewItem={(unit) => renderUnitPreview(unit, t)}
          renderItem={(unit) => renderUnitRecord(unit, t)}
          selectedId={selectedUnitId}
          title={t("호수 목록")}
        />
      </section>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage={t("등록된 계약자가 없습니다.")}
          items={sortedContractors}
          onSelect={editContractor}
          renderPreviewItem={(contractor) => renderContractorPreview(contractor, t)}
          renderItem={(contractor) => renderContractorRecord(contractor, t)}
          selectedId={selectedContractorId}
          title={t("계약자 목록")}
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
  t,
  updateContractorField,
}) {
  const createButtonLabel = manualContractorMode ? t("수동 계약자 생성") : t("계약자 계정 생성");

  return (
    <>
      <section className="admin-panel">
        <h2>{t("계약자 목록")}</h2>
        <p className="security-note">
          {t("기본 생성은 Supabase Auth 사용자, profile, contractor row를 함께 만듭니다. 이미 만든 Auth user를 연결해야 할 때만 수동 연결 모드를 사용하세요.")}
        </p>
        <ExpandableSelectList
          emptyMessage={t("등록된 계약자가 없습니다.")}
          items={sortedContractors}
          onSelect={editContractor}
          renderActions={(contractor) => <DeleteContractorButton contractor={contractor} onDelete={deleteContractorRecord} t={t} />}
          renderItem={(contractor) => renderContractorRecord(contractor, t)}
          selectedId={selectedContractorId}
          title={t("계약자 목록")}
        />
      </section>
      <CollapsiblePanel
        className="admin-panel"
        defaultExpanded={!sortedContractors.length || Boolean(selectedContractor)}
        summary={selectedContractor ? t("{name} 정보를 수정합니다.", { name: selectedContractor.full_name }) : t("새 계약자 계정과 계약 정보를 등록합니다.")}
        title={selectedContractor ? t("계약자 수정") : createButtonLabel}
      >
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
                  {unit.unit_code}
                </option>
              ))}
            </select>
          </label>
          {selectedContractor || manualContractorMode ? (
            <>
              <p className="security-note">{t("기존 Supabase Auth user와 수동 연결할 때만 User UID를 profile_id에 입력하세요.")}</p>
              <TextField label="profile_id" name="profile_id" onChange={updateContractorField} value={contractorForm.profile_id} />
            </>
          ) : null}
          {!selectedContractor ? (
            <button
              className="secondary-button"
              onClick={() => setManualContractorMode((current) => !current)}
              type="button"
            >
              {manualContractorMode ? t("자동 계정 생성으로 전환") : t("기존 Supabase Auth user와 수동 연결")}
            </button>
          ) : null}
          <div className="button-row">
            <button className="primary-button" disabled={status === "saving"} type="submit">
              {status === "saving" ? t("저장 중...") : selectedContractor ? t("계약자 수정") : createButtonLabel}
            </button>
            <button className="secondary-button" onClick={resetContractorForm} type="button">
              {t("신규 입력")}
            </button>
          </div>
        </form>
      </CollapsiblePanel>
    </>
  );
}

function UnitsPage({
  changeUnitPage,
  editUnit,
  paginatedUnits,
  resetUnitForm,
  selectedUnit,
  selectedUnitId,
  sortedUnits,
  status,
  submitUnit,
  unitForm,
  unitPage,
  unitPageCount,
  t,
  updateUnitField,
}) {
  return (
    <>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage={t("등록된 호수가 없습니다.")}
          items={paginatedUnits}
          onSelect={editUnit}
          renderItem={(unit) => renderUnitRecord(unit, t)}
          selectedId={selectedUnitId}
          title={t("호수 목록")}
        />
        {unitPageCount > 1 ? (
          <div className="pagination unit-pagination" aria-label="호수 목록 페이지">
            <button disabled={unitPage === 1} onClick={() => changeUnitPage(unitPage - 1)} type="button">
              {t("이전")}
            </button>
            <span>{unitPage} / {unitPageCount}</span>
            <button disabled={unitPage === unitPageCount} onClick={() => changeUnitPage(unitPage + 1)} type="button">
              {t("다음")}
            </button>
          </div>
        ) : null}
      </section>
      <CollapsiblePanel
        className="admin-panel"
        defaultExpanded={!sortedUnits.length || Boolean(selectedUnit)}
        summary={selectedUnit ? t("{name} 정보를 수정합니다.", { name: selectedUnit.unit_code || selectedUnit.unit_name || t("선택 호수") }) : t("새 호수 정보를 등록합니다.")}
        title={selectedUnit ? t("호수 수정") : t("호수 생성")}
      >
        <form className="admin-form compact-admin-form" onSubmit={submitUnit}>
          <TextField label="unit_code" name="unit_code" onChange={updateUnitField} required value={unitForm.unit_code} />
          <TextField label="property_type" name="property_type" onChange={updateUnitField} value={unitForm.property_type} />
          <TextField label="total_price" name="total_price" onChange={updateUnitField} type="number" value={unitForm.total_price} />
          <TextField label="currency" name="currency" onChange={updateUnitField} value={unitForm.currency} />
          <TextField label="status" name="status" onChange={updateUnitField} value={unitForm.status} />
          <div className="button-row">
            <button className="primary-button" disabled={status === "saving"} type="submit">
              {selectedUnit ? t("호수 수정") : t("호수 생성")}
            </button>
            <button className="secondary-button" onClick={resetUnitForm} type="button">
              {t("신규 입력")}
            </button>
          </div>
        </form>
      </CollapsiblePanel>
    </>
  );
}

function PaymentsPage({
  createDefaultItemsForPlan,
  createPlanForSelectedContractor,
  paymentDetailRef,
  paymentItems,
  paymentMethodForm,
  paymentPlan,
  paymentPlanForm,
  paymentSummaries,
  paymentTotals,
  language,
  selectPaymentContractor,
  selectedContractor,
  selectedContractorId,
  sortedContractors,
  status,
  submitPaymentItem,
  submitPaymentMethod,
  submitPaymentPlan,
  t,
  updatePaymentMethodField,
  updatePaymentPlanField,
}) {
  return (
    <>
      <section className="admin-panel">
        <ExpandableSelectList
          emptyMessage={t("등록된 계약자가 없습니다.")}
          items={sortedContractors}
          onSelect={selectPaymentContractor}
          renderItem={(contractor) => renderPaymentContractorRecord(contractor, paymentSummaries[contractor.id], t)}
          selectedId={selectedContractorId}
          title={t("납부일정 관리")}
        />
      </section>
      <section className="admin-panel" ref={paymentDetailRef}>
        <h2>{t("Payment Management")}</h2>
        {!selectedContractor ? (
          <p>{t("계약자를 선택하면 납부 상세를 관리할 수 있습니다.")}</p>
        ) : (
          <>
            <div className="payment-context-card">
              <span className="eyebrow">SELECTED CONTRACTOR</span>
              <strong>{selectedContractor.full_name}</strong>
              <p>{selectedContractor.email || t("이메일 없음")} / {selectedContractor.unit?.unit_code || t("호수 미연결")}</p>
            </div>
            <PaymentMethodForm
              form={paymentMethodForm}
              onChange={updatePaymentMethodField}
              onSubmit={submitPaymentMethod}
              saving={status === "saving"}
              t={t}
            />
            {!paymentPlan ? (
              <button className="primary-button" disabled={status === "saving"} onClick={createPlanForSelectedContractor} type="button">
                {t("납부 계획 생성")}
              </button>
            ) : (
              <>
                <div className="metric-grid">
                  <Metric label={t("총 계약금액")} value={formatMoney(paymentTotals.totalPrice, paymentPlan.currency)} />
                  <Metric label={t("납부 완료")} value={formatMoney(paymentTotals.totalPaidAmount, paymentPlan.currency)} />
                  <Metric label={t("미납 금액")} value={formatMoney(paymentTotals.unpaidAmount, paymentPlan.currency)} />
                  <Metric label={t("필요 금액 합계")} value={formatMoney(paymentTotals.totalRequiredAmount, paymentPlan.currency)} />
                </div>
                <AnimatedProgress label={t("납부 진행률")} value={paymentTotals.progressPercent} />
                <CollapsiblePanel
                  className="payment-plan-panel-admin"
                  summary={`${t("총 계약금액")} ${formatMoney(paymentPlanForm.total_price, paymentPlanForm.currency)} · ${formatDisplayStatus(paymentPlanForm.status, t)}`}
                  title={t("납부관리방법 수정")}
                >
                  <form className="admin-form compact-admin-form" onSubmit={submitPaymentPlan}>
                    <TextField label="total_price" name="total_price" onChange={updatePaymentPlanField} type="number" value={paymentPlanForm.total_price} />
                    <TextField label="currency" name="currency" onChange={updatePaymentPlanField} value={paymentPlanForm.currency} />
                    <TextField label="status" name="status" onChange={updatePaymentPlanField} value={paymentPlanForm.status} />
                    <button className="primary-button" disabled={status === "saving"} type="submit">
                      {t("납부 계획 수정")}
                    </button>
                  </form>
                </CollapsiblePanel>
                <CollapsiblePanel
                  className="payment-schedule-panel-admin"
                  summary={formatPaymentScheduleSummary(paymentItems, paymentTotals, paymentPlan.currency, t)}
                  title={t("단계별 납부일정")}
                >
                  {!paymentItems.length ? (
                    <button className="secondary-button" disabled={status === "saving"} onClick={createDefaultItemsForPlan} type="button">
                      {t("기본 8단계 payment_items 생성")}
                    </button>
                  ) : (
                    <div className="admin-list">
                      {paymentItems.map((item) => (
                        <PaymentItemForm item={item} key={item.id} language={language} onSubmit={submitPaymentItem} saving={status === "saving"} t={t} />
                      ))}
                    </div>
                  )}
                </CollapsiblePanel>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

function JourneyPage({
  ensureJourneyDefaults,
  hasJourneyChanges,
  journeyMessage,
  journeyOverallProgress,
  journeySteps,
  language,
  status,
  submitJourneyChanges,
  t,
  updateJourneyDraftStep,
}) {
  return (
    <>
      <section className="admin-panel">
        <span className="eyebrow">PROJECT JOURNEY</span>
        <h2>{t("Journey 공정 관리")}</h2>
        <p>{t("이 공정 정보는 전체 프로젝트 공통이며, 수정 내용은 모든 계약자에게 동일하게 표시됩니다.")}</p>
        <AnimatedProgress label={t("전체 공정 진행률")} value={journeyOverallProgress} />
        {journeySteps.length < 8 ? (
          <button className="secondary-button journey-default-button" disabled={status === "saving"} onClick={ensureJourneyDefaults} type="button">
            {t("기본 8단계 Journey 생성/보완")}
          </button>
        ) : null}
      </section>
      {journeyMessage ? <p className="form-error">{t(journeyMessage)}</p> : null}
      <section className="admin-panel">
        <h2>{t("8단계 공정")}</h2>
        <div className="admin-list">
          {journeySteps.length ? (
            journeySteps.map((step) => (
              <JourneyStepForm item={step} key={step.id} language={language} onChange={updateJourneyDraftStep} t={t} />
            ))
          ) : (
            <p>{t("Journey 단계가 아직 등록되지 않았습니다. migration seed를 확인해 주세요.")}</p>
          )}
        </div>
        {journeySteps.length ? (
          <button
            className="primary-button journey-save-button"
            disabled={!hasJourneyChanges || status === "saving"}
            onClick={submitJourneyChanges}
            type="button"
          >
            {status === "saving" ? t("저장 중...") : t("Journey 저장")}
          </button>
        ) : null}
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
  t,
  updateDocumentFormField,
}) {
  const isUploading = status === "saving";

  return (
    <>
      <section className="admin-panel">
        <span className="eyebrow">DOCUMENTS</span>
        <h2>{t("문서 관리")}</h2>
        <p className="security-note">
          {t("문서는 private Storage bucket에 저장되며, 계약자는 자기 contractor_id 폴더의 문서만 signed URL로 열 수 있습니다.")}
        </p>
        <ExpandableSelectList
          emptyMessage={t("등록된 계약자가 없습니다.")}
          items={sortedContractors}
          onSelect={selectDocumentContractor}
          renderItem={(contractor) => renderContractorRecord(contractor, t)}
          selectedId={selectedDocumentContractorId}
          title={t("계약자 선택")}
        />
      </section>
      {documentMessage ? <p className="form-error">{t(documentMessage)}</p> : null}
      <section className="admin-panel">
        <h2>{t("문서 업로드")}</h2>
        {!selectedDocumentContractor ? (
          <>
            <p>{t("계약자를 선택하면 해당 계약자에게 문서를 업로드할 수 있습니다.")}</p>
            <button className="primary-button document-open-button" onClick={showDocumentSelectionError} type="button">
              {t("문서 업로드")}
            </button>
          </>
        ) : (
          <>
            <div className="payment-context-card">
              <span className="eyebrow">SELECTED CONTRACTOR</span>
              <strong>{selectedDocumentContractor.full_name}</strong>
              <p>{selectedDocumentContractor.email || t("이메일 없음")} / {selectedDocumentContractor.unit?.unit_code || t("호수 미연결")}</p>
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
                {isUploading ? t("업로드 중...") : t("문서 업로드")}
              </button>
            </form>
          </>
        )}
      </section>
      <CollapsiblePanel
        className="admin-panel"
        defaultExpanded={Boolean(selectedDocumentContractor && !selectedContractorDocuments.length)}
        summary={formatDocumentPanelSummary(selectedDocumentContractor, selectedContractorDocuments, t)}
        title={t("선택 계약자 문서")}
      >
        {!selectedDocumentContractor ? (
          <p>{t("문서 목록을 보려면 계약자를 선택해 주세요.")}</p>
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
                  t={t}
                />
              ))
            ) : (
              <p>{t("선택한 계약자에게 등록된 문서가 없습니다.")}</p>
            )}
          </div>
        )}
      </CollapsiblePanel>
    </>
  );
}

function renderContractorRecord(contractor, t) {
  return (
    <>
      <span>
        <strong>{contractor.full_name}</strong>
        <small>{formatDisplayStatus(contractor.status, t)}</small>
      </span>
      <span>
        <strong>{contractor.email || t("이메일 없음")}</strong>
        <small>{contractor.phone || t("연락처 없음")}</small>
      </span>
      <span>
        <strong>{contractor.unit?.unit_code || t("호수 미연결")}</strong>
        <small>{formatDate(contractor.created_at)}</small>
      </span>
    </>
  );
}

function renderPaymentContractorRecord(contractor, summary, t) {
  return (
    <>
      <span>
        <strong>{contractor.full_name}</strong>
        <small>{contractor.email || t("이메일 없음")}</small>
      </span>
      <span>
        <strong>{contractor.unit?.unit_code || t("호수 미연결")}</strong>
        <small>{formatDisplayStatus(contractor.status, t)}</small>
      </span>
      <span>
        <strong>{summary ? `${summary.totals.progressPercent}%` : t("미생성")}</strong>
        <small>{summary ? `${summary.items.length}/8 ${t("단계")}` : t("payment plan 없음")}</small>
      </span>
    </>
  );
}

function renderUnitRecord(unit, t) {
  return (
    <>
      <span>
        <strong>{unit.unit_code}</strong>
        <small>{formatDisplayStatus(unit.status, t)}</small>
      </span>
      <span>
        <strong>{unit.assignedContractorName || "empty"}</strong>
        <small>{t("분양자")}</small>
      </span>
      <span>
        <strong>{formatMoney(unit.total_price, unit.currency)}</strong>
        <small>{formatDate(unit.created_at)}</small>
      </span>
    </>
  );
}

function renderContractorPreview(contractor, t) {
  return (
    <span className="compact-preview-name">{contractor.full_name || t("empty")}</span>
  );
}

function renderUnitPreview(unit, t) {
  return (
    <span className="compact-preview-name">{unit.unit_code || unit.unit_name || t("호수 미등록")}</span>
  );
}

function buildPaymentMethodForm(contractor) {
  return {
    payment_method: contractor?.payment_method || "",
    bank_name: contractor?.bank_name || "",
    bank_account_number: contractor?.bank_account_number || "",
    bank_account_holder: contractor?.bank_account_holder || "",
  };
}

function formatPaymentMethodSummary(form, t) {
  if (form.payment_method === "cash") return `${t("현재 납부방법")}: ${t("현금")}`;
  if (form.payment_method === "bank_transfer") {
    return `${t("현재 납부방법")}: ${t("계좌이체")}${form.bank_name ? ` / ${form.bank_name}` : ""}`;
  }
  return t("납부방법 미설정");
}

function formatDocumentPanelSummary(contractor, documents, t) {
  if (!contractor) return t("계약자를 선택하면 문서 목록을 확인할 수 있습니다.");
  const latestDocument = documents[0];
  const latestText = latestDocument ? ` · ${t("최근 문서")}: ${latestDocument.title || latestDocument.file_name}` : "";
  return `${contractor.full_name} · ${t("등록 문서")} ${documents.length}${latestText}`;
}

function formatPaymentScheduleSummary(items, totals, currency, t) {
  if (!items.length) return t("8단계 납부일정을 생성하고 수정합니다.");
  const paidStepCount = items.filter((item) => item.status === "paid").length;
  return `${t("총 단계 수")}: ${items.length} · ${t("납부 완료 단계")}: ${paidStepCount} · ${t("미납 금액")}: ${formatMoney(totals.unpaidAmount, currency)} · ${t("진행률")}: ${totals.progressPercent}%`;
}

function DeleteContractorButton({ contractor, onDelete, t }) {
  return (
    <button className="danger-button delete-button" onClick={() => onDelete(contractor)} type="button">
      {t("삭제")}
    </button>
  );
}

function TextField({ defaultValue, label, max, min, minLength, name, onChange, required = false, step, type = "text", value }) {
  const { t } = useLanguage();
  const inputProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value: value ?? "" };
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input max={max} min={min} minLength={minLength} name={name} onChange={onChange} required={required} step={step} type={type} {...inputProps} />
    </label>
  );
}

function AdminDocumentCard({ document, onDelete, onOpen, onSubmit, saving, t }) {
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
        <span className="status-chip">{formatDisplayStatus(document.status, t)}</span>
      </header>
      <div className="stage-meta">
        <MiniStat label={t("파일 크기")} value={formatFileSize(document.file_size)} />
        <MiniStat label={t("등록일")} value={formatDate(document.created_at)} />
      </div>
      {document.note ? <p>{document.note}</p> : null}
      <div className="button-row document-actions">
        <button className="secondary-button" onClick={() => onOpen(document.file_path)} type="button">
          {t("열기 / 다운로드")}
        </button>
        <button className="danger-button" disabled={saving} onClick={() => onDelete(document)} type="button">
          {t("문서 삭제")}
        </button>
      </div>
      <form className="admin-form compact-admin-form document-metadata-form" onSubmit={handleSubmit}>
        <TextField label="title" name="title" defaultValue={document.title} required />
        <label className="field">
          <span>{t("category")}</span>
          <select defaultValue={document.category || "other"} name="category">
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("status")}</span>
          <select defaultValue={document.status || "active"} name="status">
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <TextAreaField label="note" name="note" defaultValue={document.note || ""} />
        <button className="primary-button" disabled={saving} type="submit">
          {t("문서 정보 저장")}
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

function PaymentMethodForm({ form, onChange, onSubmit, saving, t }) {
  const usesBankTransfer = form.payment_method === "bank_transfer";

  return (
    <CollapsiblePanel
      className="payment-method-panel-admin"
      defaultExpanded={!form.payment_method}
      summary={formatPaymentMethodSummary(form, t)}
      title={t("납부방법 설정")}
    >
      <form className="admin-form compact-admin-form payment-method-form" onSubmit={onSubmit}>
        <label className="field">
          <span>{t("납부방법")}</span>
          <select name="payment_method" onChange={onChange} value={form.payment_method}>
            <option value="">{t("미설정")}</option>
            <option value="cash">{t("현금")}</option>
            <option value="bank_transfer">{t("계좌이체")}</option>
          </select>
        </label>
        {usesBankTransfer ? (
          <>
            <TextField label="은행명" name="bank_name" onChange={onChange} required value={form.bank_name} />
            <TextField label="계좌번호" name="bank_account_number" onChange={onChange} required value={form.bank_account_number} />
            <TextField label="계좌명" name="bank_account_holder" onChange={onChange} required value={form.bank_account_holder} />
          </>
        ) : null}
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? t("저장 중...") : t("납부방법 저장")}
        </button>
      </form>
    </CollapsiblePanel>
  );
}

function PaymentItemForm({ item, language, onSubmit, saving, t }) {
  const displayTitle = getPaymentStepTitle(item, language);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(item.id, Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <form className="admin-card payment-item-form" onSubmit={handleSubmit}>
      <header>
        <h3>
          {item.step_no}. {displayTitle}
        </h3>
        <span className="status-chip">{formatDisplayStatus(item.status, t)}</span>
      </header>
      <TextField label="title" name="title" defaultValue={item.title} />
      <TextField label="required_amount" name="required_amount" defaultValue={item.required_amount} type="number" />
      <TextField label="paid_amount" name="paid_amount" defaultValue={item.paid_amount} type="number" />
      <TextField label="due_date" name="due_date" defaultValue={item.due_date || ""} type="date" />
      <TextField label="paid_date" name="paid_date" defaultValue={item.paid_date || ""} type="date" />
      <label className="field">
        <span>{t("status")}</span>
        <select defaultValue={item.status || "unpaid"} name="status">
          <option value="unpaid">{formatDisplayStatus("unpaid", t)}</option>
          <option value="partial">{formatDisplayStatus("partial", t)}</option>
          <option value="paid">{formatDisplayStatus("paid", t)}</option>
          <option value="overdue">{formatDisplayStatus("overdue", t)}</option>
        </select>
      </label>
      <label className="field">
        <span>{t("note")}</span>
        <input defaultValue={item.note || ""} name="note" />
      </label>
      <button className="primary-button" disabled={saving} type="submit">
        {t("단계 저장")}
      </button>
    </form>
  );
}

function JourneyStepForm({ item, language, onChange, t }) {
  const progress = normalizeProgressPercent(item.progress_percent);
  const displayTitle = getJourneyStepTitle(item, language);

  function handleFieldChange(event) {
    onChange(item.id, event.target.name, event.target.value);
  }

  function handleProgressChange(event) {
    onChange(item.id, "progress_percent", event.target.value);
  }

  return (
    <CollapsiblePanel
      className="journey-step-panel"
      summary={`${formatJourneyStatus(item.status, t)} · ${progress}%`}
      title={`${item.step_no}. ${displayTitle}`}
    >
      <div className="admin-form compact-admin-form journey-step-form">
        <header>
          <div>
            <span className="eyebrow">STEP {item.step_no}</span>
            <h3>{displayTitle}</h3>
          </div>
          <JourneyStatusChip status={item.status} t={t} />
        </header>
        <TextField label="title" name="title" onChange={handleFieldChange} required value={item.title || ""} />
        <TextField label="subtitle" name="subtitle" onChange={handleFieldChange} value={item.subtitle || ""} />
        <TextAreaField label="description" name="description" onChange={handleFieldChange} value={item.description || ""} />
        <label className="field">
          <span>{t("status")}</span>
          <select name="status" onChange={handleFieldChange} value={item.status || "pending"}>
            <option value="pending">{formatJourneyStatus("pending", t)}</option>
            <option value="in_progress">{formatJourneyStatus("in_progress", t)}</option>
            <option value="completed">{formatJourneyStatus("completed", t)}</option>
            <option value="delayed">{formatJourneyStatus("delayed", t)}</option>
          </select>
        </label>
        <label className="field progress-edit-field">
          <span>{t("progress_percent")}</span>
          <input aria-label={`STEP ${item.step_no} 진행률 슬라이더`} max="100" min="0" onChange={handleProgressChange} type="range" value={progress} />
        </label>
        <TextField label="progress_percent 숫자" name="progress_percent" max="100" min="0" onChange={handleProgressChange} step="1" type="number" value={progress} />
        <TextField label="target_date" name="target_date" onChange={handleFieldChange} value={item.target_date || ""} type="date" />
        <TextField label="completed_date" name="completed_date" onChange={handleFieldChange} value={item.completed_date || ""} type="date" />
        <TextAreaField label="note" name="note" onChange={handleFieldChange} value={item.note || ""} />
      </div>
    </CollapsiblePanel>
  );
}

function TextAreaField({ defaultValue, label, name, onChange, value }) {
  const { t } = useLanguage();
  const textareaProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value: value ?? "" };
  return (
    <label className="field">
      <span>{t(label)}</span>
      <textarea name={name} onChange={onChange} rows="3" {...textareaProps} />
    </label>
  );
}

function JourneyStatusChip({ status, t }) {
  return <span className={`status-chip status-${status || "pending"}`}>{formatJourneyStatus(status, t)}</span>;
}

function formatJourneyStatus(status, t) {
  return {
    completed: t("완료"),
    delayed: t("지연"),
    in_progress: t("진행 중"),
    pending: t("대기"),
  }[status] || status || t("대기");
}

function formatDisplayStatus(status, t) {
  return {
    active: t("활성"),
    archived: t("보관됨"),
    available: t("분양 가능"),
    completed: t("완료"),
    delayed: t("지연"),
    inactive: t("비활성"),
    in_progress: t("진행 중"),
    overdue: t("연체"),
    paid: t("납부 완료"),
    partial: t("부분 납부"),
    pending: t("대기"),
    sold: t("분양 완료"),
    unpaid: t("미납"),
  }[status] || status || t("대기");
}

function formatMoney(value, currency = "USD") {
  return `${Number(value || 0).toLocaleString("ko-KR")} ${currency || "USD"}`;
}

function formatDate(value) {
  if (!value) return "미등록";
  return new Date(value).toLocaleDateString("ko-KR");
}
