# admin-settings-demo - Work Plan

## TL;DR (For humans)

**What you'll get:** The demo will start with a contractor login and a separate Admin login. Admin can manage unit passwords, contractor details, journey stages, payment schedules, and per-unit documents; contractors only see their own unit data.

**Why this approach:** The current app is a static vanilla HTML/CSS/JS mobile demo, so the admin feature will be implemented with mock/localStorage services that can later be swapped for Supabase/Firebase/Netlify DB/server APIs without rewriting the screens.

**What it will NOT do:** It will not add real production security, real bank data, real contract files, or real upload storage. Live demo deployment is a separate final task after local verification and may record a blocker if Netlify credentials/network access are unavailable.

**Effort:** Large
**Risk:** Medium - the feature touches every visible surface in a small static app, and access scoping must be proven through the browser.
**Decisions I made for you:** I treated this as a new no-plan `$start-work` bootstrap, preserved the existing white/blue 20:9 phone design, kept one implementation worker over the tightly coupled runtime files, used localStorage-backed services, and made live deployment a final gated task after local verification.

Your next move: execution is approved by the user's `$start-work` request. Full execution detail follows below.

---

> TL;DR (machine): HEAVY execution; static vanilla app service-layer/admin/login expansion with browser QA and independent gate review.

## Scope
### Must have
- Contractor login screen requiring unit id and password.
- Separate Admin login screen using demo credentials `admin` / `admin1234`.
- Contractor session can reach only contractor views for its own unit.
- Admin session can reach only Admin dashboard/settings screens.
- Demo data and localStorage access are centralized behind `authService`, `unitService`, `journeyService`, `paymentService`, `documentService`, and `adminService`.
- Admin can add, edit, delete, search, and inspect units, including per-unit login passwords.
- Admin can edit shared journey stages in the required order and contractor Journey reflects the same source.
- Admin can edit per-unit payment settings and schedule rows in the same order as journey stages; totals, paid amount, remaining amount, unpaid amount, and progress are calculated.
- Admin can add/edit/delete per-unit document metadata and visibility; contractor document view shows only visible docs for the logged-in unit, paginated 3 per page.
- Contractor home, journey, payments, documents, MY, and preview surfaces bind to the logged-in unit.
- Visible `Options`/`Option`/`Setting`/`옵션` language is replaced by `MY` without removing existing MY functionality.
- Existing white/blue 20:9 mobile design system and tactile button interaction remain.
- Code comments clearly state demo auth/storage limitations and production requirements for server auth, DB permissions, password hashing, and file access control.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No real PII, real account numbers, real contract files, or production secrets.
- No browser-side claim of production-grade security.
- No direct data reads/writes in screen rendering code when a service method should own it.
- No Admin menu or edit/delete/upload controls in contractor views.
- No contractor ability to browse or infer another unit's data through the UI.
- Netlify/live redeploy happens only after local verification, using existing project deployment configuration/credentials if available; if credentials, CAPTCHA, network, or approval blocks the deploy, record a precise blocker under `.omo/evidence/task-5-admin-settings-demo/`.
- No reverting or deleting existing untracked demo files.

### Required Korean labels and normalized constants
- Contractor login error: `호수 또는 비밀번호가 올바르지 않습니다.`
- Admin login error: `Admin 계정 정보가 올바르지 않습니다.`
- Journey/payment stage order: `BOOKING FEE`, `8주 이내 계약금`, `기초공사 완료`, `골조 완료`, `벽체 완료`, `지붕 천장 완료`, `문 / 창호 / 전기 완료`, `입주 시`
- Admin menus: `Dashboard`, `호수 관리`, `비밀번호 관리`, `Journey 공정 관리`, `납부일정 관리`, `문서 관리`, `계약자 정보 관리`
- MY buttons: `내 정보`, `계약 / 서류`, `상담`, `개인 알림`

### Auth/session/navigation state machine
- Initial state: unauthenticated. Contractor data, bottom navigation, and Admin screens are hidden.
- Contractor login success: store demo session `{ role: "contractor", unitId }` in `localStorage` under the service-owned session key and show contractor home for that unit only.
- Admin login success: store demo session `{ role: "admin" }` in `localStorage` under the service-owned session key and show Admin dashboard only.
- Logout: clear only the service-owned session key, keep seeded/admin-edited demo data, and return to login choice.
- Refresh: restore the saved demo session if its role is valid and the contractor unit still exists; otherwise clear session and show login.
- Direct navigation attempts: this app does not need a hash router. QA should attempt DOM-level view calls/clicks and URL hash changes such as `#admin`, `#payments`, and `#journey`; the app must still render according to current session role and must not expose hidden screens.
- Static-client limitation: contractor/Admin separation is an in-app UI/DOM flow for demo purposes only. Because static JS/localStorage is inspectable, production must replace this with server auth, DB permissions, password hashing, and file ACLs.

