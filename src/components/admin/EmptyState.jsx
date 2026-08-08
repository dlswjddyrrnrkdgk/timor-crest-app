import AdminIcon from "./AdminIcon.jsx";

export default function EmptyState({ children, tone = "empty" }) {
  return <div className={`crm-empty-state crm-empty-state--${tone}`}><span className="crm-empty-state__icon"><AdminIcon name={tone === "error" ? "bell" : "document"} size={18} /></span><p>{children}</p></div>;
}
