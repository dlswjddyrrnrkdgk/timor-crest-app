# publish-static-demo - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** A public Netlify preview URL for the existing Timor Crest static demo, if Netlify Drop is reachable from this session. The preview will be checked after upload before it is treated as usable.

**Why this approach:** The app is static HTML/CSS/JavaScript with no backend, so Netlify Drop is the shortest safe path to a public preview. Custom domain work is deferred until the preview itself is known-good.

**What it will NOT do:** It will not add login, backend services, analytics, buyer data collection, or a custom domain in this pass.

**Effort:** Short
**Risk:** Medium - the only meaningful risk is whether this Codex session can access and drive Netlify Drop's external browser upload surface.
**Decisions to sanity-check:** Netlify Drop preview URL first; custom domain later.

Your next move: execution is approved by the user's `$start-work` request. Full execution detail follows below.

---

> TL;DR (machine): LIGHT execution; publish static runtime files to Netlify Drop, verify local and public browser surfaces, record evidence.

## Scope
### Must have
- Required runtime files identified: `index.html`, `styles.css`, `data.js`, `app.js`.
- Local static server smoke QA before upload.
- Netlify Drop upload attempt using the available browser/web surface.
- Public HTTPS preview URL captured when Netlify returns one.
- Public preview smoke QA after upload.
- Evidence and cleanup receipts recorded under `.omo/evidence/` and `.omo/start-work/ledger.jsonl`.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No backend, auth, analytics, payment integration, or data collection.
- No custom domain attachment in this pass.
- No product-code changes unless QA proves a publish-blocking defect.
- No support artifacts in the deployed package unless the selected Netlify surface requires uploading the whole repository.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: none for production code unless a publish-blocking defect requires a code fix; this is a static publishing operation, so real-surface browser QA is primary.
- Evidence: `.omo/evidence/task-<N>-publish-static-demo.*`

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- Wave 1: package inventory and local smoke QA can run in parallel.
- Wave 2: Netlify Drop upload depends on package inventory and local smoke QA.
- Wave 3: public preview QA depends on a returned Netlify preview URL.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | none | 3 | 2 |
| 2 | none | 3 | 1 |
| 3 | 1, 2 | 4 | none |
| 4 | 3 | Final verification | none |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Prepare Netlify Drop package inventory
  What to do / Must NOT do: identify the runtime files for upload and create evidence listing exactly `index.html`, `styles.css`, `data.js`, and `app.js`; do not include screenshots, QA scripts, `.git`, or `.omo` as runtime assets.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 3
  References (executor has NO interview context - be exhaustive): `README.md`; `index.html`; `styles.css`; `app.js`; `.omo/drafts/publish-static-demo.md`
  Acceptance criteria (agent-executable): command output or manifest proves the runtime package has the four required files and no missing relative dependencies.
  QA scenarios (name the exact tool + invocation): happy = `Get-ChildItem -File index.html,styles.css,data.js,app.js` equivalent inventory captured to `.omo/evidence/task-1-package-inventory.txt`; failure = dependency scan for `href=`/`src=`/`url(` proves no missing asset path, captured to `.omo/evidence/task-1-dependency-scan.txt`.
  Commit: N | no product-code change expected
- [x] 2. Run local static browser smoke QA
  What to do / Must NOT do: serve the workspace with a local static server and verify the app renders before public upload; do not treat file existence as render proof.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 3
  References (executor has NO interview context - be exhaustive): `index.html`; `styles.css`; `data.js`; `app.js`; `qa-render.mjs`
  Acceptance criteria (agent-executable): local page loads without console/runtime errors that block navigation; Home, Journey, payment schedule, documents, and MY surfaces are reachable.
  QA scenarios (name the exact tool + invocation): happy = browser/Playwright visit `http://127.0.0.1:<port>/index.html`, click `[data-view-target="journey"]`, `[data-view-target="payments"]`, `[data-view-target="docs"]`, `[data-view-target="my"]`, capture screenshot/action log under `.omo/evidence/task-2-local-qa/`; failure = request a missing asset path and confirm it returns a failing status or is absent from dependency graph, captured under `.omo/evidence/task-2-local-qa/asset-negative.txt`.
  Commit: N | no product-code change expected
- [x] 3. Upload to Netlify Drop and capture preview URL
  What to do / Must NOT do: open Netlify Drop and upload the validated static runtime package/folder; do not proceed if the UI requires credentials or manual CAPTCHA outside available agent control.
  Parallelization: Wave 2 | Blocked by: 1, 2 | Blocks: 4
  References (executor has NO interview context - be exhaustive): `.omo/evidence/task-1-package-inventory.txt`; `.omo/evidence/task-2-local-qa/`
  Acceptance criteria (agent-executable): evidence contains the Netlify-generated HTTPS preview URL or a precise blocker from the Netlify Drop surface.
  QA scenarios (name the exact tool + invocation): happy = browser action open `https://app.netlify.com/drop`, upload the validated folder/package, capture returned `https://*.netlify.app` URL and screenshot/action log under `.omo/evidence/task-3-netlify-drop/`; failure = if Netlify requires login/CAPTCHA/network access, capture the blocker screenshot/log under `.omo/evidence/task-3-netlify-drop/blocker.*`.
  Commit: N | no product-code change expected
- [x] 4. Verify public Netlify preview URL
  What to do / Must NOT do: open the returned Netlify preview URL over HTTPS and repeat smoke navigation; do not treat Netlify upload success as public QA.
  Parallelization: Wave 3 | Blocked by: 3 | Blocks: Final verification
  References (executor has NO interview context - be exhaustive): `.omo/evidence/task-3-netlify-drop/preview-url.txt`; `index.html`; `app.js`
  Acceptance criteria (agent-executable): public URL serves HTML, CSS, and JS; key navigation buttons work; evidence includes screenshot/action log.
  QA scenarios (name the exact tool + invocation): happy = browser/Playwright visit returned `https://*.netlify.app`, click `[data-view-target="journey"]`, `[data-view-target="payments"]`, `[data-view-target="docs"]`, `[data-view-target="my"]`, capture under `.omo/evidence/task-4-public-qa/`; failure = fetch a known missing path on the preview domain and record 404/non-OK behavior under `.omo/evidence/task-4-public-qa/negative-path.txt`.
  Commit: N | no product-code change expected

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity

## Commit strategy
- No git commit is required unless product code changes become necessary.
- If product code changes are needed, use the Lore Commit Protocol from AGENTS.md and include the exact verification evidence.

## Success criteria
- A Netlify `https://*.netlify.app` preview URL is captured, or a precise external-surface blocker is recorded.
- Local static smoke QA passes before upload.
- Public preview smoke QA passes after upload when a URL is available.
- No backend/auth/custom-domain work is introduced.
- QA resources such as local servers or browser sessions are cleaned up or explicitly recorded as not created.
