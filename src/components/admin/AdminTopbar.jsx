import { useEffect, useRef, useState } from "react";
import LanguageToggle from "../LanguageToggle.jsx";
import AdminIcon from "./AdminIcon.jsx";
import { buildDashboardAlertDetailRows, buildDashboardAlertReason, getUnreadDashboardAlerts } from "../../services/adminDashboardModel.js";
import { formatCurrencyAmount } from "../../services/formatters.js";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function AdminTopbar({ dashboardAlerts = [], isMobileViewport, onLogout, onToggleSidebar, sidebarCollapsed, sidebarOpen, t }) {
  const { language } = useLanguage();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => readAcknowledgedAlertIds());
  const notificationRootRef = useRef(null);
  const unreadAlerts = getUnreadDashboardAlerts(dashboardAlerts, acknowledgedIds);
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

  function markAlertsRead() {
    const nextIds = [...new Set([...acknowledgedIds, ...unreadAlerts.map((alert) => alert?.id).filter(Boolean)])];
    setAcknowledgedIds(nextIds);
    setSelectedNotificationId(null);
    try {
      window.localStorage.setItem("timorcrest_admin_acknowledged_alerts", JSON.stringify(nextIds));
    } catch {
      return undefined;
    }
    return undefined;
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
            {unreadAlerts.length ? <span>{unreadAlerts.length}</span> : null}
          </button>
          {notificationsOpen ? <NotificationPopover alerts={unreadAlerts} language={language} onMarkRead={markAlertsRead} selectedId={selectedNotificationId} setSelectedId={setSelectedNotificationId} t={t} unreadCount={unreadAlerts.length} /> : null}
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

function NotificationPopover({ alerts, language, onMarkRead, selectedId, setSelectedId, t, unreadCount }) {
  return (
    <div aria-label={t("Notifications")} className="crm-notification-popover" id="crm-notification-popover" role="dialog">
      <header className="crm-notification-popover__header">
        <div><strong>{t("Notifications")}</strong><small>{alerts.length ? alerts.length + " " + t("alerts") : t("No new alerts")}</small></div>
        <AdminIcon name="bell" size={16} />
      </header>
      <div className="crm-notification-popover__body">
        {alerts.length ? (
          <div className="crm-notification-list">
            {alerts.map((alert) => {
              const expanded = selectedId === alert.id;
              const detailId = "crm-notification-detail-" + alert.id;
              const detailRows = buildDashboardAlertDetailRows(alert, language);
              const scheduleAlert = Boolean(alert.isScheduleAlert);
              return (
                <div className={`crm-notification-item${scheduleAlert ? " is-schedule" : ""}`} key={alert.id}>
                  <button aria-controls={detailId} aria-expanded={expanded} className={"crm-notification-item__trigger" + (expanded ? " is-expanded" : "")} onClick={() => setSelectedId(expanded ? null : alert.id)} type="button">
                    <span className="crm-notification-item__icon"><AdminIcon name={scheduleAlert ? "calendar" : "payment"} size={14} /></span>
                    <span className="crm-notification-item__main"><strong>{getNotificationTitle(alert, language, t)}</strong><small>{alert.customerName || (alert.isMore ? "" : t("Customer unavailable"))}</small></span>
                    {scheduleAlert && alert.startTime ? <span className="crm-notification-item__amount">{alert.startTime}</span> : null}
                    {!scheduleAlert ? <span className="crm-notification-item__amount">{formatNotificationMoney(alert.unpaidAmount, alert.currency, language)}</span> : null}
                  </button>
                  {expanded ? (
                    <div className="crm-notification-item__detail" id={detailId}>
                      <strong>{t("Why this alert appears")}</strong>
                      <p>{scheduleAlert ? getScheduleAlertReason(alert, language, t) : buildDashboardAlertReason(alert, language)}</p>
                      <dl>
                        {detailRows.map((row) => (
                          <div key={row.label}>
                            <dt>{row.label}</dt>
                            <dd>{row.kind === "amount" ? formatNotificationMoney(row.value, alert.currency, language) : String(row.value ?? t("Not available"))}</dd>
                          </div>
                        ))}
                        {scheduleAlert && !alert.isMore ? <>
                          <div><dt>{t("Event Type")}</dt><dd>{alert.eventType || t("Not available")}</dd></div>
                          {alert.nextAction ? <div><dt>{t("Next Action")}</dt><dd>{alert.nextAction}</dd></div> : null}
                        </> : null}
                      </dl>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : <p className="crm-notification-empty">{t("No new alerts")}</p>}
      </div>
      {unreadCount ? <footer className="crm-notification-popover__footer"><button aria-label={t("Mark as read")} className="crm-notification-popover__confirm" onClick={onMarkRead} type="button">{t("Confirm")}</button></footer> : null}
    </div>
  );
}

function formatNotificationMoney(value, currency = "USD", language = "en") {
  return formatCurrencyAmount(value, currency, language);
}

function getNotificationTitle(alert, language, t) {
  if (!alert?.isScheduleAlert) return alert?.title || t("Notifications");
  if (alert.isMore) return language === "en" ? `+${alert.count} more` : `외 ${alert.count}건`;
  const name = alert.customerName || alert.eventTitle || t("Customer unavailable");
  if (alert.sourceType === "consultation_follow_up" || alert.eventType === "follow_up_call") return language === "en" ? `Follow-up with ${name}` : `${name} 고객 후속 연락 예정`;
  if (alert.sourceType === "consultation" || alert.eventType === "consultation") return language === "en" ? `Consultation with ${name}` : `${name} 고객과 상담 일정`;
  if (alert.eventType === "meeting") return language === "en" ? `Meeting with ${name}` : `${name} 고객과 미팅 일정`;
  return alert.eventTitle || name;
}

function getScheduleAlertReason(alert, language, t) {
  if (alert?.isMore) return language === "en" ? `${alert.count} more schedules are happening today.` : `오늘 일정이 ${alert.count}건 더 있습니다.`;
  return language === "en" ? "This alert appears because there is a schedule or follow-up activity today." : "오늘 일정 또는 후속 연락 일정이 있어 알림이 표시됩니다.";
}

function readAcknowledgedAlertIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem("timorcrest_admin_acknowledged_alerts") || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}
