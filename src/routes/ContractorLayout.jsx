import { useNavigate } from "react-router-dom";
import { signOut } from "../services/authService.js";

const contractorNav = ["홈", "Journey", "납부", "문서", "MY"];

export default function ContractorLayout() {
  const navigate = useNavigate();

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
                <h1>Contractor Portal</h1>
                <p>본인 계약 정보만 볼 수 있는 보호된 계약자 shell입니다.</p>
              </div>
              <div className="hero-unit">
                <span>Phase</span>
                <strong>1</strong>
              </div>
            </section>
            <section className="home-summary">
              <article>
                <span>다음 일정</span>
                <strong>Phase 3</strong>
                <p>Journey 데이터 연결 예정</p>
              </article>
              <article>
                <span>납부 정보</span>
                <strong>읽기 전용</strong>
                <p>Payment 8단계 유지 예정</p>
              </article>
            </section>
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
