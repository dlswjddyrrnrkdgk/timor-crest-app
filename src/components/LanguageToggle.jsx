import { useLanguage } from "../i18n/LanguageProvider.jsx";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const nextLanguageLabel = language === "en" ? "KR" : "EN";

  return (
    <button
      aria-label={`Switch language to ${nextLanguageLabel}`}
      className="language-toggle-button"
      onClick={toggleLanguage}
      type="button"
    >
      {nextLanguageLabel}
    </button>
  );
}
