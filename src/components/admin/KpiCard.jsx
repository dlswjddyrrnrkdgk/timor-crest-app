import AdminIcon from "./AdminIcon.jsx";

export default function KpiCard({ helper, icon, label, value, tone = "blue" }) {
  return (
    <article className={`crm-kpi-card crm-kpi-card--${tone}`}>
      <span className="crm-kpi-card__icon"><AdminIcon name={icon} size={19} /></span>
      <span className="crm-kpi-card__label">{label}</span>
      <strong className="crm-kpi-card__value">{value}</strong>
      {helper ? <span className="crm-kpi-card__helper">{helper}</span> : null}
    </article>
  );
}
