# Bilingual Translation QA Evidence

## Scope

- Branch: `codex/bilingual-en-kr-ui`
- Change: display-only English translations for Contractor Journey descriptions and Contractor Payment step titles.
- Constraint: no Supabase admin or contractor session credentials are available in this workspace, so authenticated `/contractor/*` and `/admin/*` browser routes cannot be opened past the route guard.

## Verified

| Area | Method | Result |
| --- | --- | --- |
| Login language shell | Built `dist` served locally and opened in Chrome via Playwright | Default English shows `KR`; clicking toggles to Korean, button changes to `EN`, and `timorcrest_language=kr` is persisted |
| Journey title display | `test/journeyModel.test.js` | English title map returns step-number based English labels; Korean keeps DB title |
| Journey description display | `test/journeyModel.test.js` | English description map returns step-number based English descriptions; Korean keeps DB description |
| Contractor Journey render path | `test/bilingualUi.test.js` | Contractor card path calls `getJourneyStepDescription(item, language)` |
| Payment title display | `test/paymentModel.test.js` | English payment title map returns step-number based English labels; Korean keeps DB title |
| Contractor Payment render path | `test/bilingualUi.test.js` | Contractor payment item path calls `getPaymentStepTitle(item, language)` |
| Admin edit safety | `test/bilingualUi.test.js` and source review | Admin editable `title` and `description` inputs remain bound to raw DB values |
| Build | `npm run build` | Passed |
| Test suite | `npm test` | Passed |
| Security scan | `grep -RInE "service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp|createUser" src` | No matches |

## Not Verified In Browser

- `/contractor/journey` authenticated screen capture.
- `/contractor/payments` authenticated screen capture.
- `/admin/journey` and `/admin/payments` authenticated edit flows.

Reason: these routes require a live Supabase authenticated session. No credentials or preloaded browser session were available during this local QA pass.
