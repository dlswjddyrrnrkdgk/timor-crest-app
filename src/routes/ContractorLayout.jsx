import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AnimatedProgress from "../components/AnimatedProgress.jsx";
import { getMyContractorSummary } from "../services/contractorService.js";
import { getMyPaymentSummary } from "../services/paymentService.js";
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
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setStatus("loading");
    setMessage("");
    const [contractResult, paymentResult] = await Promise.all([getMyContractorSummary(), getMyPaymentSummary()]);
    if (contractResult.error || paymentResult.error) {
      setMessage(contractResult.error || paymentResult.error);
      setStatus("ready");
      return;
    }
    setSummary(contractResult.data);
    setPaymentSummary(paymentResult.data);
    setStatus("ready");
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const shell = { message, paymentSummary, status, summary };

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
              <Route path="journey" element={<PlaceholderPage kicker="JOURNEY" title="Journey" message="Journey 기능은 다음 단계에서 연결됩니다." />} />
              <Route path="payments" element={<ContractorPayments {...shell} />} />
              <Route path="documents" element={<PlaceholderPage kicker="DOCUMENTS" title="문서" message="문서 기능은 다음 단계에서 연결됩니다." />} />
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

function ContractorHome({ message, paymentSummary, status, summary }) {
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
      {summary ? <ContractSummary summary={summary} compact /> : null}
      {summary ? <PaymentSummaryCard paymentSummary={paymentSummary} /> : null}
      <section className="management-action-grid">
        <Link className="primary-button" to="payments">납부 현황 보기</Link>
        <Link className="secondary-button" to="preview">내 집 미리보기</Link>
      </section>
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

function ContractSummary({ compact = false, summary }) {
  const unit = summary.unit || {};

  return (
    <section className="info-card">
      <h3>My Contract Summary</h3>
      <dl className="compact-info">
        <InfoRow label="이름" value={summary.full_name} />
        <InfoRow label="상태" value={summary.status} />
        {compact ? null : <InfoRow label="이메일" value={summary.email} />}
        {compact ? null : <InfoRow label="전화번호" value={summary.phone} />}
        <InfoRow label="호수" value={unit.unit_code} />
        <InfoRow label="타입" value={unit.property_type} />
      </dl>
    </section>
  );
}

function PaymentSummaryCard({ paymentSummary }) {
  if (!paymentSummary?.plan) {
    return (
      <section className="info-card">
        <h3>Payment Summary</h3>
        <p>납부 정보가 아직 등록되지 않았습니다. 관리자에게 문의하세요.</p>
      </section>
    );
  }

  const { plan, totals } = paymentSummary;

  return (
    <section className="meter-card">
      <h3>Payment Summary</h3>
      <div className="amount-grid">
        <Amount label="총 계약금액" value={formatMoney(totals.totalPrice, plan.currency)} />
        <Amount label="납부 완료" value={formatMoney(totals.totalPaidAmount, plan.currency)} />
        <Amount label="미납 금액" value={formatMoney(totals.unpaidAmount, plan.currency)} />
      </div>
      <AnimatedProgress label="납부 진행률" value={totals.progressPercent} />
    </section>
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

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "미등록";
  return `${Number(value).toLocaleString("ko-KR")} ${currency || "USD"}`;
}