### Service and storage contracts
- Storage namespace/version: `timorCrestDemo.v2`.
- Required service objects: `authService`, `unitService`, `journeyService`, `paymentService`, `documentService`, `adminService`.
- `authService`: `loginContractor(unitId, password)`, `loginAdmin(adminId, password)`, `getSession()`, `setSession(session)`, `logout()`, `requireContractorUnit()`, `isAdmin()`.
- `unitService`: `listUnits()`, `searchUnits(query)`, `getUnit(unitId)`, `createUnit(input)`, `updateUnit(unitId, input)`, `deleteUnit(unitId)`.
- `journeyService`: `listTemplateStages()`, `getJourneyForUnit(unitId)`, `updateTemplateStage(stepId, input)`, `calculateOverallProgress(stages)`.
- `paymentService`: `getPayment(unitId)`, `updatePayment(unitId, input)`, `updatePaymentStage(unitId, stepId, input)`, `calculatePaymentSummary(payment)`.
- `documentService`: `listDocuments(unitId, { visibleOnly })`, `createDocument(unitId, input)`, `updateDocument(unitId, documentId, input)`, `deleteDocument(unitId, documentId)`.
- `adminService`: `getDashboardSummary()`, `recordActivity(message)`, `listRecentActivity()`.
- Seed/reset: expose deterministic `resetDemoData()` for QA and a seeded state containing A-101/1234, A-102/5678, B-201/9012, fake bank/account values, fake documents, and fake Admin user `admin`/`admin1234`.
- Corrupt/stale storage: if JSON parse, schema version, required arrays/maps, or required sample unit data are invalid, services must fall back to seeded defaults and record a demo activity note; they must not crash the UI.
- Screen rendering code must not consume `window.timorDemoData` directly after migration except for initial seed constants inside the service layer.

### Data mutation and validation contracts
- Unit create/update: require non-empty unique `unitId`, non-empty building/room, non-empty contractor name, non-empty login password for demo, valid ISO-like date where date is entered, and fake phone strings only. Duplicate or blank unit IDs show inline error and do not mutate storage.
- Unit delete: cascade-delete that unit's payment and documents, remove unit-scoped journey overrides if created, and clear the current contractor session if it targets the deleted unit. Admin session remains active.
- Journey edits are global template edits for all units in this demo. The order is shared across units; Admin can edit title/date/status/progress/description. Progress is clamped 0-100, status is one of `대기`, `예정`, `진행 중`, `완료`.
- Payment edits are unit-scoped. Required amount and paid amount are non-negative numbers; paid can exceed required only if the UI labels overpayment explicitly, otherwise clamp unpaid amount to zero. Total price must be positive. Payment status is one of `납입 예정`, `일부 납입`, `납입 완료`, `미납`. Paid/remaining/unpaid/progress are calculated, not trusted from manual input.
- Document edits are unit-scoped. Title, type, file name/upload placeholder, description, upload date, and visibility are supported; empty title is rejected. File upload remains metadata-only placeholder.
- XSS/rendering safety: any Admin-entered string rendered through `innerHTML` must be escaped by a single safe helper, or rendered using `textContent`/DOM nodes. QA must inject `<img src=x onerror=window.__xssProbe=1>` into a text field and prove it renders as text and does not set `window.__xssProbe`.

### Dashboard metric formulas
- Date source for deterministic QA: use the browser's local date at runtime for "today"; seeded QA may set/mock date only inside its browser context and must record the effective date.
- Total units: `unitService.listUnits().length`.
- Completed units: count units where `contractStatus === "계약 완료"`.
- Unpaid units: count unit payments where at least one schedule row has `unpaidAmount > 0` or status `미납`.
- Today's payment due count: count all payment schedule rows with `dueDate === today`.
- Recent uploaded documents: visible or hidden Admin document rows sorted by `uploadedAt` descending, latest 3.
- Recent edit history: latest 5 `adminService.recordActivity` entries, including unit/payment/journey/document mutations.

