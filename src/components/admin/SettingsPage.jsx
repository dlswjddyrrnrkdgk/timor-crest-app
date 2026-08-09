import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminIcon from "./AdminIcon.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { resolveSessionProfile } from "../../services/authService.js";
import {
  buildSettingsSections,
  getEnvironmentStatus,
  getManagementShortcuts,
  getSecurityChecklist,
} from "../../services/adminSettingsModel.js";

const SHORTCUT_COPY = {
  customers: ["Manage Customers", "Review customer records and unit assignments."],
  units: ["Manage Units", "Review inventory, availability, and buyers."],
  payments: ["Manage Payments", "Review payment schedules and balances."],
  documents: ["Manage Documents", "Open and manage private customer files."],
  journey: ["Manage Journey", "Review shared construction progress."],
  reports: ["View Reports", "Analyze current CRM performance data."],
};

const SECURITY_LABELS = {
  supabaseUrl: "Supabase URL",
  supabaseAnonKey: "Supabase anon key",
  serviceRole: "Service role key",
  adminRoutes: "Admin routes protected",
  publicSignup: "Public signup disabled",
  privateStorage: "Private document storage",
  signedUrls: "Signed URL access",
};

export default function SettingsPage({ language = "en", t }) {
  const { changeLanguage } = useLanguage();
  const [authState, setAuthState] = useState({ session: null, profile: null, status: "loading" });

  useEffect(() => {
    let mounted = true;

    resolveSessionProfile().then((result) => {
      if (!mounted) return;
      setAuthState({
        session: result.session || null,
        profile: result.profile || null,
        status: result.ok && result.session ? "ready" : "unavailable",
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo(
    () => buildSettingsSections(authState.profile, authState.session, language),
    [authState.profile, authState.session, language],
  );
  const accountPendingLabel = authState.status === "loading" ? t("Loading") : t("Not available");
  const environmentConfig = useMemo(() => ({
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    productionDomain: sections.portal.productionDomain,
    serviceRoleExposed: false,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  }), [sections.portal.productionDomain]);
  const environment = useMemo(
    () => getEnvironmentStatus(environmentConfig),
    [environmentConfig],
  );
  const securityItems = useMemo(() => getSecurityChecklist(environmentConfig), [environmentConfig]);

  return (
    <div className="crm-page crm-settings">
      <header className="crm-page-heading crm-settings__header">
        <div>
          <span className="crm-eyebrow">{t("Administration")}</span>
          <h1>{t("Settings")}</h1>
          <p>{t("Manage admin preferences, portal information, and system configuration.")}</p>
        </div>
      </header>

      <div className="crm-settings__layout">
        <div className="crm-settings__column">
          <SettingsCard icon="customers" title={t("Account & Access")}>
            <div className="crm-settings__account">
              <span className="crm-settings__avatar">{getInitials(sections.account.name, sections.account.email)}</span>
              <div className="crm-settings__account-copy">
                <strong>{sections.account.name || accountPendingLabel}</strong>
                <span>{t("Signed-in admin")}</span>
              </div>
              <StatusBadge tone={sections.account.sessionActive ? "success" : "neutral"}>
                {sections.account.sessionActive ? t("Active") : accountPendingLabel}
              </StatusBadge>
            </div>
            <SettingList rows={[
              ["Email", sections.account.email || accountPendingLabel],
              ["Role", authState.status === "loading" ? accountPendingLabel : sections.account.role],
              ["Session", sections.account.sessionActive ? t("Active") : accountPendingLabel],
              ["User ID", sections.account.userId || accountPendingLabel],
              ["Last sign in", formatDateTime(sections.account.lastSignIn, language) || accountPendingLabel],
            ]} t={t} />
          </SettingsCard>

          <SettingsCard icon="settings" title={t("App Preferences")}>
            <div className="crm-settings__preference-row">
              <div>
                <strong>{t("Language Preference")}</strong>
                <p>{t("Choose the language used across the admin portal.")}</p>
              </div>
              <div aria-label={t("Language Preference")} className="crm-settings__language-options" role="group">
                <button aria-pressed={language === "en"} className={language === "en" ? "is-selected" : ""} onClick={() => changeLanguage("en")} type="button">{t("English")}</button>
                <button aria-pressed={language === "kr"} className={language === "kr" ? "is-selected" : ""} onClick={() => changeLanguage("kr")} type="button">{t("Korean")}</button>
              </div>
            </div>
            <p className="crm-settings__local-note"><AdminIcon name="settings" size={14} />{t("This preference is saved on this device.")}</p>
          </SettingsCard>

          <SettingsCard icon="building" title={t("Portal Information")}>
            <SettingList rows={[
              ["Portal Name", sections.portal.name],
              ["Production Domain", sections.portal.productionDomain],
              ["Admin Portal", sections.portal.adminPortal],
            ]} t={t} />
            <div className="crm-settings__configured-note"><StatusBadge tone={environment.productionDomainConfigured ? "success" : "warning"}>{t(environment.productionDomainConfigured ? "Configured" : "Not configured")}</StatusBadge><span>{t("Portal information is read-only in this environment.")}</span></div>
          </SettingsCard>
        </div>

        <div className="crm-settings__column">
          <SettingsCard icon="settings" title={t("Security & Environment")}>
            <ul className="crm-settings__checklist">
              {securityItems.map((item) => (
                <li key={item.key}>
                  <span className="crm-settings__check-icon"><AdminIcon name={item.safe ? "journey" : "bell"} size={15} /></span>
                  <span>{t(SECURITY_LABELS[item.key])}</span>
                  <StatusBadge tone={item.safe ? "success" : "warning"}>{t(item.key === "serviceRole" && item.safe ? "Not exposed in browser" : item.safe ? "Configured" : "Not configured")}</StatusBadge>
                </li>
              ))}
            </ul>
            <p className="crm-settings__security-note">{t("Functions environment is managed in Netlify.")}</p>
          </SettingsCard>

          <SettingsCard icon="dashboard" title={t("Data Management")}>
            <div className="crm-settings__shortcut-grid">
              {getManagementShortcuts().map((shortcut) => {
                const [title, description] = SHORTCUT_COPY[shortcut.key];
                return (
                  <Link className="crm-settings__shortcut" key={shortcut.route} to={shortcut.route}>
                    <span className="crm-settings__shortcut-icon"><AdminIcon name={shortcut.icon} size={17} /></span>
                    <span className="crm-settings__shortcut-copy"><strong>{t(title)}</strong><small>{t(description)}</small></span>
                    <span className="crm-settings__shortcut-action">{t("Go to page")}<AdminIcon name="chevron" size={14} /></span>
                  </Link>
                );
              })}
            </div>
          </SettingsCard>

          <SettingsCard icon="document" title={t("System Information")}>
            <SettingList rows={[
              ["App Name", sections.system.appName],
              ["Frontend", sections.system.frontend],
              ["Hosting", sections.system.hosting],
              ["Backend", sections.system.backend],
              ["Documents Bucket", sections.system.documentsBucket],
              ["Language Storage Key", sections.system.languageStorageKey],
              ["Current Language", language === "kr" ? t("Korean") : t("English")],
            ]} t={t} />
          </SettingsCard>

          <section className="crm-settings__danger" aria-labelledby="settings-danger-title">
            <div className="crm-settings__danger-icon"><AdminIcon name="bell" size={18} /></div>
            <div><h2 id="settings-danger-title">{t("Danger Zone")}</h2><p>{t("Data deletion and system reset are not available from this page.")}</p></div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ children, icon, title }) {
  return <section className="crm-settings__card"><header className="crm-settings__card-header"><span className="crm-settings__card-icon"><AdminIcon name={icon} size={17} /></span><h2>{title}</h2></header>{children}</section>;
}

function SettingList({ rows, t }) {
  return <dl className="crm-settings__list">{rows.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd title={value}>{value}</dd></div>)}</dl>;
}

function getInitials(name, email) {
  const source = String(name || email || "AD").trim();
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "AD";
}

function formatDateTime(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(language === "kr" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}
