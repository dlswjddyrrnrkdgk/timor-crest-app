import { pathToFileURL } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const cwd = process.cwd();
const playwrightPath = "C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.61.1\\node_modules\\playwright\\index.js";
const require = createRequire(pathToFileURL(playwrightPath).href);
const { chromium } = require(playwrightPath);
const fileUrl = pathToFileURL(path.join(cwd, "index.html")).href;
const launchErrors = [];

let browser;
for (const channel of ["msedge", "chrome"]) {
  try {
    browser = await chromium.launch({ headless: true, channel });
    launchErrors.push(`launched:${channel}`);
    break;
  } catch (error) {
    launchErrors.push(`${channel}:${error.message.split("\n")[0]}`);
  }
}

if (!browser) {
  console.log(JSON.stringify({ ok: false, launchErrors }, null, 2));
  process.exit(1);
}

const page = await browser.newPage({
  viewport: { width: 390, height: 867 },
  deviceScaleFactor: 1,
  isMobile: true,
});

await page.goto(fileUrl);
await page.waitForLoadState("networkidle");

const homeMetrics = await page.evaluate(() => {
  const frame = document.querySelector(".phone-frame");
  const home = document.querySelector("#home");
  return {
    frame: {
      width: Math.round(frame.getBoundingClientRect().width),
      height: Math.round(frame.getBoundingClientRect().height),
    },
    homeClientHeight: home.clientHeight,
    homeScrollHeight: home.scrollHeight,
    staleWordsPresent: /옵션|Options|Option|Setting|settings/.test(document.body.textContent),
  };
});

await page.screenshot({ path: path.join(cwd, "qa-home-390x867.png"), fullPage: false });

await page.click('.bottom-nav [data-view-target="journey"]');
await page.waitForTimeout(1000);
const journeyMetrics = await page.evaluate(() => ({
  active: document.querySelector(".view-screen.is-active")?.id,
  percent: document.querySelector("#journey [data-count-to]")?.textContent,
  barWidth: document.querySelector("#journey [data-progress-fill]")?.style.width,
  stageCount: document.querySelectorAll("#journeyStageList .stage-card").length,
}));
await page.screenshot({ path: path.join(cwd, "qa-journey-390x867.png"), fullPage: false });

await page.click('.bottom-nav [data-view-target="docs"]');
await page.waitForTimeout(250);
const docsMetrics = await page.evaluate(() => ({
  active: document.querySelector(".view-screen.is-active")?.id,
  visibleCards: document.querySelectorAll("#documentList .document-card").length,
  pageButtons: Array.from(document.querySelectorAll("#documentPagination button"))
    .map((button) => button.textContent.trim())
    .join(","),
}));

await page.click('.bottom-nav [data-view-target="my"]');
await page.waitForTimeout(250);
const myBeforeClick = await page.evaluate(() => {
  const screen = document.querySelector("#my");
  const consult = document.querySelector('[data-my-panel="consult"]');
  const rect = consult.getBoundingClientRect();
  return {
    active: document.querySelector(".view-screen.is-active")?.id,
    screenClasses: screen.className,
    screenDisplay: getComputedStyle(screen).display,
    screenOpacity: getComputedStyle(screen).opacity,
    consultRect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
});
const initialMyEmpty = await page.evaluate(() => document.querySelector("#myDetail")?.textContent.trim().length === 0);
let myClickError = null;
try {
  await page.locator('#my [data-my-panel="consult"]').click({ timeout: 3000 });
} catch (error) {
  myClickError = error.message.split("\n")[0];
}
await page.waitForTimeout(250);
const myMetrics = await page.evaluate((initialWasEmpty) => ({
  active: document.querySelector(".view-screen.is-active")?.id,
  initialWasEmpty,
  selected: document.querySelector(".my-button.is-selected")?.textContent.trim(),
  detailText: document.querySelector("#myDetail")?.textContent?.replace(/\s+/g, " ").trim(),
}), initialMyEmpty);
await page.screenshot({ path: path.join(cwd, "qa-my-390x867.png"), fullPage: false });

await browser.close();

console.log(JSON.stringify({
  ok: true,
  launchErrors,
  homeMetrics,
  journeyMetrics,
  docsMetrics,
  myBeforeClick,
  myClickError,
  myMetrics,
}, null, 2));