### QA tooling contract
- Static server: use a small Node static server created under each evidence directory or reuse `qa-render.mjs` only if it supports the new flows. Invocation pattern must be recorded as `node <server-script> <root> <port>` and `node <qa-script> http://127.0.0.1:<port>/index.html <evidence-dir>`.
- Playwright runtime: use the bundled workspace/runtime Playwright path as existing QA scripts do, or call `codex_app.load_workspace_dependencies` if the worker needs the current dependency path.
- QA result schema: every script writes `{ "ok": true, "assertions": [{ "name": "...", "pass": true }], "screenshots": ["..."], "consoleErrors": [], "pageErrors": [], "cleanup": {...} }` and exits nonzero unless every assertion passes.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after plus browser E2E, because the current static app has no existing test harness or build manifest. Add a lightweight Node smoke test if a pure service seam is practical; otherwise use real browser QA as the failing-first/new-behavior proof.
- Evidence: `.omo/evidence/task-<N>-admin-settings-demo/`
- Manual QA surface: Playwright/Chromium at `390x867` against a local static server, with screenshots/action logs/result JSON.
- Adversarial classes to probe: `stale_state`, `dirty_worktree`, `misleading_success_output`, `malformed_input`, and `untrusted_external_text` where form text is rendered. Mark `cancel_resume`, `hung_or_long_commands`, `flaky_tests`, and `repeated_interruptions` not applicable unless the worker creates long-running or resumable flows.
- Browser QA hard-fail contract: every QA script must clear or seed `localStorage` at scenario start, fail on `pageerror`, unexpected console errors, missing selectors, missing screenshots, failed HTTP response, failed explicit assertions, or result JSON missing `ok: true`. Scripts must exit nonzero unless every named assertion passes.
- Dirty-worktree contract: capture baseline and final `git status --short` to the evidence directory; allowed product changes are limited to `index.html`, `data.js`, `app.js`, `styles.css`, optional `DESIGN.md`, and `.omo/` evidence/state artifacts. Do not revert unrelated untracked baseline files.
- Cleanup contract: every local server PID, browser context, temporary QA file, and port must be closed or recorded with a cleanup receipt in the task evidence directory.

## Execution strategy
### Parallel execution waves
- Wave 1: product implementation is one worker-owned lane because `index.html`, `app.js`, `data.js`, and `styles.css` are tightly coupled.
- Wave 2: independent adversarial/gate verification reviews the worker's DoneClaim and artifacts. Each verification task must use a fresh browser context, a separate evidence directory, and deterministic storage reset/seed so parallel tasks do not share localStorage state.
- Wave 3: final review/debugging gate runs after all todos.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | none | 2, 3, 4 | none |
| 2 | 1 | Final verification | 3, 4 |
| 3 | 1 | Final verification | 2, 4 |
| 4 | 1 | Final verification | 2, 3 |
| 5 | 1, 2, 3, 4 | Final verification | none |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Implement service-backed contractor and Admin demo settings app
  What to do / Must NOT do: Modify only `index.html`, `data.js`, `app.js`, `styles.css`, `DESIGN.md` if new reusable primitives are introduced, and optional QA scripts under `.omo/evidence/task-1-admin-settings-demo/`. Build the contractor login, Admin login, Admin dashboard/settings screens, service layer, localStorage persistence, scoped contractor rendering, MY consolidation, document pagination, payment/journey animations, and production-security comments. Do not add real secrets or production-security claims. Do not delete existing demo features; reconnect them to logged-in unit data.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 2, 3, 4
  References (executor has NO interview context - be exhaustive): `DESIGN.md`; `index.html`; `data.js`; `app.js`; `styles.css`; attached brief at `C:\Users\USER\.codex\attachments\48572c5c-5f99-48d2-8b20-2819bfeb2d38\pasted-text.txt`; `.omo/drafts/admin-settings-demo.md`
  Acceptance criteria (agent-executable): local browser starts unauthenticated with contractor data and bottom nav hidden; can log in as contractor `A-101` / `1234`; rejects a wrong contractor password with `호수 또는 비밀번호가 올바르지 않습니다.`; logs out; logs in as Admin `admin` / `admin1234`; rejects a wrong Admin password with `Admin 계정 정보가 올바르지 않습니다.`; Admin dashboard shows total units, completed units, unpaid units, today's payment due count, recent uploaded docs, and recent edit history; Admin can edit A-101 unit/password, all required bank/payment fields, journey stage status/progress/description, and document title/type/fileName/description/upload date/visibility; A-101 contractor login observes the edited data only on contractor screens.
  QA scenarios (name the exact tool + invocation): happy = create/run `node .omo/evidence/task-1-admin-settings-demo/admin-flow-smoke.mjs http://127.0.0.1:<port>/index.html .omo/evidence/task-1-admin-settings-demo`, drive the exact logins/edits/navigation above, capture result JSON and screenshots; failure = same script tries `A-102` with wrong password, contractor URL/Admin control access path, malformed `localStorage` JSON/wrong schema version fallback, and XSS probe string `<img src=x onerror=window.__xssProbe=1>`, confirming rejection/no Admin controls, seeded fallback, escaped rendering, and `window.__xssProbe` remains unset. The script must obey the Browser QA hard-fail contract, and the task evidence must include baseline/final `git status --short`, baseline/final SHA256 hashes for product files, baseline copies of product files for no-index comparison, plus cleanup receipt.
  Commit: N unless explicitly requested after verification | feat(admin-demo): add local admin settings demo
