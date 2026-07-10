import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyContractorSummary } from "../services/contractorService.js";
import { signOut } from "../services/authService.js";

const contractorNav = ["홈", "Journey", "납부", "문서", "MY"];

export default function ContractorLayout() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setStatus("loading");
    setMessage("");
    const result = await getMyContractorSummary();
    if (result.error) {
      setMessage(result.error);
      setStatus("ready");
      return;
    }
    setSummary(result.data);
    setStatus("ready");
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <main className="demo-stage" aria-label="Timor Crest contractor portal">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span>Contractor</span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active phase-shell">
            <section className="home-hero">
              <div>
                <span className="eyebrow">OWNER</span>
                <h1>내 계약 정보</h1>
                <p>로그인한 계정에 연결된 계약자 정보만 표시됩니다.</p>
              </div>
              <div className="hero-unit">
                <span>Access</span>
                <strong>RLS</strong>
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
            {summary ? <ContractSummary summary={summary} /> : null}

            <button className="secondary-button logout-button" onClick={handleLogout} type="button">
              로그아웃
            </button>
          </section>
        </div>
        <nav className="bottom-nav" aria-label="Contractor navigation">
          {contractorNav.map((label, index) => (
            <button className={index === 0 ? "is-active" : ""} disabled key={label} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d={index === 0 ? "M4 11.5 12 5l8 6.5V20h-6v-6h-4v6H4z" : "M5 12h14M12 5v14"} />
                </svg>
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

function ContractSummary({ summary }) {
  const unit = summary.unit || {};

  return (
    <>
      <section className="info-card">
        <h3>My Contract Summary</h3>
        <dl className="compact-info">
          <InfoRow label="이름" value={summary.full_name} />
          <InfoRow label="이메일" value={summary.email} />
          <InfoRow label="전화번호" value={summary.phone} />
          <InfoRow label="상태" value={summary.status} />
        </dl>
      </section>
      <section className="info-card">
        <h3>Unit</h3>
        <dl className="compact-info">
          <InfoRow label="호수" value={unit.unit_code} />
          <InfoRow label="이름" value={unit.unit_name} />
          <InfoRow label="타입" value={unit.property_type} />
          <InfoRow label="총 금액" value={formatMoney(unit.total_price, unit.currency)} />
          <InfoRow label="통화" value={unit.currency} />
        </dl>
      </section>
      <section className="home-summary">
        <article>
          <span>Journey</span>
          <strong>Phase 3</strong>
          <p>전체 현장 공통 8단계 연결 예정</p>
        </article>
        <article>
          <span>납부</span>
          <strong>읽기 전용</strong>
          <p>계약자별 8단계 연결 예정</p>
        </article>
      </section>
    </>
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

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "미등록";
  return `${Number(value).toLocaleString("ko-KR")} ${currency || "USD"}`;
}
