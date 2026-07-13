# Bilingual UI Source-Fallback Gate Review

recommendation: REJECT

## originalIntent

Preview QA follow-up for bilingual UI. The intended change is display-only English fallback for Contractor Journey descriptions and Contractor Payment 8-step titles, without modifying stored DB values or protected data-access behavior. Korean mode should continue to show stored Korean/raw values.

## desiredOutcome

- English mode shows the supplied English defaults for the 8 Journey step descriptions by `step_no`.
- English mode shows the supplied English defaults for the 8 Contractor Payment step titles by `step_no`.
- Korean mode returns the stored Journey description and stored Payment title values.
- Admin edit inputs keep raw stored values so saving a form does not write display fallback strings back to the DB.
- Protected route behavior and data access remain unchanged; no service-role or signup/admin-user behavior is introduced.

## userOutcomeReview

Source-level outcome checks pass for the requested fallback behavior:

- Contractor Journey visible card path no longer renders raw `item.description`: `src/routes/ContractorLayout.jsx:450-464` computes `displayDescription = getJourneyStepDescription(item, language)` and renders `{displayDescription}`.
- Contractor Payment visible card path no longer renders raw `item.title`: `src/routes/ContractorLayout.jsx:428-436` computes `displayTitle = getPaymentStepTitle(item, language)` and renders `{displayTitle}`.
- Route wiring carries `language`: `src/routes/ContractorLayout.jsx:80` includes `language` in `shell`; `src/routes/ContractorLayout.jsx:97`, `154-161`, `410-419`, and `428-436` pass it into payment cards. `src/routes/AdminLayout.jsx:676-744` includes `language` in `shell`; `src/routes/AdminLayout.jsx:780`, `1002-1094`, and `1479-1495` pass it into admin payment item headers.
- Admin editable raw values are preserved: `src/routes/AdminLayout.jsx:1495` keeps `defaultValue={item.title}`, and `src/routes/AdminLayout.jsx:1553` keeps `defaultValue={item.description || ""}`.
- Helper behavior is display-only and pure: `src/services/journeyModel.js:95-119` and `src/services/paymentModel.js:12-29` return English maps only when `language === "en"` and otherwise return stored values.
- No missing requested English strings were found in the source/helper outputs. Direct Node probes returned all 8 Journey English descriptions and all 8 Payment English titles.
- Korean fallback was verified with direct Node probes: Journey `kr` descriptions returned `KR1` through `KR8`, Payment `kr` titles returned `KR1` through `KR8`, and a custom stored Korean title was returned unchanged.

Fresh verification run:

- `npm.cmd test`: PASS, 51 tests passed.
- `node --check src\services\journeyModel.js`: PASS.
- `node --check src\services\paymentModel.js`: PASS.
- `node --check test\journeyModel.test.js`: PASS.
- `node --check test\paymentModel.test.js`: PASS.
- `npm.cmd run build`: PASS after sandbox escalation; first attempt failed because Vite/esbuild was denied access resolving `vite.config.js` under the sandbox.

## blockers

1. Required gate evidence artifacts are still missing. No separate code review report, manual QA matrix, authenticated screenshot artifact, route-smoke artifact, security-scan artifact, or notepad path was provided or found. The user-provided prose evidence is useful context but is not an inspectable artifact.
2. The required code review report cannot be confirmed to show `remove-ai-slops` overfit/slop coverage or `programming` criteria coverage because no such report exists in the supplied artifacts. Gate instructions require rejection when that coverage is absent or unsupported.
3. Direct anti-slop review found unresolved implementation-mirroring test coverage in `test/bilingualUi.test.js:72-80`. Those assertions inspect component source text and specific helper/defaultValue spellings instead of rendering observable UI behavior. This is acceptable as an emergency source-fallback signal, but it is overfit and can create false confidence if behavior is later refactored without changing user-visible output.
4. No authenticated protected-route screenshots were available. This is an acknowledged limitation of the requested source-fallback review, but visual fidelity cannot be fully approved from source alone.

## findings

- Scope note: `src/services/paymentService.js` was also modified outside the source-facts list to import `DEFAULT_PAYMENT_STEPS` from the new pure `src/services/paymentModel.js`. The diff is narrow and consistent with separating pure model/display defaults from Supabase service calls.
- Nonblocking coverage note: pure helper tests validate representative English strings and Korean fallback, but they do not exhaustively assert every one of the 8 English Journey descriptions or 8 English Payment titles. I verified all 8 directly with Node probes during this gate.

## checkedArtifactPaths

- `src/services/journeyModel.js`
- `src/services/paymentModel.js`
- `src/services/paymentService.js`
- `src/routes/ContractorLayout.jsx`
- `src/routes/AdminLayout.jsx`
- `test/journeyModel.test.js`
- `test/paymentModel.test.js`
- `test/bilingualUi.test.js`
- `package.json`
- `.omo/evidence/journey-phase-4-gate-review.md`
- `.omo/evidence/bilingual-ui-source-fallback-gate-review.md`

## evidenceGaps

- No separate code-review report with explicit `remove-ai-slops` and `programming` criteria coverage.
- No manual QA matrix.
- No authenticated screenshots for `/contractor/journey`, `/contractor/payments`, or admin protected routes.
- No inspectable built-app route-smoke artifact; only prose evidence was supplied.
- No static/security scan artifact.
- No `.omx/notepad.md` or other provided notepad path in the current workspace.
