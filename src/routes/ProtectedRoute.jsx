import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getRoleRedirect, resolveSessionProfile, UNREGISTERED_ACCOUNT_MESSAGE } from "../services/authService.js";

export default function ProtectedRoute({ allowedRole, children }) {
  const location = useLocation();
  const [state, setState] = useState({ status: "loading", profile: null, error: "" });

  useEffect(() => {
    let isMounted = true;

    async function verifyAccess() {
      const result = await resolveSessionProfile();
      if (!isMounted) return;
      if (!result.ok) {
        setState({ status: "blocked", profile: null, error: result.error || UNREGISTERED_ACCOUNT_MESSAGE });
        return;
      }
      if (!result.session || !result.profile) {
        setState({ status: "anonymous", profile: null, error: "" });
        return;
      }
      setState({ status: "ready", profile: result.profile, error: "" });
    }

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (state.status === "loading") return <AuthFrame label="Auth" message="접근 권한을 확인하고 있습니다." />;
  if (state.status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (state.status === "blocked") return <Navigate to="/login" replace state={{ error: state.error }} />;
  if (state.profile.role !== allowedRole) return <Navigate to={getRoleRedirect(state.profile.role)} replace />;

  return children;
}

function AuthFrame({ label, message }) {
  return (
    <main className="demo-stage" aria-label="Timor Crest auth status">
      <section className="phone-frame" aria-label="20:9 smartphone screen">
        <header className="phone-status" aria-label="App status">
          <span>Timor Crest</span>
          <span>{label}</span>
        </header>
        <div className="screen-viewport">
          <section className="view-screen is-active">
            <div className="login-brand phase-status">
              <span className="eyebrow">SECURE PORTAL</span>
              <h1>{message}</h1>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
