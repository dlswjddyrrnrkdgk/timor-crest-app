import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const [, , targetUrl, evidenceDirArg] = process.argv;
if (!targetUrl || !evidenceDirArg) {
  console.error("usage: node admin-flow-smoke.mjs <url> <evidence-dir>");
  process.exit(2);
}

const evidenceDir = path.resolve(evidenceDirArg);
fs.mkdirSync(evidenceDir, { recursive: true });
const playwrightPath = "C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.61.1\\node_modules\\playwright\\index.js";
const require = createRequire(pathToFileURL(playwrightPath).href);
const { chromium } = require(playwrightPath);

const assertions = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const screenshots = [];
const actions = [];
const launchErrors = [];

function log(event, data = {}) {
  actions.push({ at: new Date().toISOString(), event, ...data });
}

function assert(name, pass, details = {}) {
  assertions.push({ name, pass: Boolean(pass), ...details });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(details)}`);
}

async function launchBrowser() {
  for (const channel of ["msedge", "chrome", undefined]) {
    try {
      const browser = await chromium.launch(channel ? { headless: true, channel } : { headless: true });
      launchErrors.push(`launched:${channel || "bundled"}`);
      return browser;
    } catch (error) {
      launchErrors.push(`${channel || "bundled"}:${error.message.split("\n")[0]}`);
    }
  }
  throw new Error(`Unable to launch browser: ${launchErrors.join(" | ")}`);
}

function attachPageGuards(page) {
  page.on("console", (msg) => {
    if (["error"].includes(msg.type())) consoleErrors.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "unknown" }));
}

async function screenshot(page, name) {
  const file = `${name}-390x867.png`;
  const filePath = path.join(evidenceDir, file);
  await page.screenshot({ path: filePath, fullPage: false });
  screenshots.push(file);
  log("screenshot", { file });
}

async function text(page) {
  return page.locator("body").textContent();
}

async function fill(page, testId, value) {
  await page.getByTestId(testId).fill(String(value));
}

async function click(page, testId) {
  await page.getByTestId(testId).click();
}

async function gotoSeeded(page) {
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => window.resetDemoData());
  await page.reload({ waitUntil: "networkidle" });
}

let browser;
let result;
try {
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 867 }, deviceScaleFactor: 1, isMobile: true });
  attachPageGuards(page);

  log("goto", { targetUrl });
  const response = await page.goto(targetUrl, { waitUntil: "networkidle" });
  assert("index.html returns ok", response?.ok(), { status: response?.status() });
  await page.evaluate(() => window.resetDemoData());
  await page.reload({ waitUntil: "networkidle" });
  await screenshot(page, "01-login-initial");

  assert("unauthenticated shows login", await page.getByTestId("login-screen").isVisible());
  assert("unauthenticated hides bottom nav", await page.locator("#bottomNav").isHidden());
  assert("unauthenticated hides contractor home", !(await page.locator("[data-testid='contractor-home']").count()));

  for (const hash of ["#admin", "#payments", "#journey"]) {
    await page.evaluate((value) => { window.location.hash = value; }, hash);
    await page.waitForTimeout(80);
    assert(`unauthenticated hash ${hash} stays on login`, await page.getByTestId("login-screen").isVisible());
    assert(`unauthenticated hash ${hash} hides nav`, await page.locator("#bottomNav").isHidden());
  }

  await fill(page, "contractor-unitId", "A-101");
  await fill(page, "contractor-password", "0000");
  await click(page, "contractor-login-submit");
  assert("wrong contractor password message exact", (await page.getByTestId("contractor-error").textContent()) === "호수 또는 비밀번호가 올바르지 않습니다.");

  await fill(page, "contractor-unitId", "A-102");
  await fill(page, "contractor-password", "bad-password");
  await click(page, "contractor-login-submit");
  assert("wrong A-102 password rejected", (await page.getByTestId("contractor-error").textContent()) === "호수 또는 비밀번호가 올바르지 않습니다.");

  await fill(page, "contractor-unitId", "A-101");
  await fill(page, "contractor-password", "1234");
  await click(page, "contractor-login-submit");
  await page.waitForTimeout(250);
  await screenshot(page, "02-contractor-a101-home");
  assert("contractor A-101 home visible", await page.getByTestId("contractor-home").isVisible());
  assert("contractor sees A-101 unit", (await page.getByTestId("contractor-unit-id").textContent()) === "A-101");
  assert("contractor does not see other seeded names", !/(LEE|PARK|B-201)/.test(await text(page)));
  assert("contractor bottom nav visible", await page.locator("#bottomNav").isVisible());

  for (const hash of ["#admin", "#payments", "#journey"]) {
    await page.evaluate((value) => { window.location.hash = value; }, hash);
    await page.waitForTimeout(80);
    assert(`contractor hash ${hash} does not expose admin`, !(await page.locator("[data-testid^='admin-']").count()));
  }

  await page.locator("#bottomNav [data-nav='payments']").click();
  await page.waitForTimeout(250);
  await screenshot(page, "03-contractor-a101-payments");
  assert("contractor payments visible", await page.getByTestId("contractor-payments").isVisible());
  await page.locator("#bottomNav [data-nav='journey']").click();
  await page.waitForTimeout(250);
  await screenshot(page, "04-contractor-a101-journey");
  assert("contractor journey visible", await page.getByTestId("contractor-journey").isVisible());
  await page.locator("#bottomNav [data-nav='docs']").click();
  await page.waitForTimeout(250);
  await screenshot(page, "05-contractor-a101-docs");
  assert("contractor docs max three cards", (await page.locator(".document-card").count()) <= 3);
  await click(page, "back-home");
  await click(page, "contractor-logout");
  assert("logout returns login", await page.getByTestId("login-screen").isVisible());

  await fill(page, "admin-adminId", "admin");
  await fill(page, "admin-adminPassword", "wrong");
  await click(page, "admin-login-submit");
  assert("wrong Admin password message exact", (await page.getByTestId("admin-error").textContent()) === "Admin 계정 정보가 올바르지 않습니다.");

  await fill(page, "admin-adminId", "admin");
  await fill(page, "admin-adminPassword", "admin1234");
  await click(page, "admin-login-submit");
  await page.waitForTimeout(250);
  await screenshot(page, "06-admin-dashboard");
  assert("admin dashboard visible", await page.getByTestId("admin-dashboard").isVisible());
  assert("admin contractor nav hidden", await page.locator("#bottomNav").isHidden());
  const dashboardText = await text(page);
  assert("dashboard metrics present", /전체 호수\s*3/.test(dashboardText) && /계약 완료\s*2/.test(dashboardText) && /미납 발생/.test(dashboardText) && /오늘 납부 예정/.test(dashboardText));

  await page.locator("[data-admin-tab='units']").click();
  await fill(page, "unit-contractor", "CHOI QA");
  await fill(page, "unit-password", "2468");
  await fill(page, "unit-phone", "010-7777-8888");
  await fill(page, "unit-memo", "Updated by admin smoke");
  await click(page, "save-unit");
  await screenshot(page, "07-admin-units-edited");

  await page.locator("[data-admin-tab='payments']").click();
  await fill(page, "payment-bank", "QA Demo Bank");
  await fill(page, "payment-account", "000-QA-0000");
  await fill(page, "payment-manager", "QA Manager");
  await fill(page, "payment-manager-phone", "010-2222-3333");
  await fill(page, "payment-total", "650000000");
  await click(page, "save-payment-settings");
  await fill(page, "payment-required-2", "70000000");
  await fill(page, "payment-paid-2", "40000000");
  await page.getByTestId("payment-status-2").selectOption("일부 납입");
  await fill(page, "payment-memo-2", "QA payment memo");
  await click(page, "save-payment-stage-2");
  await screenshot(page, "08-admin-payments-edited");

  await page.locator("[data-admin-tab='journey']").click();
  await page.getByTestId("journey-status-2").selectOption("진행 중");
  await fill(page, "journey-progress-2", "77");
  await fill(page, "journey-description-2", "QA journey description updated");
  await click(page, "save-journey-2");
  await screenshot(page, "09-admin-journey-edited");

  const xssProbe = "<img src=x onerror=window.__xssProbe=1>";
  await page.locator("[data-admin-tab='docs']").click();
  await fill(page, "doc-title", xssProbe);
  await fill(page, "doc-type", "QA 문서");
  await fill(page, "doc-file", "qa-demo-file.pdf");
  await fill(page, "doc-description", "QA document description updated");
  await fill(page, "doc-uploaded", "2026-07-09");
  await page.getByTestId("doc-visible").setChecked(true);
  await click(page, "save-document");
  await screenshot(page, "10-admin-docs-xss-edited");
  assert("XSS probe did not execute in admin", (await page.evaluate(() => window.__xssProbe)) === undefined);

  await click(page, "admin-logout");
  await fill(page, "contractor-unitId", "A-101");
  await fill(page, "contractor-password", "1234");
  await click(page, "contractor-login-submit");
  assert("old A-101 password rejected after admin edit", (await page.getByTestId("contractor-error").textContent()) === "호수 또는 비밀번호가 올바르지 않습니다.");
  await fill(page, "contractor-unitId", "A-101");
  await fill(page, "contractor-password", "2468");
  await click(page, "contractor-login-submit");
  await page.waitForTimeout(250);
  await screenshot(page, "11-contractor-edited-home");
  assert("A-101 sees edited contractor name", /CHOI QA/.test(await text(page)));
  assert("edited contractor still scoped", !/(LEE|PARK|A-102|B-201)/.test(await text(page)));
  await page.locator("#bottomNav [data-nav='payments']").click();
  await page.waitForTimeout(250);
  await screenshot(page, "12-contractor-edited-payments");
  const editedPaymentText = await text(page);
  assert("contractor sees edited payment fields", /QA Demo Bank/.test(editedPaymentText) && /000-QA-0000/.test(editedPaymentText) && /QA Manager/.test(editedPaymentText));
  await page.locator("#bottomNav [data-nav='journey']").click();
  await page.waitForTimeout(250);
  assert("contractor sees edited journey fields", /QA journey description updated/.test(await text(page)) && /77%/.test(await text(page)));
  await page.locator("#bottomNav [data-nav='docs']").click();
  await page.waitForTimeout(250);
  await screenshot(page, "13-contractor-edited-docs-xss-text");
  const docText = await text(page);
  assert("XSS probe renders as text", docText.includes(xssProbe));
  assert("XSS probe did not execute in contractor", (await page.evaluate(() => window.__xssProbe)) === undefined);

  await page.evaluate(() => {
    localStorage.setItem("timorCrestDemo.v2:data", "{bad json");
    localStorage.setItem("timorCrestDemo.v2:session", JSON.stringify({ role: "contractor", unitId: "A-101" }));
  });
  await page.reload({ waitUntil: "networkidle" });
  assert("malformed localStorage falls back without crash", await page.getByTestId("login-screen").isVisible());
  await fill(page, "contractor-unitId", "A-101");
  await fill(page, "contractor-password", "1234");
  await click(page, "contractor-login-submit");
  assert("seed restored after malformed storage", await page.getByTestId("contractor-home").isVisible());

  await page.evaluate(() => {
    localStorage.setItem("timorCrestDemo.v2:data", JSON.stringify({ version: "wrong", units: [] }));
  });
  await page.reload({ waitUntil: "networkidle" });
  assert("wrong schema falls back without crash", await page.getByTestId("login-screen").isVisible());

  assert("no page errors", pageErrors.length === 0, { pageErrors });
  assert("no unexpected console errors", consoleErrors.length === 0, { consoleErrors });
  assert("no failed requests", failedRequests.length === 0, { failedRequests });
  assert("screenshots captured", screenshots.length >= 10, { screenshots });

  result = { ok: true, targetUrl, assertions, screenshots, consoleErrors, pageErrors, failedRequests, launchErrors, actions, cleanup: { browserClosed: false, serverStoppedByCaller: true } };
} catch (error) {
  result = { ok: false, targetUrl, error: error.message, assertions, screenshots, consoleErrors, pageErrors, failedRequests, launchErrors, actions, cleanup: { browserClosed: false, serverStoppedByCaller: true } };
} finally {
  if (browser) {
    await browser.close();
    if (result) result.cleanup.browserClosed = true;
  }
}

fs.writeFileSync(path.join(evidenceDir, "admin-flow-smoke-result.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(evidenceDir, "admin-flow-action-log.json"), JSON.stringify(actions, null, 2));
process.exit(result.ok ? 0 : 1);
