import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const loginPageSource = readFileSync(new URL("../src/routes/LoginPage.jsx", import.meta.url), "utf8");
const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorServiceSource = readFileSync(new URL("../src/services/contractorService.js", import.meta.url), "utf8");

describe("Frontend refactor 3", () => {
  it("removes same-login explanatory copy while preserving email/password login", () => {
    assert.doesNotMatch(loginPageSource, /Admin과 계약자는 같은 로그인 화면을 사용합니다/);
    assert.doesNotMatch(loginPageSource, /관리자와 계약자는 같은 로그인 화면/);
    assert.doesNotMatch(loginPageSource, /Admin and contractor use the same login screen/);
    assert.match(loginPageSource, /autoComplete="email"/);
    assert.match(loginPageSource, /autoComplete="current-password"/);
    assert.match(loginPageSource, /signInWithEmail/);
  });

  it("removes unit_name from the Admin unit form and falls back to unit_code for persistence", () => {
    assert.doesNotMatch(adminLayoutSource, /<TextField label="unit_name"/);
    assert.doesNotMatch(adminLayoutSource, /unit_name: unit\.unit_name/);
    assert.match(contractorServiceSource, /const unitCode = requiredString\(input\.unit_code\)/);
    assert.match(contractorServiceSource, /unit_name: optionalString\(input\.unit_name\) \|\| unitCode/);
  });

  it("paginates the Admin units page at ten units per page", () => {
    assert.match(adminLayoutSource, /const UNIT_PAGE_SIZE = 10/);
    assert.match(adminLayoutSource, /const paginatedUnits = useMemo/);
    assert.match(adminLayoutSource, /items=\{paginatedUnits\}/);
    assert.match(adminLayoutSource, /unitPageCount > 1/);
    assert.match(adminLayoutSource, /changeUnitPage\(unitPage - 1\)/);
    assert.match(adminLayoutSource, /changeUnitPage\(unitPage \+ 1\)/);
  });

  it("shows assigned contractor names instead of unit_name in unit records", () => {
    assert.match(adminLayoutSource, /assignedContractorName: contractorByUnitId\.get\(unit\.id\) \|\| "empty"/);
    assert.match(adminLayoutSource, /<strong>\{unit\.assignedContractorName \|\| "empty"\}<\/strong>/);
    assert.match(adminLayoutSource, /<small>\{t\("분양자"\)\}<\/small>/);
    assert.doesNotMatch(adminLayoutSource, /unit\.unit_name \|\| "이름 미등록"/);
  });

  it("does not add frontend service-role access or public signup", () => {
    assert.doesNotMatch(adminLayoutSource, /service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp/);
    assert.doesNotMatch(loginPageSource, /signUp|createUser/);
  });
});
