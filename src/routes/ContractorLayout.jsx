import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AnimatedProgress from "../components/AnimatedProgress.jsx";
import { getMyContractorSummary } from "../services/contractorService.js";
import { getMyPaymentSummary } from "../services/paymentService.js";
import { calculateJourneyOverallProgress, getCurrentJourneyStep, getJourneySteps } from "../services/journeyService.js";
import { createMyDocumentSignedUrl, getMyDocumentSummary } from "../services/documentService.js";
import { formatFileSize } from "../services/documentModel.js";
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
  const [summary, setSummary] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [journeySteps, setJourneySteps] = useState([]);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [documentSummary, setDocumentSummary] = useState(null);
  const [documentMessage, setDocumentMessage] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

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

  const shell = { documentMessage, documentSummary, journeyMessage, journeySteps, message, openMyDocument, paymentSummary, status, summary };

  return (
    <main className="demo-stage" aria-label="Timor Crest contractor portal">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span>Contractor</span>
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
              로그아웃
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
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    </main>
  );
}

function ContractorHome({ documentMessage, documentSummary, journeyMessage, journeySteps, message, paymentSummary, status, summary }) {
  return (
    <>
      <section className="home-hero">
        <div>
          <span className="eyebrow">OWNER</span>
          <h1>내 계약 정보</h1>
          <p>납부 현황과 주요 계약 정보를 간단히 확인하세요.</p>
        </div>
        <div className="hero-unit">
          <span>호수</span>
          <strong>{summary?.unit?.unit_code || "미등록"}</strong>
        </div>
      </section>
      {status === "loading" ? <section className="info-card"><p>계약 정보를 불러오고 있습니다.</p></section> : null}
      {message ? <p className="form-error">{message}</p> : null}
      {status === "ready" && !summary ? (
        <section className="info-card">
          <h3>등록 대기</h3>
          <p>계약자 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.</p>
        </section>
      ) : null}
      {summary ? <ContractSummary hint="Journey 상세 보기" summary={summary} to="journey" compact /> : null}
      {summary ? <PaymentSummaryCard hint="납부 상세 보기" paymentSummary={paymentSummary} to="payments" /> : null}
      {summary ? <JourneySummaryCard hint="Journey 상세 보기" journeyMessage={journeyMessage} journeySteps={journeySteps} to="journey" /> : null}
      {summary ? <DocumentSummaryCard documentMessage={documentMessage} documentSummary={documentSummary} hint="문서함 열기" to="documents" /> : null}
      {summary ? <PreviewSummaryCard /> : null}
    </>
  );
}

function ContractorPayments({ message, paymentSummary, status, summary }) {
  return (
    <>
      <PageHeading kicker="PAYMENT" title="납부 현황" />
      {status === "loading" ? <section className="info-card"><p>납부 정보를 불러오고 있습니다.</p></section> : null}
      {message ? <p className="form-error">{message}</p> : null}
      {summary ? <PaymentSummaryCard paymentSummary={paymentSummary} /> : null}
      {summary ? <PaymentItemsList paymentSummary={paymentSummary} /> : null}
    </>
  );
}

