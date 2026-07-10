import { useNavigate } from "react-router-dom";
import { signOut } from "../services/authService.js";

const adminTabs = ["Dashboard", "호수 관리", "Journey 공정 관리", "납부 일정 관리", "문서 관리"];

export default function AdminLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

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
                  <span>Phase</span>
                  <strong>1</strong>
                </article>
                <article className="metric-card">
                  <span>Auth</span>
                  <strong>Ready</strong>
                </article>
              </div>
              <h2>운영 포털 준비</h2>
              <p>
                Supabase Auth와 role guard가 적용된 Admin shell입니다. 계약자 CRUD, Payment, Journey, 문서 관리는 다음 Phase에서
                기존 데모 흐름을 유지해 연결합니다.
              </p>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
