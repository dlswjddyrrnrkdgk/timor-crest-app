import { NavLink } from "react-router-dom";
import AdminIcon from "./AdminIcon.jsx";

export default function QuickActionCard({ description, icon, label, to }) {
  return (
    <NavLink className="crm-quick-action" to={to}>
      <span className="crm-quick-action__icon"><AdminIcon name={icon} size={18} /></span>
      <span><strong>{label}</strong><small>{description}</small></span>
      <AdminIcon name="chevron" size={15} />
    </NavLink>
  );
}
