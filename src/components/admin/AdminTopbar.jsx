import LanguageToggle from "../LanguageToggle.jsx";
import AdminIcon from "./AdminIcon.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function AdminTopbar({ onLogout, onToggleSidebar, t }) {
  const { language } = useLanguage();

  return (
    <header className="crm-topbar">
      <button aria-label={t("Toggle navigation")} className="crm-icon-button crm-menu-button" onClick={onToggleSidebar} type="button"><AdminIcon name="menu" size={20} /></button>
      <label className="crm-search">
        <AdminIcon name="search" size={18} />
        <input aria-label={t("Search customers, units, contracts...")} placeholder={t("Search customers, units, contracts...")} type="search" />
      </label>
      <div className="crm-topbar__actions">
        <button aria-label={t("Notifications")} className="crm-icon-button crm-notification-button" type="button"><AdminIcon name="bell" size={19} /><span>8</span></button>
        <span className="crm-language-toggle">{language === "en" ? <><span className="crm-language-toggle__active">EN</span><LanguageToggle /></> : <><LanguageToggle /><span className="crm-language-toggle__active">KR</span></>}</span>
        <button className="crm-profile" onClick={onLogout} title={t("Log out")} type="button">
          <span className="crm-profile__avatar">AD</span>
          <span><strong>{t("Admin")}</strong><small>{t("System Administrator")}</small></span>
          <span className="crm-profile__chevron">⌄</span>
        </button>
      </div>
    </header>
  );
}
