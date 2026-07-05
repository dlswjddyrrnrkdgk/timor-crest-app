(() => {
  "use strict";

  const root = document.querySelector("#appRoot");
  const nav = document.querySelector("#bottomNav");
  const sessionLabel = document.querySelector("[data-session-label]");
  const toast = document.querySelector("#toast");
  const moneyFormat = new Intl.NumberFormat("ko-KR");
  let contractorView = "home";
  let adminView = "dashboard";
  let documentPage = 1;
  let selectedAdminUnit = "A-101";
  let selectedDocumentId = "";

  const contractorNav = [
    ["home", "홈", "M4 11.5 12 5l8 6.5V20h-6v-6h-4v6H4z"],
    ["journey", "Journey", "M5 19V8l7-4 7 4v11M8 19v-7h8v7"],
    ["payments", "납부", "M4 7h16v10H4zM7 11h4M15 15h2"],
    ["docs", "문서", "M7 3h7l3 3v15H7zM14 3v4h4M9 12h6M9 16h6"],
    ["my", "MY", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"],
  ];

  const adminTabs = [
    ["dashboard", "Dashboard"],
    ["units", "호수 관리"],
    ["journey", "Journey 공정 관리"],
    ["payments", "납부 일정 관리"],
    ["docs", "문서 관리"],
  ];

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key === "attrs") Object.entries(value).forEach(([name, attrValue]) => node.setAttribute(name, attrValue));
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    });
    children.filter(Boolean).forEach((child) => node.append(child));
    return node;
  }

  function svg(path) {
    return el("span", { className: "nav-icon", html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>` });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1700);
  }

  function money(value) {
    return `${moneyFormat.format(Math.round(Number(value || 0)))}원`;
  }

  function render() {
    const session = authService.getSession();
    window.history.replaceState(null, "", window.location.pathname);
    if (!session) renderLogin();
    else if (session.role === "admin") renderAdmin();
    else renderContractor(session.unitId);
  }

  function replaceRoot(node) {
    root.replaceChildren(node);
  }

  function renderLogin() {
    sessionLabel.textContent = "Login";
    nav.hidden = true;
    nav.replaceChildren();
    const contractorError = el("p", { className: "form-error", attrs: { "data-testid": "contractor-error" } });
    const adminError = el("p", { className: "form-error", attrs: { "data-testid": "admin-error" } });
    const contractorForm = loginCard("Contractor Login", "계약 호수", "비밀번호", "A-101", "password", "contractor", contractorError);
    const adminForm = loginCard("Admin Login", "Admin ID", "Admin Password", "admin", "password", "admin", adminError);
    replaceRoot(el("section", { className: "view-screen is-active login-screen", attrs: { "data-testid": "login-screen" } }, [
      el("div", { className: "login-brand" }, [el("span", { className: "eyebrow", text: "TIMOR CREST" }), el("h1", { text: "Demo Login" }), el("p", { text: "계약자는 본인 호수만, Admin은 데모 설정만 관리합니다." })]),
      contractorForm,
      adminForm,
      el("p", { className: "security-note", text: "Demo mock/localStorage only. Production requires server auth, DB permissions, password hashing, and file ACLs." }),
    ]));
  }

  function loginCard(title, firstLabel, secondLabel, firstValue, secondType, mode, errorNode) {
    const firstName = mode === "admin" ? "adminId" : "unitId";
    const secondName = mode === "admin" ? "adminPassword" : "password";
    const form = el("form", { className: "login-card", attrs: { "data-login-form": mode, "data-testid": `${mode}-login-form` } }, [
      el("h2", { text: title }),
      field(firstLabel, firstName, firstValue, "text", `${mode}-${firstName}`),
      field(secondLabel, secondName, "", secondType, `${mode}-${secondName}`),
      errorNode,
      el("button", { className: "primary-button", type: "submit", text: "로그인", attrs: { "data-testid": `${mode}-login-submit` } }),
    ]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const result = mode === "admin" ? authService.loginAdmin(data.adminId, data.adminPassword) : authService.loginContractor(data.unitId, data.password);
      if (!result.ok) {
        errorNode.textContent = result.error;
        return;
      }
      contractorView = "home";
      adminView = "dashboard";
      render();
    });
    return form;
  }

  function field(label, name, value = "", type = "text", testId = name) {
    return el("label", { className: "field" }, [
      el("span", { text: label }),
      el("input", { name, value, type, attrs: { "data-testid": testId } }),
    ]);
  }

  function selectField(label, name, value, options, testId = name) {
    return el("label", { className: "field" }, [
      el("span", { text: label }),
      el("select", { name, value, attrs: { "data-testid": testId } }, options.map((option) => el("option", { value: option, text: option, selected: option === value }))),
    ]);
  }

  function renderContractor(unitId) {
    const unit = authService.requireContractorUnit();
    if (!unit || unit.unitId !== unitId) return renderLogin();
    sessionLabel.textContent = `Contractor ${unit.unitId}`;
    nav.hidden = false;
    renderContractorNav();
    const viewMap = { home: contractorHome, journey: contractorJourney, payments: contractorPayments, docs: contractorDocs, my: contractorMy, preview: contractorPreview };
    replaceRoot(el("section", { className: "view-screen is-active", attrs: { "data-testid": `contractor-${contractorView}` } }, [viewMap[contractorView](unit)]));
    animateMeters(root);
  }

  function renderContractorNav() {
    nav.replaceChildren(...contractorNav.map(([view, label, path]) => {
      const button = el("button", { className: view === contractorView ? "is-active" : "", type: "button", attrs: { "data-nav": view, "aria-selected": String(view === contractorView) } }, [svg(path), el("span", { text: label })]);
      button.addEventListener("click", () => {
        contractorView = view;
        documentPage = 1;
        render();
      });
      return button;
    }));
  }

  function pageHeading(kicker, title, back = true) {
    return el("header", { className: "page-heading" }, [
      back ? actionButton("back-button", "뒤로", () => { contractorView = "home"; render(); }, "back-home") : null,
      el("div", {}, [el("span", { className: "eyebrow", text: kicker }), el("h2", { text: title })]),
    ]);
  }

  function actionButton(className, label, onClick, testId) {
    const button = el("button", { className, type: "button", text: label, attrs: { "data-testid": testId } });
    button.addEventListener("click", onClick);
    return button;
  }

  function contractorHome(unit) {
    const journey = journeyService.getJourneyForUnit(unit.unitId);
    const progress = journeyService.calculateOverallProgress(journey);
    const next = journey.find((item) => item.status !== "완료") || journey[journey.length - 1];
    return el("div", {}, [
      el("section", { className: "home-hero" }, [
        el("div", {}, [el("span", { className: "eyebrow", text: "OWNER" }), el("h1", { text: unit.contractorName }), el("p", { text: `계약일자 ${unit.contractDate}` })]),
        el("div", { className: "hero-unit" }, [el("span", { text: "계약 호수" }), el("strong", { text: unit.unitId, attrs: { "data-testid": "contractor-unit-id" } })]),
      ]),
      el("section", { className: "service-section" }, contractorNav.slice(1).map(([view, label, path]) => serviceButton(view, label, path))),
      serviceButton("preview", "내 집 미리보기", "M7 17 17 7M9 7h8v8", "preview-cta"),
      el("section", { className: "home-summary" }, [summaryCard("다음 일정", next.title, next.scheduledDate), summaryCard("전체 공정", `${progress}%`, next.status)]),
      actionButton("secondary-button logout-button", "로그아웃", () => { authService.logout(); render(); }, "contractor-logout"),
    ]);
  }

  function serviceButton(view, label, path, className = "service-button") {
    const button = el("button", { className, type: "button" }, [svg(path), el("strong", { text: label })]);
    button.addEventListener("click", () => { contractorView = view; documentPage = 1; render(); });
    return button;
  }

  function summaryCard(label, value, caption) {
    return el("article", {}, [el("span", { text: label }), el("strong", { text: value }), el("p", { text: caption })]);
  }

  function contractorJourney(unit) {
    const stages = journeyService.getJourneyForUnit(unit.unitId);
    const progress = journeyService.calculateOverallProgress(stages);
    return el("div", {}, [
      pageHeading("공정 > Journey", "Journey"),
      meter("전체 공정 진행률", progress),
      el("div", { className: "stage-list" }, stages.map(stageCard)),
      actionButton("primary-button", "실시간 현장 보기", () => showToast("Demo placeholder입니다."), "site-preview-placeholder"),
    ]);
  }

  function stageCard(stage) {
    return el("article", { className: "stage-card" }, [
      el("header", {}, [el("h3", { text: stage.title }), statusChip(stage.status)]),
      el("p", { text: stage.description }),
      el("div", { className: "stage-meta" }, [mini("진행률", `${stage.progress}%`), mini("일정", stage.completedDate || stage.scheduledDate)]),
    ]);
  }

  function contractorPayments(unit) {
    const payment = paymentService.getPayment(unit.unitId);
    const summary = paymentService.calculatePaymentSummary(payment);
    return el("div", {}, [
      pageHeading("PAYMENT", "납부 일정"),
      infoCard("계좌 정보", [["이름", payment.contractorName], ["은행", payment.bankName], ["계좌번호", payment.accountNumber], ["담당자", payment.bankManagerName], ["전화번호", payment.bankManagerPhone]]),
      el("section", { className: "meter-card" }, [
        el("div", { className: "amount-grid" }, [amount("총 분양대금", payment.totalPrice), amount("납입한 금액", summary.paidAmount), amount("잔여 금액", summary.remainingAmount)]),
        meterRow("납부 진행률", summary.progress),
        progressTrack(summary.progress),
      ]),
      el("section", { className: "section-block" }, [el("h3", { text: "공정별 납입 현황" }), el("div", { className: "payment-stage-list" }, payment.paymentSchedule.map(paymentCard))]),
    ]);
  }

  function paymentCard(item) {
    return el("article", { className: "stage-card" }, [
      el("header", {}, [el("h3", { text: item.title }), statusChip(item.status)]),
      el("div", { className: "stage-meta" }, [mini("납입해야 하는 금액", money(item.requiredAmount)), mini("납입한 금액", money(item.paidAmount)), mini("미납 금액", money(item.unpaidAmount)), mini("예정일", item.dueDate)]),
    ]);
  }

  function contractorDocs(unit) {
    const docs = documentService.listDocuments(unit.unitId, { visibleOnly: true });
    const pageSize = 3;
    const pageCount = Math.max(Math.ceil(docs.length / pageSize), 1);
    documentPage = Math.min(documentPage, pageCount);
    const items = docs.slice((documentPage - 1) * pageSize, documentPage * pageSize);
    return el("div", {}, [
      pageHeading("DOCUMENTS & NOTICE", "문서와 공지"),
      el("div", { className: "document-list" }, items.map(documentCard)),
      el("div", { className: "pagination", attrs: { "data-testid": "document-pagination" } }, Array.from({ length: pageCount }, (_, index) => pageButton(index + 1))),
    ]);
  }

  function documentCard(item) {
    return el("article", { className: "document-card" }, [
      el("header", {}, [el("span", { className: "document-kind", text: item.type }), statusChip(item.uploadedAt)]),
      el("h3", { text: item.title }),
      el("p", { text: item.description }),
      el("p", { className: "file-name", text: item.fileName }),
    ]);
  }

  function pageButton(number) {
    const button = el("button", { className: number === documentPage ? "is-active" : "", type: "button", text: String(number), attrs: { "aria-label": `${number}페이지` } });
    button.addEventListener("click", () => { documentPage = number; render(); });
    return button;
  }

  function contractorMy(unit) {
    const panels = [
      ["profile", "내 정보", [`이름: ${unit.contractorName}`, `계약일자: ${unit.contractDate}`, `계약 호수: ${unit.unitId}`, `연락처: ${unit.phone}`]],
      ["contract", "계약 / 서류", [`계약 상태: ${unit.contractStatus}`, `평면: ${unit.floorPlan}`, `마감재: ${unit.finishPackage}`]],
      ["consult", "상담", ["분양 상담 예약", "최근 상담: Demo financing question", "상담 상태: 답변 완료"]],
      ["alerts", "개인 알림", ["납부기한 알림", "문서 업데이트 알림", "입주 전 점검 안내"]],
    ];
    return el("div", {}, [
      pageHeading("MY PAGE", "MY"),
      el("section", { className: "my-button-grid" }, panels.map(([id, label, items]) => myButton(id, label, items))),
      el("section", { className: "my-detail is-empty", attrs: { "data-testid": "my-detail" } }, [el("p", { text: "선택한 항목의 상세 정보가 여기에 표시됩니다." })]),
      infoCard("MY 선택 마감", [["마감재", unit.finishPackage], ["평면", unit.floorPlan]]),
    ]);
  }

  function myButton(id, label, items) {
    const button = el("button", { className: "my-button", type: "button", text: label, attrs: { "aria-expanded": "false", "data-my-panel": id } });
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-my-panel]").forEach((node) => {
        node.classList.toggle("is-selected", node === button);
        node.setAttribute("aria-expanded", String(node === button));
      });
      const detail = root.querySelector("[data-testid='my-detail']");
      detail.classList.remove("is-empty");
      detail.replaceChildren(el("h3", { text: label }), el("ul", {}, items.map((item) => el("li", { text: item }))));
    });
    return button;
  }

  function contractorPreview(unit) {
    return el("div", {}, [
      pageHeading("MY HOME PREVIEW", "내 집 미리보기"),
      el("section", { className: "preview-visual" }, [el("div", { className: "floor-plan" }, ["Living", "Kitchen", "Bed", "Bath"].map((label) => el("span", { className: `room ${label.toLowerCase()}`, text: label })))]),
      infoCard("평면 정보", [["타입", unit.floorPlan], ["마감재", unit.finishPackage], ["계약 호수", unit.unitId]]),
    ]);
  }

  function infoCard(title, pairs) {
    return el("section", { className: "info-card" }, [el("h3", { text: title }), el("dl", { className: "compact-info" }, pairs.map(([term, desc]) => el("div", {}, [el("dt", { text: term }), el("dd", { text: desc })])))]);
  }

  function amount(label, value) {
    return el("div", {}, [el("span", { text: label }), el("strong", { text: money(value), attrs: { "data-money-count": String(value) } })]);
  }

  function meter(label, value) {
    return el("section", { className: "meter-card" }, [meterRow(label, value), progressTrack(value)]);
  }

  function meterRow(label, value) {
    return el("div", { className: "meter-row" }, [el("span", { text: label }), el("strong", {}, [el("span", { text: "0", attrs: { "data-count-to": String(value) } }), document.createTextNode("%")])]);
  }

  function progressTrack(value) {
    return el("div", { className: "progress-track" }, [el("span", { attrs: { "data-progress-fill": String(value) } })]);
  }

  function mini(label, value) {
    return el("div", { className: "mini-stat" }, [el("span", { text: label }), el("strong", { text: value })]);
  }

  function statusChip(label) {
    return el("span", { className: "status-chip", text: label });
  }

  function renderAdmin() {
    sessionLabel.textContent = "Admin";
    nav.hidden = true;
    nav.replaceChildren();
    replaceRoot(el("section", { className: "view-screen is-active admin-screen", attrs: { "data-testid": `admin-${adminView}` } }, [
      el("div", { className: "admin-topbar" }, [el("div", {}, [el("span", { className: "eyebrow", text: "ADMIN" }), el("h1", { text: "Settings" })]), actionButton("secondary-button", "로그아웃", () => { authService.logout(); render(); }, "admin-logout")]),
      el("div", { className: "admin-tabs" }, adminTabs.map(([view, label]) => adminTab(view, label))),
      adminPanel(),
    ]));
    animateMeters(root);
  }

  function adminTab(view, label) {
    const button = el("button", { className: view === adminView ? "is-active" : "", type: "button", text: label, attrs: { "data-admin-tab": view } });
    button.addEventListener("click", () => { adminView = view; render(); });
    return button;
  }

  function adminPanel() {
    const map = { dashboard: adminDashboard, units: adminUnits, journey: adminJourney, payments: adminPayments, docs: adminDocs };
    return map[adminView]();
  }

  function adminDashboard() {
    const summary = adminService.getDashboardSummary();
    return el("section", { className: "admin-panel" }, [
      el("div", { className: "metric-grid" }, [metric("전체 호수", summary.totalUnits), metric("계약 완료", summary.completedUnits), metric("미납 발생", summary.unpaidUnits), metric("오늘 납부 예정", summary.todayDueCount)]),
      el("h2", { text: "최근 업로드 문서" }),
      el("div", { className: "document-list" }, summary.recentDocuments.map(documentCard)),
      el("h2", { text: "최근 수정 이력" }),
      el("ul", { className: "activity-list" }, summary.recentActivity.map((item) => el("li", { text: `${item.at.slice(0, 10)} ${item.message}` }))),
    ]);
  }

  function metric(label, value) {
    return el("article", { className: "metric-card" }, [el("span", { text: label }), el("strong", { text: String(value) })]);
  }

  function unitSelect(testId = "admin-unit-select") {
    const units = unitService.listUnits();
    if (!units.some((unit) => unit.unitId === selectedAdminUnit)) selectedAdminUnit = units[0]?.unitId || "";
    const select = el("select", { value: selectedAdminUnit, attrs: { "data-testid": testId } }, units.map((unit) => el("option", { value: unit.unitId, text: `${unit.unitId} / ${unit.contractorName}`, selected: unit.unitId === selectedAdminUnit })));
    select.addEventListener("change", () => { selectedAdminUnit = select.value; selectedDocumentId = ""; render(); });
    return select;
  }

  function adminUnits() {
    const unit = unitService.getUnit(selectedAdminUnit) || unitService.listUnits()[0];
    const error = el("p", { className: "form-error" });
    const form = el("form", { className: "admin-form", attrs: { "data-testid": "unit-form" } }, [
      el("div", { className: "form-row" }, [el("label", { className: "field" }, [el("span", { text: "호수 선택" }), unitSelect()])]),
      field("호수", "unitId", unit?.unitId || "", "text", "unit-id"), field("동", "building", unit?.building || "", "text", "unit-building"), field("방", "roomNumber", unit?.roomNumber || "", "text", "unit-room"),
      field("계약자명", "contractorName", unit?.contractorName || "", "text", "unit-contractor"), field("계약일자", "contractDate", unit?.contractDate || "", "date", "unit-date"), selectField("계약 상태", "contractStatus", unit?.contractStatus || "계약 진행", ["계약 진행", "계약 완료"], "unit-status"),
      field("접속 비밀번호", "loginPassword", unit?.loginPassword || "", "text", "unit-password"), field("연락처", "phone", unit?.phone || "", "text", "unit-phone"), field("평면", "floorPlan", unit?.floorPlan || "", "text", "unit-floor"), field("마감재", "finishPackage", unit?.finishPackage || "", "text", "unit-finish"), field("메모", "memo", unit?.memo || "", "text", "unit-memo"),
      error,
      el("div", { className: "button-row" }, [el("button", { className: "primary-button", type: "submit", text: "저장", attrs: { "data-testid": "save-unit" } }), actionButton("secondary-button", "신규", () => createDefaultUnit(error), "create-unit"), actionButton("danger-button", "삭제", () => deleteSelectedUnit(), "delete-unit")]),
    ]);
    form.addEventListener("submit", (event) => saveUnit(event, form, error));
    return el("section", { className: "admin-panel" }, [el("h2", { text: "호수 / 비밀번호 / 계약자 정보 관리" }), form]);
  }

  function saveUnit(event, form, error) {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(form));
      const updated = unitService.updateUnit(selectedAdminUnit, values);
      selectedAdminUnit = updated.unitId;
      showToast("호수 정보가 저장되었습니다.");
      render();
    } catch (err) {
      error.textContent = err.message;
    }
  }

  function createDefaultUnit(error) {
    try {
      const created = unitService.createUnit({ unitId: `C-${Date.now().toString().slice(-3)}`, building: "C", roomNumber: "301", contractorName: "DEMO", contractDate: "2026-07-10", contractStatus: "계약 진행", loginPassword: "0000", phone: "010-0000-0301", memo: "New demo unit", floorPlan: "Demo Plan", finishPackage: "Demo Finish" });
      selectedAdminUnit = created.unitId;
      render();
    } catch (err) {
      error.textContent = err.message;
    }
  }

  function deleteSelectedUnit() {
    unitService.deleteUnit(selectedAdminUnit);
    selectedAdminUnit = unitService.listUnits()[0]?.unitId || "";
    render();
  }

  function adminJourney() {
    return el("section", { className: "admin-panel" }, [el("h2", { text: "Journey 공정 관리" }), el("div", { className: "admin-list" }, journeyService.listTemplateStages().map(journeyForm))]);
  }

  function journeyForm(stage) {
    const form = el("form", { className: "admin-card", attrs: { "data-testid": `journey-form-${stage.stepId}` } }, [field("공정명", "title", stage.title, "text", `journey-title-${stage.stepId}`), field("예정일", "scheduledDate", stage.scheduledDate, "date", `journey-date-${stage.stepId}`), field("완료일", "completedDate", stage.completedDate, "date", `journey-completed-${stage.stepId}`), selectField("상태", "status", stage.status, ["대기", "예정", "진행 중", "완료"], `journey-status-${stage.stepId}`), field("진행률", "progress", stage.progress, "number", `journey-progress-${stage.stepId}`), field("안내 문구", "description", stage.description, "text", `journey-description-${stage.stepId}`), el("button", { className: "primary-button", type: "submit", text: "저장", attrs: { "data-testid": `save-journey-${stage.stepId}` } })]);
    form.addEventListener("submit", (event) => { event.preventDefault(); journeyService.updateTemplateStage(stage.stepId, Object.fromEntries(new FormData(form))); showToast("Journey가 저장되었습니다."); render(); });
    return form;
  }

  function adminPayments() {
    const payment = paymentService.getPayment(selectedAdminUnit);
    return el("section", { className: "admin-panel" }, [el("h2", { text: "납부 일정 관리" }), el("label", { className: "field" }, [el("span", { text: "호수 선택" }), unitSelect("payment-unit-select")]), paymentSettingsForm(payment), el("div", { className: "admin-list" }, payment.paymentSchedule.map((item) => paymentStageForm(item)))]);
  }

  function paymentSettingsForm(payment) {
    const form = el("form", { className: "admin-form", attrs: { "data-testid": "payment-settings-form" } }, [field("이름", "contractorName", payment.contractorName, "text", "payment-contractor"), field("은행", "bankName", payment.bankName, "text", "payment-bank"), field("계좌번호", "accountNumber", payment.accountNumber, "text", "payment-account"), field("담당자", "bankManagerName", payment.bankManagerName, "text", "payment-manager"), field("담당자 전화", "bankManagerPhone", payment.bankManagerPhone, "text", "payment-manager-phone"), field("총 분양대금", "totalPrice", payment.totalPrice, "number", "payment-total"), el("button", { className: "primary-button", type: "submit", text: "납부 기본정보 저장", attrs: { "data-testid": "save-payment-settings" } })]);
    form.addEventListener("submit", (event) => { event.preventDefault(); paymentService.updatePayment(selectedAdminUnit, Object.fromEntries(new FormData(form))); showToast("납부 기본정보가 저장되었습니다."); render(); });
    return form;
  }

  function paymentStageForm(item) {
    const form = el("form", { className: "admin-card", attrs: { "data-testid": `payment-stage-form-${item.stepId}` } }, [field("차수명", "title", item.title, "text", `payment-title-${item.stepId}`), field("예정일", "dueDate", item.dueDate, "date", `payment-due-${item.stepId}`), field("납입해야 하는 금액", "requiredAmount", item.requiredAmount, "number", `payment-required-${item.stepId}`), field("납입한 금액", "paidAmount", item.paidAmount, "number", `payment-paid-${item.stepId}`), selectField("상태", "status", item.status, ["납입 예정", "일부 납입", "납입 완료", "미납"], `payment-status-${item.stepId}`), field("메모", "memo", item.memo, "text", `payment-memo-${item.stepId}`), el("button", { className: "primary-button", type: "submit", text: "저장", attrs: { "data-testid": `save-payment-stage-${item.stepId}` } })]);
    form.addEventListener("submit", (event) => { event.preventDefault(); paymentService.updatePaymentStage(selectedAdminUnit, item.stepId, Object.fromEntries(new FormData(form))); showToast("납부 차수가 저장되었습니다."); render(); });
    return form;
  }

  function adminDocs() {
    const docs = documentService.listDocuments(selectedAdminUnit, { visibleOnly: false });
    if (!selectedDocumentId && docs[0]) selectedDocumentId = docs[0].documentId;
    const current = docs.find((item) => item.documentId === selectedDocumentId) || docs[0] || { title: "", type: "계약서", fileName: "", description: "", uploadedAt: new Date().toISOString().slice(0, 10), isVisibleToUser: true };
    return el("section", { className: "admin-panel" }, [el("h2", { text: "문서 관리" }), el("label", { className: "field" }, [el("span", { text: "호수 선택" }), unitSelect("doc-unit-select")]), documentPicker(docs), documentForm(current), el("div", { className: "document-list" }, docs.map(documentCard))]);
  }

  function documentPicker(docs) {
    const select = el("select", { value: selectedDocumentId, attrs: { "data-testid": "document-select" } }, docs.map((item) => el("option", { value: item.documentId, text: item.title, selected: item.documentId === selectedDocumentId })));
    select.addEventListener("change", () => { selectedDocumentId = select.value; render(); });
    return el("label", { className: "field" }, [el("span", { text: "문서 선택" }), select]);
  }

  function documentForm(item) {
    const form = el("form", { className: "admin-form", attrs: { "data-testid": "document-form" } }, [field("제목", "title", item.title, "text", "doc-title"), field("유형", "type", item.type, "text", "doc-type"), field("파일명", "fileName", item.fileName, "text", "doc-file"), field("설명", "description", item.description, "text", "doc-description"), field("업로드일", "uploadedAt", item.uploadedAt, "date", "doc-uploaded"), el("label", { className: "check-field" }, [el("input", { type: "checkbox", name: "isVisibleToUser", checked: item.isVisibleToUser, attrs: { "data-testid": "doc-visible" } }), el("span", { text: "계약자에게 공개" })]), el("div", { className: "button-row" }, [el("button", { className: "primary-button", type: "submit", text: "문서 저장", attrs: { "data-testid": "save-document" } }), actionButton("secondary-button", "문서 추가", () => createDocument(), "create-document"), actionButton("danger-button", "문서 삭제", () => deleteDocument(), "delete-document")])]);
    form.addEventListener("submit", (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); values.isVisibleToUser = form.elements.isVisibleToUser.checked; const updated = documentService.updateDocument(selectedAdminUnit, item.documentId, values); selectedDocumentId = updated.documentId; showToast("문서가 저장되었습니다."); render(); });
    return form;
  }

  function createDocument() {
    const item = documentService.createDocument(selectedAdminUnit, { title: "새 데모 문서", type: "기타", fileName: "new-demo.pdf", description: "Metadata-only placeholder", uploadedAt: new Date().toISOString().slice(0, 10), isVisibleToUser: true });
    selectedDocumentId = item.documentId;
    render();
  }

  function deleteDocument() {
    if (selectedDocumentId) documentService.deleteDocument(selectedAdminUnit, selectedDocumentId);
    selectedDocumentId = "";
    render();
  }

  function animateMeters(scope) {
    scope.querySelectorAll("[data-count-to]").forEach((node) => animateNumber(node, Number(node.dataset.countTo), String));
    scope.querySelectorAll("[data-money-count]").forEach((node) => animateNumber(node, Number(node.dataset.moneyCount), money));
    scope.querySelectorAll("[data-progress-fill]").forEach((fill) => { fill.style.width = "0%"; requestAnimationFrame(() => { fill.style.width = `${fill.dataset.progressFill}%`; }); });
  }

  function animateNumber(node, target, renderValue) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = renderValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 900, 1);
      node.textContent = renderValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.addEventListener("hashchange", render);
  render();
})();
