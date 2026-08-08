import AdminIcon from "./AdminIcon.jsx";

export default function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`crm-status-badge crm-status-badge--${tone}`}><AdminIcon name={tone === "success" ? "trend" : "dashboard"} size={13} />{children}</span>;
}
