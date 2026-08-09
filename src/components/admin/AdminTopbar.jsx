import { useEffect, useRef, useState } from "react";
import LanguageToggle from "../LanguageToggle.jsx";
import AdminIcon from "./AdminIcon.jsx";
import { buildDashboardAlertDetailRows, buildDashboardAlertReason } from "../../services/adminDashboardModel.js";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function AdminTopbar({ dashboardAlerts = [], isMobileViewport, onLogout, onToggleSidebar, sidebarCollapsed, sidebarOpen, t }) {
  const { language } = useLanguage();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const notificationRootRef = useRef(null);
  const sidebarLabel = isMobileViewport
    ? (sidebarOpen ? t("Hide sidebar") : t("Show sidebar"))
    : (sidebarCollapsed ? t("Show sidebar") : t("Hide sidebar"));

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function handleDocumentPointerDown(event) {
      if (!notificationRootRef.current?.contains(event.target)) setNotificationsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!dashboardAlerts.some((alert) => alert.id === selectedNotificationId)) setSelectedNotificationId(null);
  }, [dashboardAlerts, selectedNotificationId]);

  function toggleNotifications() {
    setNotificationsOpen((current) => !current);
  }

  return (
    <header className="crm-topbar">
      <button aria-label={sidebarLabel} className="crm-icon-button crm-menu-button" onClick={onToggleSidebar} title={sidebarLabel} type="button"><AdminIcon name="menu" size={20} /></button>
      <label className="crm-search">
        <AdminIcon name="search" size={18} />
        <input aria-label={t("Search customers, units, contracts...")} placeholder={t("Search customers, units, contracts...")} type="search" />
      </label>
      <div className="crm-topbar__actions">
        <div className="crm-notification-root" ref={notificationRootRef}>
          <button aria-controls="crm-notification-popover" aria-expanded={notificationsOpen} aria-haspopup="dialog" aria-label={t("Notifications")} className="crm-icon-button crm-notification-button" onClick={toggleNotifications} type="button">
            <AdminIcon name="bell" size={19} />
            {dashboardAlerts.length ? <span>{dashboardAlerts.length}</span> : null}
          </button>
          {notificationsOpen ? <NotificationPopover alerts={dashboardAlerts} language={language} selectedId={selectedNotificationId} setSelectedId={setSelectedNotificationId} t={t} /> : null}
        </div>
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

function NotificationPopover({ alerts, language, selectedId, setSelectedId, t }) {
  return (
    <div aria-label={t("Notifications")} className="crm-notification-popover" id="crm-notification-popover" role="dialog">
      <header className="crm-notification-popover__header">
        <div><strong>{t("Notifications")}</strong><small>{alerts.length ? alerts.length + " " + t("alerts") : t("No notifications.")}</small></div>
        <AdminIcon name="bell" size={16} />
      </header>
      {alerts.length ? (
        <div className="crm-notification-list">
          {alerts.map((alert) => {
            const expanded = selectedId === alert.id;
            const detailId = "crm-notification-detail-" + alert.id;
            const detailRows = buildDashboardAlertDetailRows(alert, language);
            return (
              <div className="crm-notification-item" key={alert.id}>
                <button aria-controls={detailId} aria-expanded={expanded} className={"crm-notification-item__trigger" + (expanded ? " is-expanded" : "")} onClick={() => setSelectedId(expanded ? null : alert.id)} type="button">
                  <span className="crm-notification-item__icon"><AdminIcon name="payment" size={14} /></span>
                  <span className="crm-notification-item__main"><strong>{alert.title}</strong><small>{alert.customerName || t("Customer unavailable")}</small></span>
                  <span className="crm-notification-item__amount">{formatNotificationMoney(alert.unpaidAmount, alert.currency)}</span>
                </button>
                {expanded ? (
                  <div className="crm-notification-item__detail" id={detailId}>
                    <strong>{t("Why this alert appears")}</strong>
                    <p>{buildDashboardAlertReason(alert, language)}</p>
                    <dl>
                      {detailRows.map((row) => (
                        <div key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>{row.kind === "amount" ? formatNotificationMoney(row.value, alert.currency) : String(row.value ?? t("Not available"))}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : <p className="crm-notification-empty">{t("No notifications.")}</p>}
    </div>
  );
}

function formatNotificationMoney(value, currency = "USD") {
  const amount = Number(value ?? 0);
  return Math.trunc(Number.isFinite(amount) ? amount : 0).toLocaleString() + " " + currency;
}
