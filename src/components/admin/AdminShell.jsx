import { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import AdminTopbar from "./AdminTopbar.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function AdminShell({ children, onLogout }) {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 780px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener?.("change", updateViewport);
    return () => mediaQuery.removeEventListener?.("change", updateViewport);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("timorcrest_admin_sidebar_collapsed", String(sidebarCollapsed));
    } catch {
      return undefined;
    }
    return undefined;
  }, [sidebarCollapsed]);

  function handleSidebarToggle() {
    if (isMobileViewport) {
      setSidebarOpen((current) => !current);
      return;
    }
    setSidebarCollapsed((current) => !current);
  }

  return (
    <div className={`crm-shell${sidebarOpen ? " is-sidebar-open" : ""}${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      <AdminSidebar collapsed={sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} t={t} />
      <div className="crm-workspace">
        <AdminTopbar isMobileViewport={isMobileViewport} onLogout={onLogout} onToggleSidebar={handleSidebarToggle} sidebarCollapsed={sidebarCollapsed} sidebarOpen={sidebarOpen} t={t} />
        <main className="crm-main">{children}</main>
      </div>
    </div>
  );
}

function readSidebarCollapsed() {
  try {
    return window.localStorage.getItem("timorcrest_admin_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}
