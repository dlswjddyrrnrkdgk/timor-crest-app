import { createContext, useContext, useMemo, useState } from "react";
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, translations } from "./translations.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en";
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  });

  function changeLanguage(nextLanguage) {
    const normalizedLanguage = normalizeLanguage(nextLanguage);
    setLanguage(normalizedLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  }

  function toggleLanguage() {
    changeLanguage(language === "en" ? "kr" : "en");
  }

  function t(key, replacements = {}) {
    const translated = language === "en" ? translations.en[key] || key : translations.kr[key] || key;
    return Object.entries(replacements).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value ?? ""),
      translated,
    );
  }

  const value = useMemo(() => ({ language, t, toggleLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
