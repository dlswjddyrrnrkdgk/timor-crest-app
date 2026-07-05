const { processStages, documentsAndNotices, myPanels } = window.timorDemoData;

const statusClass = {
  완료: "status-complete",
  "진행 중": "status-current",
  예정: "status-upcoming",
  대기: "status-waiting",
  "납입 완료": "status-paid",
  "일부 납입": "status-partial",
  "납입 예정": "status-due",
  미납: "status-unpaid",
};

const formatWon = new Intl.NumberFormat("ko-KR").format;
let currentDocumentPage = 1;

function money(value) {
  return `${formatWon(value)}원`;
}

function renderJourneyStages() {
  document.querySelector("#journeyStageList").innerHTML = processStages
    .map(
      (stage) => `
        <article class="stage-card">
          <header>
            <h3>${stage.name}</h3>
            <span class="status-chip ${statusClass[stage.state]}">${stage.state}</span>
          </header>
          <p>${stage.guide}</p>
          <div class="stage-meta">
            <div class="mini-stat"><span>진행률</span><strong>${stage.progress}%</strong></div>
            <div class="mini-stat"><span>일정</span><strong>${stage.date}</strong></div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderPaymentStages() {
  document.querySelector("#paymentStageList").innerHTML = processStages
    .map(
      (stage) => `
        <article class="stage-card">
          <header>
            <h3>${stage.name}</h3>
            <span class="status-chip ${statusClass[stage.paymentStatus]}">${stage.paymentStatus}</span>
          </header>
          <div class="stage-meta">
            <div class="mini-stat"><span>납입해야 하는 금액</span><strong>${money(stage.dueAmount)}</strong></div>
            <div class="mini-stat"><span>납입한 금액</span><strong>${money(stage.paidAmount)}</strong></div>
            <div class="mini-stat"><span>미납 금액</span><strong>${money(Math.max(stage.dueAmount - stage.paidAmount, 0))}</strong></div>
            <div class="mini-stat"><span>회차 상태</span><strong>${stage.paymentStatus}</strong></div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderDocuments(page = 1) {
  currentDocumentPage = page;
  const pageSize = 3;
  const pageCount = Math.ceil(documentsAndNotices.length / pageSize);
  const items = documentsAndNotices.slice((page - 1) * pageSize, page * pageSize);

  document.querySelector("#documentList").innerHTML = items
    .map(
      (item) => `
        <article class="document-card">
          <header>
            <span class="document-kind">${item.kind}</span>
            <span class="status-chip status-current">${item.date}</span>
          </header>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
        </article>
      `,
    )
    .join("");

  document.querySelector("#documentPagination").innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const number = index + 1;
    return `<button class="${number === page ? "is-active" : ""}" type="button" data-doc-page="${number}" aria-label="${number}페이지">${number}</button>`;
  }).join("");
}

function showView(viewName) {
  document.querySelectorAll("[data-view]").forEach((screen) => {
    const isActive = screen.dataset.view === viewName;
    screen.classList.toggle("is-active", isActive);
    if (isActive) {
      screen.scrollTop = 0;
      screen.focus({ preventScroll: true });
    }
  });

  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    const isActive = button.dataset.viewTarget === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  requestAnimationFrame(() => animateVisibleMeters());
}

function animateVisibleMeters() {
  const activeScreen = document.querySelector(".view-screen.is-active");
  if (!activeScreen) return;

  activeScreen.querySelectorAll("[data-count-to]").forEach((node) => {
    animateNumber(node, Number(node.dataset.countTo), (value) => `${value}`);
  });

  activeScreen.querySelectorAll("[data-money-count]").forEach((node) => {
    animateNumber(node, Number(node.dataset.moneyCount), (value) => money(value));
  });

  activeScreen.querySelectorAll("[data-progress-fill]").forEach((fill) => {
    fill.style.width = "0%";
    requestAnimationFrame(() => {
      fill.style.width = `${fill.dataset.progressFill}%`;
    });
  });
}

function animateNumber(node, target, renderValue) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = renderValue(target);
    return;
  }

  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / 900, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = renderValue(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showMyPanel(panelName) {
  const panel = myPanels[panelName];
  const detail = document.querySelector("#myDetail");

  document.querySelectorAll("[data-my-panel]").forEach((button) => {
    const isSelected = button.dataset.myPanel === panelName;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-expanded", String(isSelected));
  });

  detail.classList.remove("is-empty");
  detail.innerHTML = `
    <h3>${panel.title}</h3>
    <ul>${panel.items.map((item) => `<li>${item}</li>`).join("")}</ul>
    ${panel.action ? `<button class="primary-button inline-action" type="button" data-toast="${panel.action}이 접수되었습니다">${panel.action}</button>` : ""}
  `;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1700);
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view-target]");
  if (viewButton) {
    showView(viewButton.dataset.viewTarget);
    return;
  }

  const pageButton = event.target.closest("[data-doc-page]");
  if (pageButton) {
    renderDocuments(Number(pageButton.dataset.docPage));
    return;
  }

  const myButton = event.target.closest("[data-my-panel]");
  if (myButton) {
    showMyPanel(myButton.dataset.myPanel);
    return;
  }

  const toastButton = event.target.closest("[data-toast]");
  if (toastButton) showToast(toastButton.dataset.toast);
});

renderJourneyStages();
renderPaymentStages();
renderDocuments(currentDocumentPage);
animateVisibleMeters();
