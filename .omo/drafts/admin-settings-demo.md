---
slug: admin-settings-demo
status: approved-active
intent: unclear
pending-action: execute .omo/plans/admin-settings-demo.md
approach: Start-work bootstrap from attached Korean brief. Build a demo-only admin/login/settings layer for the existing static mobile app, backed by mock/localStorage services that can later be replaced by real server auth, database, and storage APIs.
---

# Draft: admin-settings-demo

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
1 | Service/data boundary for units, auth, journey, payments, documents, and admin persistence | active | .omo/evidence/task-1-admin-settings-demo/
2 | Contractor and admin login/access-control flow | active | .omo/evidence/task-2-admin-settings-demo/
3 | Admin dashboard and CRUD-style management screens | active | .omo/evidence/task-3-admin-settings-demo/
4 | Contractor-facing home, journey, payments, documents, MY data binding | active | .omo/evidence/task-4-admin-settings-demo/
5 | Visual/mobile QA and no-cross-unit/no-admin-leak verification | active | .omo/evidence/final-admin-settings-demo/

## Open assumptions (announced defaults)
<!-- Intent is UNCLEAR: research resolves ambiguity, defaults are adopted (not asked), and each is surfaced in the plan's human TL;DR for veto. -->
<!-- assumption | adopted default | rationale | reversible? -->
Plan routing | Treat as `$start-work` no-plan bootstrap, not old publish-static-demo continuation | Existing active plan is for Netlify publishing and all implementation todos are done; attached brief is a different admin/settings feature | yes
Storage | Use localStorage-backed demo services with seeded sample data | Brief explicitly permits mock/localStorage and asks for later DB/API replaceability | yes
Security | Implement UI/access-flow separation only, with explicit comments that production needs server auth, DB permissions, password hashing, and file ACLs | Brief says demo only but requires these warnings | yes
Implementation topology | One implementation worker owns product runtime files to avoid conflicting edits across shared static files | App is a small vanilla static app where index/app/data/styles are tightly coupled | yes
Design direction | Preserve existing white/blue 20:9 mobile design system from DESIGN.md | User asked to maintain existing demo design tone | yes
Deployment | Do not redeploy Netlify in this pass unless explicitly requested after local verification | Request says current demo already deployed and asks for feature development; network deployment would be external-production side effect | yes

## Findings (cited - path:lines)
DESIGN.md: existing contract defines white/blue 20:9 phone shell, bottom navigation, rounded buttons, progress meters, stage cards, document pagination, and MY panel states.
app.js: current app uses vanilla DOM rendering, view switching via `showView`, animated count/progress meters, document pagination, and MY panel expansion.
data.js: current app keeps demo data in global arrays/objects consumed directly by app.js, so service-layer extraction is required by the brief.
index.html/styles.css: current UI is a static phone-frame demo; admin/login screens must stay within this surface without exposing admin menus to contractor views.
Attached brief: requires contractor login by unit/password, separate admin login (`admin` / `admin1234` acceptable for demo), per-unit admin settings for unit info, journey, payments, documents, localStorage persistence, and production-security comments.

## Decisions (with rationale)
Use vanilla JS modules/scripts rather than adding a build stack; the current app has no package manifest and is a static deployable demo.
Create explicit service objects (`authService`, `unitService`, `journeyService`, `paymentService`, `documentService`, `adminService`) as the only localStorage/mutable-data boundary.
Keep all sample data fake and labeled as demo data.
Make contractor screens read from the same service source admin edits mutate, so admin changes immediately reflect after navigation or refresh.
Use browser-driven QA as the primary manual gate because this is a static UI demo.

## Scope IN
Admin login, contractor login, route/access gating, admin dashboard, unit/password/contractor management, journey management, payment management, document management, contractor data scoping, MY label/panel behavior, mobile visual polish, localStorage persistence, and production-security comments.

## Scope OUT (Must NOT have)
No real backend, no real personal information, no real bank account data, no real document file upload/storage, no password hashing implementation in the browser, no custom Netlify deployment action, no deletion/reversion of existing demo assets.

## Open questions
None for execution. All remaining choices are reversible demo implementation details covered by adopted defaults.

## Approval gate
status: approved-by-start-work-bootstrap
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