- [x] 2. Independently verify access control and data scoping
  What to do / Must NOT do: Read the implementation diff and task-1 evidence, then create/run an independent evidence script focused on no data leakage. Do not edit product files unless reporting a blocker to the executor.
  Parallelization: Wave 2 | Blocked by: 1 | Blocks: Final verification
  References (executor has NO interview context - be exhaustive): `index.html`; `data.js`; `app.js`; `styles.css`; `.omo/evidence/task-1-admin-settings-demo/`; attached brief sections 3, 4, 5, 6, 14, 18
  Acceptance criteria (agent-executable): A-101 contractor session never shows A-102/B-201 contractor names, documents, payment account data, or Admin nav/edit controls; Admin screen is not reachable from contractor UI; unauthenticated app does not show main contractor data.
  QA scenarios (name the exact tool + invocation): happy = `node .omo/evidence/task-2-admin-settings-demo/scope-qa.mjs http://127.0.0.1:<port>/index.html .omo/evidence/task-2-admin-settings-demo`; failure = wrong passwords, URL hashes `#admin`, `#payments`, `#journey`, and DOM-level hidden-view attempts produce login/error/current-role state rather than scoped data exposure. The script must obey the Browser QA hard-fail contract and include cleanup receipt.
  Commit: N | verification only
- [x] 3. Independently verify Admin CRUD persistence and contractor reflection
  What to do / Must NOT do: Create/run an independent evidence script in a fresh browser context, reset/seed demo storage using `resetDemoData()` or by clearing the service-owned localStorage namespace, then mutate Admin unit, journey, payment, and document fields and confirm those exact changes survive refresh and appear in contractor views. Do not rely on worker screenshots alone.
  Parallelization: Wave 2 | Blocked by: 1 | Blocks: Final verification
  References (executor has NO interview context - be exhaustive): `data.js`; `app.js`; `.omo/evidence/task-1-admin-settings-demo/`; attached brief sections 8, 9, 11, 13, 17
  Acceptance criteria (agent-executable): At least one edit in each domain persists across page reload: unit contractor name/password, journey progress/status/description, bank name, account number, bank manager name/phone, total price, payment required amount, payment paid amount/status, document title/type/fileName/description/upload date/visibility. Calculated paid/remaining/unpaid/progress values update without manual entry inconsistencies.
  QA scenarios (name the exact tool + invocation): happy = `node .omo/evidence/task-3-admin-settings-demo/persistence-qa.mjs http://127.0.0.1:<port>/index.html .omo/evidence/task-3-admin-settings-demo`; failure = hide an A-101 document in Admin and confirm contractor docs omit it after reload. The script must obey the Browser QA hard-fail contract and include cleanup receipt.
  Commit: N | verification only
