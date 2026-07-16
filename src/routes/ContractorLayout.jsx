import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AnimatedProgress from "../components/AnimatedProgress.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { getMyContractorSummary } from "../services/contractorService.js";
import { getMyPaymentSummary } from "../services/paymentService.js";
import { getPaymentItemUnpaidAmount, getPaymentStepTitle, normalizePaymentItem } from "../services/paymentModel.js";
import { calculateJourneyOverallProgress, getCurrentJourneyStep, getJourneySteps } from "../services/journeyService.js";
import { getJourneyStepDescription, getJourneyStepTitle } from "../services/journeyModel.js";
import { createMyDocumentSignedUrl, getMyDocumentSummary } from "../services/documentService.js";
import { formatFileSize } from "../services/documentModel.js";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage.js";
import { signOut } from "../services/authService.js";

const contractorNav = [
  ["", "홈", "M4 11.5 12 5l8 6.5V20h-6v-6h-4v6H4z"],
  ["journey", "Journey", "M5 19V8l7-4 7 4v11M8 19v-7h8v7"],
  ["payments", "납부", "M4 7h16v10H4zM7 11h4M15 15h2"],
  ["documents", "문서", "M7 3h7l3 3v15H7zM14 3v4h4M9 12h6M9 16h6"],
  ["preview", "MY", "M7 17 17 7M9 7h8v8"],
];

