recommendation: REJECT

blockers:
- `src/services/paymentModel.js` and `test/paymentModel.test.js` are untracked. The working tree builds because the files exist locally, but the branch diff/commit artifact would omit the new imported module unless they are added. `src/services/paymentService.js` imports `./paymentModel.js`, so a merge without the untracked file would break the app.
- `test/bilingualUi.test.js:71` adds implementation-mirroring source-regex assertions instead of driving/rendering the user-visible UI. This violates the direct `remove-ai-slops` overfit/slop pass: the test mainly proves helper names and JSX snippets exist, not that Contractor Journey/Payment render English in `en` mode and DB Korean values in `kr` mode.
- Required gate artifacts are absent or unsupported: no prior code-review report path was supplied/found showing the same skill-perspective anti-slop coverage; no manual QA matrix artifact path was supplied; `.omo/notepad.md` is missing; authenticated `/contractor/journey` and `/contractor/payments` were not driven in this workspace.

originalIntent:
- User requested display-only bilingual fixes on branch `codex/bilingual-en-kr-ui`.
- Contractor Journey step descriptions should show English in `en` mode and Korean DB values in `kr` mode.
- Contractor Payment 8-step titles should show English in `en` mode and Korean DB values in `kr` mode.
- DB title/description values must not be changed.
- No migration, RLS, Supabase, or security changes.

desiredOutcome:
- A merge-ready React/Vite UI change that changes rendered labels/descriptions only.
- Supabase/DB seed and update payload behavior remains unchanged.
- Admin editable fields keep raw DB values and do not save translated display strings.
- Tests and QA prove the user-visible bilingual behavior without creating false confidence.

userOutcomeReview:
- Working-tree source review supports the main display-only behavior:
  - `src/routes/ContractorLayout.jsx:154` receives `language` in Contractor Payments.
  - `src/routes/ContractorLayout.jsx:410` passes `language` through payment list/card rendering.
  - `src/routes/ContractorLayout.jsx:429` renders `getPaymentStepTitle(item, language)`.
  - `src/routes/ContractorLayout.jsx:450` renders Journey title and description through display helpers.
  - `src/routes/ContractorLayout.jsx:452` renders `getJourneyStepDescription(item, language)`.
  - `src/routes/AdminLayout.jsx:1002` receives `language` in PaymentsPage.
  - `src/routes/AdminLayout.jsx:1480` uses `getPaymentStepTitle(item, language)` for the admin header only.
  - `src/routes/AdminLayout.jsx:1495` keeps the payment title input defaulted to `item.title`.
  - `src/routes/AdminLayout.jsx:1553` keeps the Journey description input defaulted to `item.description || ""`.
  - `src/services/paymentService.js:3` imports `DEFAULT_PAYMENT_STEPS` from `paymentModel`; direct Node comparison confirmed the current array is value-equivalent to `HEAD:src/services/paymentService.js`.
  - `src/services/paymentService.js:98` still seeds payment rows from `DEFAULT_PAYMENT_STEPS`.
  - `src/services/paymentService.js:122` still updates `payment_items.title` from form values.
  - `src/services/journeyService.js:26` and `src/services/journeyService.js:28` still update Journey title/description from form values.
- User-visible completion is not fully proven because the protected contractor routes were not authenticated and driven. The supplied unauthenticated login smoke is relevant but does not observe the changed `/contractor/journey` or `/contractor/payments` surfaces.

checked artifact paths:
- `src/services/journeyModel.js`
- `src/services/paymentModel.js`
- `src/services/paymentService.js`
- `src/routes/ContractorLayout.jsx`
- `src/routes/AdminLayout.jsx`
- `test/journeyModel.test.js`
- `test/paymentModel.test.js`
- `test/bilingualUi.test.js`
- `package.json`
- `.omo/evidence/`
- `.omo/notepad.md` (missing)

verification:
- `git status --short --branch`: branch `codex/bilingual-en-kr-ui`; tracked edits plus untracked `src/services/paymentModel.js` and `test/paymentModel.test.js`.
- `git diff --check`: pass, exit 0.
- `node --check src/services/paymentModel.js`: pass, exit 0.
- `npm.cmd test`: pass, 51 tests, 0 fail.
- `npm.cmd run build`: pass outside sandbox after sandbox config-resolution denial; Vite transformed 95 modules and built production assets.
- `rg -n "service_role|SUPABASE_SERVICE_ROLE|VITE_SUPABASE_SERVICE|signUp|createUser" src`: no matches.
- Direct Node value check: `DEFAULT_PAYMENT_STEPS` in `src/services/paymentModel.js` is value-equivalent to the previous `HEAD:src/services/paymentService.js` constant; `getPaymentStepTitle(..., "en")` returns English; `getPaymentStepTitle(..., "kr")` returns the DB title.
- Direct Node Journey check: `getJourneyStepDescription(..., "en")` returns English; `getJourneyStepDescription(..., "kr")` returns the DB description.

remove-ai-slops pass:
- Production diff is small and behavior-scoped; no migration/security expansion found.
- The new UI coverage in `test/bilingualUi.test.js:71` to `test/bilingualUi.test.js:78` is overfit implementation-mirroring. It should be replaced or supplemented with a render-level/component-level assertion that observes the displayed strings under `en` and `kr`.
- `test/paymentModel.test.js` and `test/journeyModel.test.js` are useful pure-model behavior tests and are not blockers.

programming pass:
- The changed JS/JSX files do not fall under the programming skill's TypeScript/Python/Rust/Go mandatory reference gate, but the shared criteria still apply.
- No new dependency, no type escape hatch, no speculative broad abstraction observed.
- The source-regex UI test creates maintenance burden and false confidence, which fails the programming test-shape criteria.

exact evidence gaps:
- No authenticated screenshot or browser artifact for `/contractor/journey`.
- No authenticated screenshot or browser artifact for `/contractor/payments`.
- No manual QA matrix artifact path supplied.
- No previous code-review report artifact path supplied/found with explicit anti-slop/programming coverage.
- `.omo/notepad.md` does not exist.
- Untracked files mean the branch artifact is not self-contained until `src/services/paymentModel.js` and `test/paymentModel.test.js` are added.
