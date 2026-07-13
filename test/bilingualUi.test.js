import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { formatItemCount, LANGUAGE_STORAGE_KEY, normalizeLanguage, translations } from "../src/i18n/translations.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const languageProviderSource = readFileSync(new URL("../src/i18n/LanguageProvider.jsx", import.meta.url), "utf8");
const languageToggleSource = readFileSync(new URL("../src/components/LanguageToggle.jsx", import.meta.url), "utf8");
const loginPageSource = readFileSync(new URL("../src/routes/LoginPage.jsx", import.meta.url), "utf8");
const protectedRouteSource = readFileSync(new URL("../src/routes/ProtectedRoute.jsx", import.meta.url), "utf8");
const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("Bilingual UI", () => {
  it("defaults to English and persists the selected language", () => {
    assert.equal(LANGUAGE_STORAGE_KEY, "timorcrest_language");
    assert.equal(normalizeLanguage("kr"), "kr");
    assert.equal(normalizeLanguage("en"), "en");
    assert.equal(normalizeLanguage("jp"), "en");
    assert.match(languageProviderSource, /return "en"/);
    assert.match(languageProviderSource, /window\.localStorage\.getItem\(LANGUAGE_STORAGE_KEY\)/);
    assert.match(languageProviderSource, /window\.localStorage\.setItem\(LANGUAGE_STORAGE_KEY, normalizedLanguage\)/);
  });

  it("wraps the app and renders a KR/EN language toggle", () => {
    assert.match(appSource, /<LanguageProvider>/);
    assert.match(languageToggleSource, /language === "en" \? "KR" : "EN"/);
    assert.match(languageToggleSource, /className="language-toggle-button"/);
    assert.match(stylesSource, /\.language-toggle-button/);
    assert.match(stylesSource, /\.status-actions/);
  });

  it("connects the toggle and translator to login, auth, admin, and contractor screens", () => {
    for (const source of [loginPageSource, protectedRouteSource, adminLayoutSource, contractorLayoutSource]) {
      assert.match(source, /LanguageToggle/);
    }
    assert.match(loginPageSource, /const \{ t \} = useLanguage\(\)/);
    assert.match(protectedRouteSource, /const \{ t \} = useLanguage\(\)/);
    assert.match(adminLayoutSource, /const \{ language, t \} = useLanguage\(\)/);
    assert.match(contractorLayoutSource, /const \{ language, t \} = useLanguage\(\)/);
  });

  it("contains English and Korean mappings for core portal labels", () => {
    assert.equal(translations.en["로그인"], "Sign in");
    assert.equal(translations.en["계약자 관리"], "Contractors");
    assert.equal(translations.en["납부방법"], "Payment Method");
    assert.equal(translations.en["납부 현황"], "Payment Status");
    assert.equal(translations.en["문서 업로드"], "Upload Document");
    assert.equal(translations.en["내 계약 정보"], "My Contract Summary");
    assert.equal(translations.kr.Dashboard, "관리자 대시보드");
    assert.equal(translations.kr["Payment Summary"], "납부 요약");
    assert.equal(translations.kr.Documents, "문서");
  });

  it("formats item counts by language and allows pagination controls to wrap", () => {
    assert.equal(formatItemCount(0, "en"), "0 items");
    assert.equal(formatItemCount(1, "en"), "1 item");
    assert.equal(formatItemCount(10, "en"), "10 items");
    assert.equal(formatItemCount(10, "kr"), "10개 항목");
    assert.match(stylesSource, /\.pagination\s*\{[^}]*flex-wrap: wrap;/);
    assert.match(stylesSource, /\.pagination button\s*\{[^}]*min-width: 40px;[^}]*white-space: nowrap;/);
    assert.match(stylesSource, /\.pagination span\s*\{[^}]*white-space: nowrap;/);
  });

  it("keeps security-sensitive frontend behavior unchanged", () => {
    for (const source of [appSource, loginPageSource, adminLayoutSource, contractorLayoutSource]) {
      assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp|createUser/);
    }
  });

  it("uses display-only translated Journey descriptions and Payment step titles", () => {
    assert.match(contractorLayoutSource, /getJourneyStepDescription\(item, language\)/);
    assert.match(contractorLayoutSource, /displayDescription \? <p>\{displayDescription\}<\/p> : null/);
    assert.match(contractorLayoutSource, /getPaymentStepTitle\(item, language\)/);
    assert.match(contractorLayoutSource, /<PaymentItemsList language=\{language\}/);
    assert.match(adminLayoutSource, /getPaymentStepTitle\(item, language\)/);
    assert.match(adminLayoutSource, /defaultValue=\{item\.title\}/);
    assert.match(adminLayoutSource, /defaultValue=\{item\.description \|\| ""\}/);
  });

  it("removes the Contractor Journey shared-project helper sentence", () => {
    assert.doesNotMatch(contractorLayoutSource, /모든 계약자에게 동일하게 적용되는 프로젝트 공정 현황입니다/);
  });
});