export default function ContractorLayout() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [journeySteps, setJourneySteps] = useState([]);
  const [journeyMessage, setJourneyMessage] = useAutoDismissMessage("", 10000);
  const [documentSummary, setDocumentSummary] = useState(null);
  const [documentMessage, setDocumentMessage] = useAutoDismissMessage("", 10000);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useAutoDismissMessage("", 10000);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setStatus("loading");
    setMessage("");
    setJourneyMessage("");
    setDocumentMessage("");
    const [contractResult, paymentResult, journeyResult, documentResult] = await Promise.all([
      getMyContractorSummary(),
      getMyPaymentSummary(),
      getJourneySteps(),
      getMyDocumentSummary(),
    ]);
    if (contractResult.error || paymentResult.error) {
      setMessage(contractResult.error || paymentResult.error);
      setStatus("ready");
      return;
    }
    setSummary(contractResult.data);
    setPaymentSummary(paymentResult.data);
    setJourneySteps(journeyResult.data || []);
    setJourneyMessage(journeyResult.error || "");
    setDocumentSummary(documentResult.data);
    setDocumentMessage(documentResult.error || "");
    setStatus("ready");
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function openMyDocument(filePath) {
    setDocumentMessage("");
    const result = await createMyDocumentSignedUrl(filePath);
    if (result.error) {
      setDocumentMessage(result.error);
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  }

  const shell = { documentMessage, documentSummary, journeyMessage, journeySteps, language, message, openMyDocument, paymentSummary, status, summary, t };

  return (
    <main className="demo-stage" aria-label="Timor Crest contractor portal">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span className="status-actions">
            <span>{t("Contractor")}</span>
            <LanguageToggle />
          </span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active phase-shell">
            <Routes>
              <Route index element={<ContractorHome {...shell} />} />
              <Route path="journey" element={<ContractorJourney {...shell} />} />
              <Route path="payments" element={<ContractorPayments {...shell} />} />
              <Route path="documents" element={<ContractorDocuments {...shell} />} />
              <Route path="preview" element={<ContractorPreview />} />
            </Routes>
            <button className="secondary-button logout-button" onClick={handleLogout} type="button">
              {t("로그아웃")}
            </button>
          </section>
        </div>
        <nav className="bottom-nav" aria-label="Contractor navigation">
          {contractorNav.map(([path, label, iconPath]) => (
            <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} end={path === ""} key={path || "home"} to={path}>
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d={iconPath} />
                </svg>
              </span>
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    </main>
  );
}

function ContractorHome({ documentMessage, documentSummary, journeyMessage, journeySteps, language, message, paymentSummary, status, summary, t }) {
  return (
    <>
      <section className="home-hero">
        <div>
          <span className="eyebrow">OWNER</span>
          <h1>{t("내 계약 정보")}</h1>
          <p>{t("납부 현황과 주요 계약 정보를 간단히 확인하세요.")}</p>
        </div>
        <div className="hero-unit">
          <span>{t("호수")}</span>
          <strong>{summary?.unit?.unit_code || t("미등록")}</strong>
        </div>
      </section>
      {status === "loading" ? <section className="info-card"><p>{t("계약 정보를 불러오고 있습니다.")}</p></section> : null}
      {message ? <p className="form-error">{t(message)}</p> : null}
      {status === "ready" && !summary ? (
        <section className="info-card">
          <h3>{t("등록 대기")}</h3>
          <p>{t("계약자 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.")}</p>
        </section>
      ) : null}
      {summary ? <ContractSummary hint={t("Journey 상세 보기")} summary={summary} to="journey" compact t={t} /> : null}
      {summary ? <PaymentSummaryCard hint={t("납부 상세 보기")} paymentSummary={paymentSummary} summary={summary} to="payments" t={t} /> : null}
      {summary ? <JourneySummaryCard hint={t("Journey 상세 보기")} journeyMessage={journeyMessage} journeySteps={journeySteps} language={language} to="journey" t={t} /> : null}
      {summary ? <DocumentSummaryCard documentMessage={documentMessage} documentSummary={documentSummary} hint={t("문서함 열기")} to="documents" t={t} /> : null}
      {summary ? <PreviewSummaryCard t={t} /> : null}
    </>
  );
}

function ContractorPayments({ language, message, paymentSummary, status, summary, t }) {
  return (
    <>
      <PageHeading kicker="PAYMENT" title={t("납부 현황")} />
      {status === "loading" ? <section className="info-card"><p>{t("납부 정보를 불러오고 있습니다.")}</p></section> : null}
      {message ? <p className="form-error">{t(message)}</p> : null}
      {summary ? <PaymentSummaryCard paymentSummary={paymentSummary} summary={summary} t={t} /> : null}
      {summary ? <PaymentItemsList language={language} paymentSummary={paymentSummary} t={t} /> : null}
    </>
  );
}

function ContractorJourney({ journeyMessage, journeySteps, language, message, status, t }) {
  const overallProgress = calculateJourneyOverallProgress(journeySteps);

  return (
    <>
      <PageHeading kicker="PROJECT JOURNEY" title={t("Journey")} />
      {status === "loading" ? <section className="info-card"><p>{t("Journey 정보를 불러오고 있습니다.")}</p></section> : null}
      {message ? <p className="form-error">{t(message)}</p> : null}
      {journeyMessage ? <p className="form-error">{t(journeyMessage)}</p> : null}
      {status === "ready" && !journeySteps.length ? (
        <section className="info-card">
          <h3>{t("등록 대기")}</h3>
          <p>{t("Journey 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.")}</p>
        </section>
      ) : null}
      {journeySteps.length ? (
        <>
          <section className="meter-card">
            <h3>{t("전체 공정 진행률")}</h3>
            <AnimatedProgress label={t("전체 공정 진행률")} value={overallProgress} />
          </section>
          <section className="section-block">
            <h3>{t("8단계 Journey")}</h3>
            <div className="stage-list">
              {journeySteps.map((step) => <JourneyStageCard item={step} key={step.id} language={language} t={t} />)}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function ContractorPreview() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeading kicker="MY HOME PREVIEW" title={t("내 집 미리보기")} />
      <section className="preview-visual">
        <div className="floor-plan">
          {["Living", "Kitchen", "Bed", "Bath"].map((label) => (
            <span className={`room ${label.toLowerCase()}`} key={label}>{label}</span>
          ))}
        </div>
      </section>
      <section className="info-card">
        <h3>{t("준비 중")}</h3>
        <p>{t("내 집 미리보기 기능은 준비 중입니다.")}</p>
      </section>
    </>
  );
}

function PlaceholderPage({ kicker, message, title }) {
  return (
    <>
      <PageHeading kicker={kicker} title={title} />
      <section className="info-card">
        <h3>준비 중</h3>
        <p>{message}</p>
      </section>
    </>
  );
}

function ContractSummary({ compact = false, hint, summary, t, to }) {
  const unit = summary.unit || {};

  return (
    <SummaryCardShell className="info-card" hint={hint} to={to}>
      <h3>{t("My Contract Summary")}</h3>
      <dl className="compact-info">
        <InfoRow label={t("이름")} value={summary.full_name} t={t} />
        <InfoRow label={t("상태")} value={formatDisplayStatus(summary.status, t)} t={t} />
        {compact ? null : <InfoRow label={t("이메일")} value={summary.email} t={t} />}
        {compact ? null : <InfoRow label={t("전화번호")} value={summary.phone} t={t} />}
        <InfoRow label={t("호수")} value={unit.unit_code} t={t} />
        <InfoRow label={t("타입")} value={unit.property_type} t={t} />
        <PaymentMethodRows contractor={summary} label={t("납부방법")} t={t} />
      </dl>
    </SummaryCardShell>
  );
}

function PaymentSummaryCard({ hint, paymentSummary, summary, t, to }) {
  if (!paymentSummary?.plan) {
    return (
      <SummaryCardShell className="info-card" hint={hint} to={to}>
        <h3>{t("Payment Summary")}</h3>
        <p>{t("납부 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.")}</p>
        {summary ? <PaymentMethodPanel contractor={summary} label={t("결제수단")} t={t} /> : null}
      </SummaryCardShell>
    );
  }

  const { plan, totals } = paymentSummary;

  return (
    <SummaryCardShell className="meter-card" hint={hint} to={to}>
      <h3>{t("Payment Summary")}</h3>
      <div className="amount-grid">
        <Amount label={t("총 계약금액")} value={formatMoney(totals.totalPrice, plan.currency, t)} />
        <Amount label={t("납부 완료")} value={formatMoney(totals.totalPaidAmount, plan.currency, t)} />
        <Amount label={t("미납 금액")} value={formatMoney(totals.unpaidAmount, plan.currency, t)} />
      </div>
      {summary ? <PaymentMethodPanel contractor={summary} label={t("결제수단")} t={t} /> : null}
      <AnimatedProgress label={t("납부 진행률")} value={totals.progressPercent} />
    </SummaryCardShell>
  );
}

function JourneySummaryCard({ hint, journeyMessage, journeySteps, language, t, to }) {
  if (journeyMessage) {
    return (
      <SummaryCardShell className="info-card journey-summary-card" hint={hint} to={to}>
        <h3>{t("Journey Summary")}</h3>
        <p>{t(journeyMessage)}</p>
      </SummaryCardShell>
    );
  }

  if (!journeySteps.length) {
    return (
      <SummaryCardShell className="info-card journey-summary-card" hint={hint} to={to}>
        <h3>{t("Journey Summary")}</h3>
        <p>{t("Journey 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.")}</p>
      </SummaryCardShell>
    );
  }

  const currentStep = getCurrentJourneyStep(journeySteps);
  const overallProgress = calculateJourneyOverallProgress(journeySteps);
  const currentStepTitle = getJourneyStepTitle(currentStep, language);

  return (
    <SummaryCardShell className="meter-card journey-summary-card" hint={hint} to={to}>
      <h3>{t("Journey Summary")}</h3>
      <div className="journey-current-step">
        <span>{t("현재 구간")}</span>
        <strong>
          {currentStep.step_no}. {currentStepTitle}
        </strong>
        <small>{formatJourneyStatus(currentStep.status, t)} / {t("전체 평균")} {overallProgress}%</small>
      </div>
      <AnimatedProgress label={t("현재 구간 진행률")} value={currentStep.progress_percent} />
    </SummaryCardShell>
  );
}

function DocumentSummaryCard({ documentMessage, documentSummary, hint, t, to }) {
  if (documentMessage) {
    return (
      <SummaryCardShell className="info-card document-summary-card" hint={hint} to={to}>
        <h3>{t("Documents")}</h3>
        <p>{t(documentMessage)}</p>
      </SummaryCardShell>
    );
  }

  const count = documentSummary?.count || 0;
  const latest = documentSummary?.latest || null;

  return (
    <SummaryCardShell className="info-card document-summary-card" hint={hint} to={to}>
      <h3>{t("Documents")}</h3>
      <dl className="compact-info">
        <InfoRow label={t("등록 문서")} value={t("{count}개", { count })} t={t} />
        <InfoRow label={t("최근 문서")} value={latest?.title || t("등록된 문서 없음")} t={t} />
      </dl>
    </SummaryCardShell>
  );
}

function PreviewSummaryCard({ t }) {
  return (
    <SummaryCardShell className="info-card preview-summary-card" hint={t("미리보기 열기")} to="preview">
      <h3>{t("내 집 미리보기")}</h3>
      <p>{t("준비 중인 공간 미리보기 화면으로 이동합니다.")}</p>
    </SummaryCardShell>
  );
}

function SummaryCardShell({ children, className, hint, to }) {
  if (!to) {
    return <section className={className}>{children}</section>;
  }

  return (
    <Link className={`${className} clickable-card`} to={to}>
      {children}
      {hint ? <span className="card-link-hint">{hint}</span> : null}
    </Link>
  );
}

function ContractorDocuments({ documentMessage, documentSummary, message, openMyDocument, status, t }) {
  const documents = documentSummary?.documents || [];

  return (
    <>
      <PageHeading kicker="DOCUMENTS" title={t("문서")} />
      {status === "loading" ? <section className="info-card"><p>{t("문서 정보를 불러오고 있습니다.")}</p></section> : null}
      {message ? <p className="form-error">{t(message)}</p> : null}
      {documentMessage ? <p className="form-error">{t(documentMessage)}</p> : null}
      <section className="section-block">
        <div className="document-list">
          {documents.length ? (
            documents.map((document) => <ContractorDocumentCard document={document} key={document.id} onOpen={openMyDocument} t={t} />)
          ) : (
            <section className="info-card">
              <h3>{t("등록 대기")}</h3>
              <p>{t("등록된 문서가 아직 없습니다. 관리자에게 문의하세요.")}</p>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

function ContractorDocumentCard({ document, onOpen, t }) {
  return (
    <article className="document-card contractor-document-card">
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
      <button className="primary-button document-open-button" onClick={() => onOpen(document.file_path)} type="button">
        {t("열기 / 다운로드")}
      </button>
    </article>
  );
}

function PaymentItemsList({ language, paymentSummary, t }) {
  if (!paymentSummary?.plan) return null;
  const { items, plan } = paymentSummary;

  return (
    <section className="section-block">
      <h3>{t("8단계 납부 현황")}</h3>
      <div className="payment-stage-list">
        {items.length ? (
          items.map((item) => <PaymentItemCard currency={plan.currency} item={item} key={item.id} language={language} t={t} totalPrice={plan.total_price} />)
        ) : (
          <p>{t("납부 단계가 아직 생성되지 않았습니다. 관리자에게 문의하세요.")}</p>
        )}
      </div>
    </section>
  );
}

function PaymentItemCard({ currency, item, language, t, totalPrice }) {
  const normalizedItem = normalizePaymentItem(item, totalPrice);
  const displayTitle = getPaymentStepTitle(item, language);
  const unpaidAmount = getPaymentItemUnpaidAmount(normalizedItem);

  return (
    <article className="stage-card">
      <header>
        <h3>
          {item.step_no}. {displayTitle}
        </h3>
        <span className="status-chip">{formatDisplayStatus(normalizedItem.status, t)}</span>
      </header>
      <div className="stage-meta">
        <MiniStat label={t("납부 비율")} value={`${normalizedItem.payment_ratio ?? 0}%`} />
        <MiniStat label={t("단계별 납부 금액")} value={formatMoney(normalizedItem.required_amount, currency, t)} />
        <MiniStat label={t("납입한 금액")} value={formatMoney(normalizedItem.paid_amount, currency, t)} />
        <MiniStat label={t("미납 금액")} value={formatMoney(unpaidAmount, currency, t)} />
        <MiniStat label={t("예정일")} value={normalizedItem.due_date || t("미등록")} />
        <MiniStat label={t("납부일")} value={normalizedItem.paid_date || t("미등록")} />
      </div>
      {normalizedItem.note ? <p>{normalizedItem.note}</p> : null}
    </article>
  );
}

function JourneyStageCard({ item, language, t }) {
  const displayTitle = getJourneyStepTitle(item, language);
  const displayDescription = getJourneyStepDescription(item, language);

  return (
    <article className="stage-card journey-stage-card">
      <header>
        <div>
          <span className="eyebrow">STEP {item.step_no}</span>
          <h3>{displayTitle}</h3>
          {item.subtitle ? <p className="journey-subtitle">{item.subtitle}</p> : null}
        </div>
        <JourneyStatusChip status={item.status} t={t} />
      </header>
      {displayDescription ? <p>{displayDescription}</p> : null}
      <AnimatedProgress label={t("단계 진행률")} value={item.progress_percent} />
      <div className="stage-meta">
        <MiniStat label={t("목표일")} value={item.target_date || t("미등록")} />
        <MiniStat label={t("완료일")} value={item.completed_date || t("미등록")} />
      </div>
      {item.note ? <p className="journey-note">{item.note}</p> : null}
    </article>
  );
}

function PageHeading({ kicker, title }) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
      </div>
    </header>
  );
}

function PaymentMethodRows({ contractor, label, t }) {
  const methodLabel = formatPaymentMethod(contractor?.payment_method, t);
  if (contractor?.payment_method !== "bank_transfer") {
    return <InfoRow label={label} value={methodLabel} t={t} />;
  }

  return (
    <>
      <InfoRow label={label} value={methodLabel} t={t} />
      <InfoRow label={t("은행명")} value={contractor.bank_name} t={t} />
      <InfoRow label={t("계좌번호")} value={contractor.bank_account_number} t={t} />
      <InfoRow label={t("계좌명")} value={contractor.bank_account_holder} t={t} />
    </>
  );
}

function PaymentMethodPanel({ contractor, label, t }) {
  return (
    <dl className="payment-method-panel">
      <PaymentMethodRows contractor={contractor} label={label} t={t} />
    </dl>
  );
}

function Amount({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ label, t, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || t("미등록")}</dd>
    </div>
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

function formatMoney(value, currency, t) {
  if (value === null || value === undefined || value === "") return t("미등록");
  return `${Math.trunc(Number(value)).toLocaleString("ko-KR")} ${currency || "USD"}`;
}

function formatPaymentMethod(value, t) {
  return {
    bank_transfer: t("계좌이체"),
    cash: t("현금"),
  }[value] || t("미설정");
}

function formatDate(value) {
  if (!value) return "미등록";
  return new Date(value).toLocaleDateString("ko-KR");
}
