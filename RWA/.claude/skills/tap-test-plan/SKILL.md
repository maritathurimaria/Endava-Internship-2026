---
name: tap-test-plan
description: "Write a risk-based test plan for a feature, change, story or the current git diff of the Real World App: scope in/out, likelihood x impact risk matrix, approach per test level (Vitest unit, Playwright API/UI/e2e, manual, a11y/security/perf), test data, entry/exit criteria and traceability to existing specs. Use when the student asks 'how should we test X', 'write a test plan for the bank-account note field', or before a release or a larger change."
argument-hint: "<feature | change description | story file path | 'diff'>"
---

# /tap-test-plan — risk-based test plan

## Goal
Produce a test plan a junior tester could execute tomorrow: it says WHAT to test, HOW MUCH, at WHICH
level, with WHICH data, and WHEN we are done — prioritised by risk and tied to the real files of this app.

## Inputs
- `$ARGUMENTS` — one of:
  - a feature/change in words, e.g. `allow users to add a note to bank accounts`;
  - a path to a story or spec, e.g. `tap26/reports/ba/ba-20261016-1430-story-split-payment.md`;
  - `diff` → plan for the uncommitted change (`git diff HEAD`) using the impact script.
- Empty → ask the student what the plan is for, then STOP.
- Template: `tap26/templates/test-plan.md`. Output folder: `tap26/reports/test-plans/`.

## Steps
1. **Gather context** (main thread, read-only):
   - `tap26/memory/MEMORY.md`, and `tap26/knowledge/generated/coverage-matrix.md`,
     `api-routes.md`, `ui-routes.md`, `tests-inventory.md` if they exist (else suggest `/tap-scan`).
   - For `diff`: run `node tap26/scripts/impact.mjs` (read-only) and keep its impacted routes/selectors/tests.
2. **Delegate to `qa-lead`** (Agent tool) with this brief:
   > Write a risk-based test plan for: "<input>". Fill `tap26/templates/test-plan.md` and save it as
   > `tap26/reports/test-plans/test-plan-<YYYYMMDD-HHmm>-<slug>.md` (D-007).
   > Requirements:
   > - **Scope**: in / out, naming concrete routes (`backend/*-routes.ts`), screens (`src/containers/*`,
   >   `src/components/*`) and XState machines (`src/machines/*`) touched.
   > - **Risk matrix**: each risk scored Likelihood 1–3 × Impact 1–3 = score 1–9; ≥6 = high. Consider money
   >   (transaction amount, balance, `banktransfers`), authz (other users' data), privacy levels
   >   (public/contacts/private feeds), validation drift between Yup forms and `backend/validators.ts`,
   >   pagination, notifications, and the shared JSON DB.
   > - **Approach per level**: unit (Vitest `src/__tests__`), API (`playwright/tests/api`, functions from
   >   `playwright/src/api/*`), UI (`playwright/tests/ui`, `ui-desktop` + `ui-mobile` when layout changes),
   >   e2e journey (`e2e-architect`, `playwright/tests/e2e/*.e2e.spec.ts`, project `e2e` — D-006), contract (`tap26/openapi/openapi.yaml` + spec-drift), manual
   >   exploratory charters, and a11y/security/perf only where a risk justifies them.
   > - **Existing coverage**: cite the spec files/tests that already cover each area (grep `playwright/tests`).
   > - **Known defects** in scope: list KI ids from `tap26/knowledge/known-issues.md`; tests for them assert
   >   correct behaviour with `test.fail(true, 'KI-xx: …')` (D-005).
   > - **Test data**: seeded users (password `s3cret`), reset via `POST /testData/seed`, any new data needed.
   > - **Entry/exit criteria**: measurable (e.g. "all high risks have ≥1 passing automated test, 2 green
   >   runs in a row, 0 open critical/major bugs, spec-drift clean").
   > - **Traceability**: table Requirement/Risk → Test (file or TC id) → Owner agent → Status.
   > You may delegate to `business-analyst` only if acceptance criteria are missing. Do not write tests.
   > End with the standard hand-off report.
3. **Review the plan** against the quality gates below. If a gate fails, send `qa-lead` one follow-up
   listing the gaps.
4. **Offer next steps** to the student: `/tap-test-cases` for manual cases, `/tap-new-test` for the
   top automated gaps, `/tap-a11y` / `/tap-security` / `/tap-perf` when the plan calls for them.

## Quality gates
- Every high risk (score ≥ 6) has at least one test idea, a level and an owner agent.
- Out-of-scope items are explicit and justified (one line each).
- Existing coverage is cited with real spec paths; no invented files or endpoints.
- Entry and exit criteria are measurable and checkable by a command or a report.
- The plan fits the template headings; no section left as an unexplained placeholder.

## Output
- File: `tap26/reports/test-plans/test-plan-<YYYYMMDD-HHmm>-<slug>.md`.
- Chat summary (≤ 15 lines): top 3 risks with scores, the level mix (e.g. "4 API, 2 UI, 1 e2e, 1 charter"),
  coverage gaps, exit criteria, and the next command to run.
- `qa-lead` hand-off report (Status / Changed files / Verification / Risks / Memory / Next agent).

## Memory
- Scope or level decisions: `node tap26/scripts/memory.mjs add-decision "Test scope for <feature>" --context "<why>" --decision "<what is in/out>" --by qa-lead`.
- Unknown business rules: `node tap26/scripts/memory.mjs add-question "<rule?>" --by qa-lead`.
- Active work: `node tap26/scripts/memory.mjs set-active "Test plan for <feature> — tap26/reports/test-plans/<file>"`.

## Learn more
- `tap26/docs/07-testing-framework.md`, `tap26/docs/06-workflows.md`
- Labs: `tap26/labs/lab-03-*` (explore), `tap26/labs/lab-09-*` (sync tests with changes)
