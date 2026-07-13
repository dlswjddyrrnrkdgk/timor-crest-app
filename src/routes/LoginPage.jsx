import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getRoleRedirect,
  resolveSessionProfile,
  signInWithEmail,
  SUPABASE_CONFIG_MESSAGE,
  UNREGISTERED_ACCOUNT_MESSAGE,
} from "../services/authService.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState(location.state?.error || "");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    let isMounted = true;

    async function redirectExistingSession() {
      const result = await resolveSessionProfile();
      if (!isMounted) return;
      if (result.ok && result.profile) {
        navigate(getRoleRedirect(result.profile.role), { replace: true });
        return;
      }
      if (!result.ok && result.error !== SUPABASE_CONFIG_MESSAGE) {
        setMessage(result.error || UNREGISTERED_ACCOUNT_MESSAGE);
      }
      setStatus("ready");
    }

    redirectExistingSession();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const result = await signInWithEmail(form.email.trim(), form.password);
    if (!result.ok) {
      setMessage(result.error || UNREGISTERED_ACCOUNT_MESSAGE);
      setStatus("ready");
      return;
    }

    navigate(getRoleRedirect(result.profile.role), { replace: true });
  }

  if (status === "checking") {
    return <LoginFrame statusLabel="Login" title="로그인 상태를 확인하고 있습니다." />;
  }

  return (
    <LoginFrame statusLabel="Login" title="Timor Crest Portal">
      <form className="login-card" onSubmit={handleSubmit} aria-label="Portal login">
        <h2>로그인</h2>
        <label className="field">
          <span>이메일</span>
          <input
            autoComplete="email"
            name="email"
            onChange={updateField}
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input
            autoComplete="current-password"
            name="password"
            onChange={updateField}
            required
            type="password"
            value={form.password}
          />
        </label>
        {message ? <p className="form-error">{message}</p> : null}
        <button className="primary-button" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "로그인 중" : "로그인"}
        </button>
      </form>
      <p className="security-note">계정은 관리자 초대 또는 수동 등록으로만 발급됩니다.</p>
    </LoginFrame>
  );
}

function LoginFrame({ children, statusLabel, title }) {
  return (
    <main className="demo-stage" aria-label="Timor Crest login">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span>{statusLabel}</span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active login-screen">
            <div className="login-brand">
              <span className="eyebrow">SECURE PORTAL</span>
              <h1>{title}</h1>
            </div>
            {children}
          </section>
        </div>
      </section>
    </main>
  );
}