function ContractorJourney({ journeyMessage, journeySteps, message, status }) {
  const overallProgress = calculateJourneyOverallProgress(journeySteps);

  return (
    <>
      <PageHeading kicker="PROJECT JOURNEY" title="Journey" />
      {status === "loading" ? <section className="info-card"><p>Journey 정보를 불러오고 있습니다.</p></section> : null}
      {message ? <p className="form-error">{message}</p> : null}
      {journeyMessage ? <p className="form-error">{journeyMessage}</p> : null}
      {status === "ready" && !journeySteps.length ? (
        <section className="info-card">
          <h3>등록 대기</h3>
          <p>Journey 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.</p>
        </section>
      ) : null}
      {journeySteps.length ? (
        <>
          <section className="meter-card">
            <h3>전체 공정 진행률</h3>
            <p>모든 계약자에게 동일하게 적용되는 프로젝트 공정 현황입니다.</p>
            <AnimatedProgress label="전체 공정 진행률" value={overallProgress} />
          </section>
          <section className="section-block">
            <h3>8단계 Journey</h3>
            <div className="stage-list">
              {journeySteps.map((step) => <JourneyStageCard item={step} key={step.id} />)}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function ContractorPreview() {
  return (
    <>
      <PageHeading kicker="MY HOME PREVIEW" title="내 집 미리보기" />
      <section className="preview-visual">
        <div className="floor-plan">
          {["Living", "Kitchen", "Bed", "Bath"].map((label) => (
            <span className={`room ${label.toLowerCase()}`} key={label}>{label}</span>
          ))}
        </div>
      </section>
      <section className="info-card">
        <h3>준비 중</h3>
        <p>내 집 미리보기 기능은 준비 중입니다.</p>
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

function ContractSummary({ compact = false, hint, summary, to }) {
  const unit = summary.unit || {};

  return (
    <SummaryCardShell className="info-card" hint={hint} to={to}>
      <h3>My Contract Summary</h3>
      <dl className="compact-info">
        <InfoRow label="이름" value={summary.full_name} />
        <InfoRow label="상태" value={summary.status} />
        {compact ? null : <InfoRow label="이메일" value={summary.email} />}
        {compact ? null : <InfoRow label="전화번호" value={summary.phone} />}
        <InfoRow label="호수" value={unit.unit_code} />
        <InfoRow label="타입" value={unit.property_type} />
      </dl>
    </SummaryCardShell>
  );
}

function PaymentSummaryCard({ hint, paymentSummary, to }) {
  if (!paymentSummary?.plan) {
    return (
      <SummaryCardShell className="info-card" hint={hint} to={to}>
        <h3>Payment Summary</h3>
        <p>납부 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.</p>
      </SummaryCardShell>
    );
  }

  const { plan, totals } = paymentSummary;

  return (
    <SummaryCardShell className="meter-card" hint={hint} to={to}>
      <h3>Payment Summary</h3>
      <div className="amount-grid">
        <Amount label="총 계약금액" value={formatMoney(totals.totalPrice, plan.currency)} />
        <Amount label="납부 완료" value={formatMoney(totals.totalPaidAmount, plan.currency)} />
        <Amount label="미납 금액" value={formatMoney(totals.unpaidAmount, plan.currency)} />
      </div>
      <AnimatedProgress label="납부 진행률" value={totals.progressPercent} />
    </SummaryCardShell>
  );
}

function JourneySummaryCard({ hint, journeyMessage, journeySteps, to }) {
  if (journeyMessage) {
    return (
      <SummaryCardShell className="info-card journey-summary-card" hint={hint} to={to}>
        <h3>Journey Summary</h3>
        <p>{journeyMessage}</p>
      </SummaryCardShell>
    );
  }

  if (!journeySteps.length) {
    return (
      <SummaryCardShell className="info-card journey-summary-card" hint={hint} to={to}>
        <h3>Journey Summary</h3>
        <p>Journey 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.</p>
      </SummaryCardShell>
    );
  }

  const currentStep = getCurrentJourneyStep(journeySteps);
  const overallProgress = calculateJourneyOverallProgress(journeySteps);

  return (
    <SummaryCardShell className="meter-card journey-summary-card" hint={hint} to={to}>
      <h3>Journey Summary</h3>
      <div className="journey-current-step">
        <span>현재 구간</span>
        <strong>
          {currentStep.step_no}. {currentStep.title}
        </strong>
        <small>{formatJourneyStatus(currentStep.status)} / 전체 평균 {overallProgress}%</small>
      </div>
      <AnimatedProgress label="현재 구간 진행률" value={currentStep.progress_percent} />
    </SummaryCardShell>
  );
}

function DocumentSummaryCard({ documentMessage, documentSummary, hint, to }) {
  if (documentMessage) {
    return (
      <SummaryCardShell className="info-card document-summary-card" hint={hint} to={to}>
        <h3>Documents</h3>
        <p>{documentMessage}</p>
      </SummaryCardShell>
    );
  }

  const count = documentSummary?.count || 0;
  const latest = documentSummary?.latest || null;

  return (
    <SummaryCardShell className="info-card document-summary-card" hint={hint} to={to}>
      <h3>Documents</h3>
      <dl className="compact-info">
        <InfoRow label="등록 문서" value={`${count}개`} />
        <InfoRow label="최근 문서" value={latest?.title || "등록된 문서 없음"} />
      </dl>
    </SummaryCardShell>
  );
}

function PreviewSummaryCard() {
  return (
    <SummaryCardShell className="info-card preview-summary-card" hint="미리보기 열기" to="preview">
      <h3>내 집 미리보기</h3>
      <p>준비 중인 공간 미리보기 화면으로 이동합니다.</p>
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

function ContractorDocuments({ documentMessage, documentSummary, message, openMyDocument, status }) {
  const documents = documentSummary?.documents || [];

  return (
    <>
      <PageHeading kicker="DOCUMENTS" title="문서" />
      {status === "loading" ? <section className="info-card"><p>문서 정보를 불러오고 있습니다.</p></section> : null}
      {message ? <p className="form-error">{message}</p> : null}
      {documentMessage ? <p className="form-error">{documentMessage}</p> : null}
      <section className="section-block">
        <div className="document-list">
          {documents.length ? (
            documents.map((document) => <ContractorDocumentCard document={document} key={document.id} onOpen={openMyDocument} />)
          ) : (
            <section className="info-card">
              <h3>등록 대기</h3>
              <p>등록된 문서가 아직 없습니다. 관리자에게 문의하세요.</p>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

function ContractorDocumentCard({ document, onOpen }) {
  return (
    <article className="document-card contractor-document-card">
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
      <button className="primary-button document-open-button" onClick={() => onOpen(document.file_path)} type="button">
        열기 / 다운로드
      </button>
    </article>
  );
}

function PaymentItemsList({ paymentSummary }) {
  if (!paymentSummary?.plan) return null;
  const { items, plan } = paymentSummary;

  return (
    <section className="section-block">
      <h3>8단계 납부 현황</h3>
      <div className="payment-stage-list">
        {items.length ? (
          items.map((item) => <PaymentItemCard currency={plan.currency} item={item} key={item.id} />)
        ) : (
          <p>납부 단계가 아직 생성되지 않았습니다. 관리자에게 문의하세요.</p>
        )}
      </div>
    </section>
  );
}

function PaymentItemCard({ currency, item }) {
  return (
    <article className="stage-card">
      <header>
        <h3>
          {item.step_no}. {item.title}
        </h3>
        <span className="status-chip">{item.status}</span>
      </header>
      <div className="stage-meta">
        <MiniStat label="납입해야 하는 금액" value={formatMoney(item.required_amount, currency)} />
        <MiniStat label="납입한 금액" value={formatMoney(item.paid_amount, currency)} />
        <MiniStat label="예정일" value={item.due_date || "미등록"} />
        <MiniStat label="납부일" value={item.paid_date || "미등록"} />
      </div>
      {item.note ? <p>{item.note}</p> : null}
    </article>
  );
}

function JourneyStageCard({ item }) {
  return (
    <article className="stage-card journey-stage-card">
      <header>
        <div>
          <span className="eyebrow">STEP {item.step_no}</span>
          <h3>{item.title}</h3>
          {item.subtitle ? <p className="journey-subtitle">{item.subtitle}</p> : null}
        </div>
        <JourneyStatusChip status={item.status} />
      </header>
      {item.description ? <p>{item.description}</p> : null}
      <AnimatedProgress label="단계 진행률" value={item.progress_percent} />
      <div className="stage-meta">
        <MiniStat label="목표일" value={item.target_date || "미등록"} />
        <MiniStat label="완료일" value={item.completed_date || "미등록"} />
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

function Amount({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "미등록"}</dd>
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

function JourneyStatusChip({ status }) {
  return <span className={`status-chip status-${status || "pending"}`}>{formatJourneyStatus(status)}</span>;
}

function formatJourneyStatus(status) {
  return {
    completed: "완료",
    delayed: "지연",
    in_progress: "진행 중",
    pending: "대기",
  }[status] || status || "대기";
}

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "미등록";
  return `${Number(value).toLocaleString("ko-KR")} ${currency || "USD"}`;
}

function formatDate(value) {
  if (!value) return "미등록";
  return new Date(value).toLocaleDateString("ko-KR");
}
