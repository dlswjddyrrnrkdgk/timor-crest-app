import { NavLink } from "react-router-dom";
import AdminIcon from "./AdminIcon.jsx";

const menuItems = [
  ["/admin", "Dashboard", "dashboard", true],
  ["/admin/contractors", "Customers", "customers"],
  ["/admin/units", "Units", "building"],
  ["/admin/payments", "Payments", "payment"],
  ["/admin/documents", "Documents", "document"],
  ["/admin/journey", "Journey", "journey"],
  ["/admin/reports", "Reports", "trend"],
  ["/admin/settings", "Settings", "settings"],
];

export default function AdminSidebar({ onNavigate, t }) {
  return (
    <aside className="crm-sidebar" aria-label="Admin CRM navigation">
      <div className="crm-brand">
        <span className="crm-brand__mark"><AdminIcon name="building" size={22} /></span>
        <span><strong>TIMOR CREST</strong><small>CRM</small></span>
      </div>
      <nav className="crm-sidebar__nav">
        <span className="crm-sidebar__label">{t("Workspace")}</span>
        {menuItems.map(([to, label, icon, end]) => (
          <NavLink className={({ isActive }) => `crm-sidebar__link${isActive ? " is-active" : ""}`} end={end} key={to} onClick={onNavigate} to={to}>
            <AdminIcon name={icon} size={18} /><span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="crm-property-card">
        <span className="crm-property-card__art"><AdminIcon name="building" size={34} /></span>
        <strong>{t("Timor Crest Residences")}</strong>
        <small>{t("Dili, Timor-Leste")}</small>
      </div>
    </aside>
  );
}
