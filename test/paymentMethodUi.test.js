import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migrationSource = readFileSync(new URL("../supabase/migrations/0006_contractor_payment_method.sql", import.meta.url), "utf8");
const contractorServiceSource = readFileSync(new URL("../src/services/contractorService.js", import.meta.url), "utf8");
const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
const autoDismissHookSource = readFileSync(new URL("../src/hooks/useAutoDismissMessage.js", import.meta.url), "utf8");

describe("Contractor payment method UI", () => {
  it("adds nullable contractor payment method columns with an idempotent check constraint", () => {
    assert.match(migrationSource, /add column if not exists payment_method text/);
    assert.match(migrationSource, /add column if not exists bank_name text/);
    assert.match(migrationSource, /add column if not exists bank_account_number text/);
    assert.match(migrationSource, /add column if not exists bank_account_holder text/);
    assert.match(migrationSource, /payment_method in \('cash', 'bank_transfer'\)/);
    assert.doesNotMatch(migrationSource, /alter policy|create policy|disable row level security/i);
  });

  it("selects and updates payment method fields through contractor service without frontend secrets", () => {
    assert.match(contractorServiceSource, /payment_method/);
    assert.match(contractorServiceSource, /bank_account_number/);
    assert.match(contractorServiceSource, /export async function updateContractorPaymentMethod/);
    assert.match(contractorServiceSource, /\.from\("contractors"\)[\s\S]*\.update\(normalizePaymentMethod\(input\)\)/);
    assert.doesNotMatch(contractorServiceSource, /service_role|SUPABASE_SERVICE_ROLE|signUp|createUser|VITE_SUPABASE_SERVICE/);
  });

  it("renders Admin payment method controls on the payment management page", () => {
    assert.match(adminLayoutSource, /<PaymentMethodForm/);
    assert.match(adminLayoutSource, /납부방법 설정/);
    assert.match(adminLayoutSource, /<option value="cash">\{t\("현금"\)\}<\/option>/);
    assert.match(adminLayoutSource, /<option value="bank_transfer">\{t\("계좌이체"\)\}<\/option>/);
    assert.match(adminLayoutSource, /계좌이체 선택 시 은행명, 계좌번호, 계좌명을 모두 입력해 주세요\./);
  });

  it("shows payment method read-only on contractor home and payment summary", () => {
    assert.match(contractorLayoutSource, /<PaymentMethodRows contractor=\{summary\} label=\{t\("납부방법"\)\} t=\{t\} \/>/);
    assert.match(contractorLayoutSource, /<PaymentMethodPanel contractor=\{summary\} label=\{t\("결제수단"\)\} t=\{t\} \/>/);
    assert.match(contractorLayoutSource, /bank_transfer: t\("계좌이체"\)/);
    assert.match(contractorLayoutSource, /cash: t\("현금"\)/);
    assert.doesNotMatch(contractorLayoutSource, /납부방법 저장/);
  });

  it("auto-dismisses action feedback messages after ten seconds", () => {
    assert.match(autoDismissHookSource, /setTimeout/);
    assert.match(autoDismissHookSource, /setMessage\(""\)/);
    assert.match(adminLayoutSource, /useAutoDismissMessage\("", 10000\)/);
    assert.match(contractorLayoutSource, /useAutoDismissMessage\("", 10000\)/);
  });
});