- [x] 4. Independently verify mobile visual fit and interaction states
  What to do / Must NOT do: Create/run an independent visual evidence script at 390x867 and at least one wider viewport against login, home, journey, payments, documents, MY, Admin dashboard, units, journey admin, payments admin, and documents admin. Do not approve if text overlaps, controls overflow, button labels wrap badly, admin UI appears inside contractor nav, or the UI abandons the white/blue system.
  Parallelization: Wave 2 | Blocked by: 1 | Blocks: Final verification
  References (executor has NO interview context - be exhaustive): `DESIGN.md`; `styles.css`; `index.html`; attached brief sections 7, 10, 12, 14, 16, 19
  Acceptance criteria (agent-executable): screenshots show no incoherent overlap/clipping; all primary buttons have tactile active/focus states; 20:9 mobile frame remains usable; MY page starts collapsed and expands only one selected panel; document pagination shows max 3 visible cards.
  QA scenarios (name the exact tool + invocation): happy = `node .omo/evidence/task-4-admin-settings-demo/visual-qa.mjs http://127.0.0.1:<port>/index.html .omo/evidence/task-4-admin-settings-demo`; failure = force small viewport and long sample contractor/document values, confirm layout remains readable or record the exact blocker. The script must obey the Browser QA hard-fail contract and include cleanup receipt.
  Commit: N | verification only
- [x] 5. Apply verified demo to live Netlify surface or record deploy blocker
  What to do / Must NOT do: After tasks 1-4 pass, use existing Netlify/project deployment configuration if available to publish the verified static demo, then smoke-test the returned live URL. Do not enter private credentials into logs, do not bypass CAPTCHA/login, and do not claim live application if deployment is blocked by network/auth/external service state.
  Parallelization: Wave 3 | Blocked by: 1, 2, 3, 4 | Blocks: Final verification
  References (executor has NO interview context - be exhaustive): `.netlify/`; `.omo/plans/publish-static-demo.md`; `.omo/evidence/task-4-public-qa/`; `index.html`; `data.js`; `app.js`; `styles.css`
  Acceptance criteria (agent-executable): Either a live HTTPS URL serves the updated Admin/contractor demo and passes a reduced smoke flow, or `.omo/evidence/task-5-admin-settings-demo/blocker.json` records the exact missing credential/network/CAPTCHA/service blocker.
  QA scenarios (name the exact tool + invocation): happy = deployment command/surface available in this repo, followed by `node .omo/evidence/task-5-admin-settings-demo/live-smoke.mjs <live-url> .omo/evidence/task-5-admin-settings-demo`; failure = capture deploy command stderr or browser blocker screenshot/log with secrets redacted and exit with a `needs-human-review` deploy blocker while preserving local completion evidence.
  Commit: N unless explicitly requested after verification | deployment/evidence only

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Wait for the user's explicit okay only before commit, deploy, PR, merge, or any other external/destructive action.
- [x] F1. Plan compliance audit: reread `.omo/plans/admin-settings-demo.md`, verify every top-level todo is checked, verify `.omo/start-work/ledger.jsonl` has task-completed evidence for todos 1-4, and capture the audit to `.omo/evidence/final-admin-settings-demo/plan-compliance.json`.
- [x] F2. Code quality review: inspect baseline copies/hashes from task 1, compare changed untracked product files with `git diff --no-index <baseline-copy> <current-file>` or equivalent, run `node --check app.js` and `node --check data.js`, verify service-layer boundary and no real PII/secrets, and capture results to `.omo/evidence/final-admin-settings-demo/code-quality.json`.
- [x] F3. Real manual QA rerun: rerun task 1-4 Playwright scripts in fresh browser contexts after clearing storage, require `ok: true` in every result JSON, collect new final screenshots/result JSON, and capture the summary to `.omo/evidence/final-admin-settings-demo/manual-qa.json`.
- [x] F4. Scope fidelity and cleanup: compare final UI behavior against attached brief's final checklist, treating live deployment as PASS only with a live URL or `needs-human-review` with a precise task-5 blocker, record baseline/final `git status --short`, verify allowed-change boundaries, stop all local servers/browser contexts, and write `.omo/evidence/final-admin-settings-demo/cleanup-receipt.json`.

## Commit strategy
- Commit only if requested by the user after the local demo is verified. If committing, use the Lore Commit Protocol from AGENTS.md.
- Keep `.omo/` plan/evidence changes separate from product changes if the user asks for a commit.

## Success criteria
- Contractor and Admin login flows work and fail safely with the requested Korean error messages.
- Admin can manage unit, password, journey, payment, and document demo data through visible UI controls.
- Contractor views show only the logged-in unit's data and no Admin controls.
- Admin mutations persist in localStorage and reflect in contractor views.
- Service objects own data access and include explicit production-security comments.
- Local browser QA evidence exists for login, admin management, contractor reflection, scoping failures, mobile screenshots, and cleanup.
- Live demo is updated and smoke-tested, or a precise Netlify/network/auth blocker is recorded without claiming deployment success.
