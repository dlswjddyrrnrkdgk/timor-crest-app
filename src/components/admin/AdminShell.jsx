import { useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import AdminTopbar from "./AdminTopbar.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function AdminShell({ children, onLogout }) {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`crm-shell${sidebarOpen ? " is-sidebar-open" : ""}`}>
      <AdminSidebar onNavigate={() => setSidebarOpen(false)} t={t} />
      <div className="crm-workspace">
        <AdminTopbar onLogout={onLogout} onToggleSidebar={() => setSidebarOpen((current) => !current)} t={t} />
        <main className="crm-main">{children}</main>
      </div>
    </div>
  );
}
