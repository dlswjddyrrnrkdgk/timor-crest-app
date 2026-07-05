---
slug: publish-static-demo
status: drafting
intent: clear
pending-action: write .omo/plans/publish-static-demo.md
approach: Netlify Drop first, provider preview subdomain first, custom domain only after preview QA passes.
---

# Draft: publish-static-demo

## Components (topology ledger)
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| C1 | Static deploy package contains only required runtime files and no support/QA-only assets. | active | `.omo/evidence/task-1-package-inventory.txt` |
| C2 | Local served app renders and navigates before any public upload. | active | `.omo/evidence/task-2-local-qa/` |
| C3 | Netlify Drop receives the static package and returns a public preview URL. | active | `.omo/evidence/task-3-netlify-drop/` |
| C4 | Public preview URL serves the same app over HTTPS and passes smoke navigation QA. | active | `.omo/evidence/task-4-public-qa/` |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| Hosting channel | Netlify Drop | User explicitly approved this path. | Yes |
| Domain | Netlify-generated preview subdomain | Fastest publish path; custom domain should wait until preview verification passes. | Yes |
| Runtime files | Publish `index.html`, `styles.css`, `data.js`, and `app.js` only | `index.html` references only those relative runtime assets; screenshots and QA script are support artifacts. | Yes |
| Secrets/auth | No auth or private data | README states no login/auth/session/admin workflows; this is demo-only. | Yes |

## Findings (cited - path:lines)
- `README.md`: static demo, no backend services, can run by opening `index.html` or any static web server.
- `index.html`: runtime dependencies are `./styles.css`, `./data.js`, `./app.js`.
- `styles.css`: no `url(...)` asset dependencies found.
- `app.js`: browser-only render/navigation helpers; no API/backend integration.

## Decisions (with rationale)
- Use Netlify Drop for the first public preview because it accepts static folders with no build step.
- Verify locally before upload so public hosting issues are separated from app/runtime issues.
- Verify the returned HTTPS URL after upload; a Netlify success screen alone is not completion evidence.
- Defer custom domain until after preview QA, because domain/DNS is a separate reversible publishing step with propagation risk.

## Scope IN
- Build a deployable static package or folder manifest for Netlify Drop.
- Run local static-server smoke QA.
- Attempt Netlify Drop upload through the available browser/web surface.
- Verify returned public preview URL when Netlify produces one.
- Record artifacts under `.omo/evidence/` and work ledger under `.omo/start-work/ledger.jsonl`.

## Scope OUT (Must NOT have)
- Do not add backend, auth, analytics, payments, or data collection.
- Do not publish private buyer data or claim production security.
- Do not attach a custom domain in this pass.
- Do not modify product code unless local/public QA exposes a publish-blocking defect.

## Open questions
None. User approved Netlify Drop preview-first path.

## Approval gate
status: approved
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
