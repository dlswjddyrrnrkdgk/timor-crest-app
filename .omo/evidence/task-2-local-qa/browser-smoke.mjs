import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const [, , targetUrl, evidenceDirArg] = process.argv;
if (!targetUrl || !evidenceDirArg) {
  console.error("usage: node browser-smoke.mjs <url> <evidence-dir>");
  process.exit(2);
}

const evidenceDir = path.resolve(evidenceDirArg);
const playwrightPath = "C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.61.1\\node_modules\\playwright\\index.js";
const require = createRequire(pathToFileURL(playwrightPath).href);
const { chromium } = require(playwrightPath);

const actionLog = [];
const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];
const launchErrors = [];

function record(event, data = {}) {
  actionLog.push({ at: new Date().toISOString(), event, ...data });
}

let browser;
for (const channel of ["msedge", "chrome", undefined]) {
  try {
    browser = await chromium.launch(channel ? { headless: true, channel } : { headless: true });
    launchErrors.push(`launched:${channel || "bundled"}`);
    break;
  } catch (error) {
    launchErrors.push(`${channel || "bundled"}:${error.message.split("\n")[0]}`);
  }
}

if (!browser) {
  fs.writeFileSync(
    path.join(evidenceDir, "browser-smoke-result.json"),
    JSON.stringify({ verdict: "BLOCKED", launchErrors }, null, 2),
  );
  process.exit(1);
}

const page = await browser.newPage({
  viewport: { width: 390, height: 867 },
  deviceScaleFactor: 1,
  isMobile: true,
});

page.on("console", (msg) => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});
page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});
page.on("requestfailed", (request) => {
  failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "unknown" });
});

async function snapshot(viewName) {
  const file = `${viewName}-390x867.png`;
  await page.screenshot({ path: path.join(evidenceDir, file), fullPage: false });
  const state = await page.evaluate(() => {
    const active = document.querySelector(".view-screen.is-active");
    const buttons = Array.from(document.querySelectorAll("[data-view-target]")).map((button) => ({
      target: button.getAttribute("data-view-target"),
      active: button.classList.contains("is-active"),
      text: button.textContent.replace(/\s+/g, " ").trim(),
    }));
    return {
      activeView: active?.id || null,
      title: document.title,
      bodyTextSample: document.body.textContent.replace(/\s+/g, " ").trim().slice(0, 500),
      buttons,
      journeyStageCount: document.querySelectorAll("#journeyStageList .stage-card").length,
      paymentStageCount: document.querySelectorAll("#paymentStageList .stage-card").length,
      documentCardCount: document.querySelectorAll("#documentList .document-card").length,
      myDetailEmpty: document.querySelector("#myDetail")?.classList.contains("is-empty") ?? null,
    };
  });
  record("screenshot", { viewName, file, state });
  return { file, state };
}

const views = [
  { id: "home", selector: null },
  { id: "journey", selector: '.bottom-nav [data-view-target="journey"]' },
  { id: "payments", selector: '.bottom-nav [data-view-target="payments"]' },
  { id: "docs", selector: '.bottom-nav [data-view-target="docs"]' },
  { id: "my", selector: '.bottom-nav [data-view-target="my"]' },
];

const snapshots = {};
let result;

try {
  record("goto", { url: targetUrl });
  const response = await page.goto(targetUrl, { waitUntil: "networkidle" });
  record("http-response", { url: targetUrl, status: response?.status() ?? null, ok: response?.ok() ?? false });

  snapshots.home = await snapshot("home");

  for (const view of views.slice(1)) {
    record("click", { selector: view.selector, expectedView: view.id });
    await page.locator(view.selector).click();
    await page.waitForTimeout(1000);
    snapshots[view.id] = await snapshot(view.id);
  }

  result = {
    verdict: "PASS",
    targetUrl,
    invocation: `node .omo/evidence/task-2-local-qa/browser-smoke.mjs ${targetUrl} .omo/evidence/task-2-local-qa`,
    launchErrors,
    consoleMessages,
    pageErrors,
    failedRequests,
    snapshots,
    checks: {
      indexHttpOk: response?.ok() ?? false,
      activeViewsReached: Object.fromEntries(Object.entries(snapshots).map(([name, shot]) => [name, shot.state.activeView === name])),
      noPageErrors: pageErrors.length === 0,
      noFailedRequests: failedRequests.length === 0,
    },
    actionLog,
  };

  const allViewsReached = Object.values(result.checks.activeViewsReached).every(Boolean);
  if (!result.checks.indexHttpOk || !allViewsReached || pageErrors.length > 0) {
    result.verdict = "FAIL";
  }
} catch (error) {
  result = {
    verdict: "FAIL",
    targetUrl,
    invocation: `node .omo/evidence/task-2-local-qa/browser-smoke.mjs ${targetUrl} .omo/evidence/task-2-local-qa`,
    launchErrors,
    consoleMessages,
    pageErrors,
    failedRequests,
    snapshots,
    error: error.message,
    actionLog,
  };
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(evidenceDir, "action-log.json"), JSON.stringify(actionLog, null, 2));
fs.writeFileSync(path.join(evidenceDir, "browser-smoke-result.json"), JSON.stringify(result, null, 2));

process.exit(result.verdict === "PASS" ? 0 : 1);
