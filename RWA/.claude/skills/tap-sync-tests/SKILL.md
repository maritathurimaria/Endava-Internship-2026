---
name: tap-sync-tests
description: "Bring the Playwright tests back in sync with recent app changes: runs tap26/scripts/impact.mjs on the git diff (or --since <ref>) plus the change ledger, gets a test impact report from test-impact-analyst, has api-automation / ui-automation update the affected tests, runs them twice and reports. Use after someone changed backend/ or src/ by hand, after a git pull, or when a student asks 'which tests do I need to update?'."
argument-hint: "[--since <git ref>]  (default: uncommitted changes + change ledger)"
allowed-tools: Bash(git status *), Bash(head *)
---

# /tap-sync-tests — translate app changes into test updates

## Goal
Every app change since the reference point is reflected in the test suite: impacted tests are updated
(never weakened), missing coverage for new behaviour is added, and the affected tests are green twice.

## Inputs
- `$ARGUMENTS` — passed straight to the impact script. Supported: `--since <ref>` (e.g. `--since main`,
  `--since HEAD~3`, `--since c5f5d9f`).
- Empty → impact of the working tree (`git diff HEAD`, staged + unstaged) plus recent entries in
  `tap26/memory/changes.md`.

Changed app files right now (read-only):
!`git status --short -- backend src data 2>/dev/null | head -25 || true`

## Steps
1. **Impact analysis** — delegate to `test-impact-analyst` with: "Run
   `node tap26/scripts/impact.mjs $ARGUMENTS` from the repo root (just `node tap26/scripts/impact.mjs`
   if no arguments). Combine it with `tap26/memory/changes.md` and `git diff` to produce a test impact
   report: (a) changed routes/methods/payloads, (b) `data-test` selectors added/removed/renamed,
   (c) specs and helpers that reference them — `playwright/tests/api/*.api.spec.ts`,
   `playwright/src/api/*.ts`, `playwright/tests/ui/*.spec.ts`, `playwright/src/ui/*.ts`,
   `playwright/tests/e2e/**` if present, (d) new behaviour with no test, (e) an update plan split by
   agent with acceptance criteria. Save it to `tap26/reports/impact/impact-<YYYYMMDD-HHmm>-<slug>.md`."
   If the report says "no impact", stop here and tell the student why (e.g. only docs changed).
2. **API spec drift** — if routes changed, delegate to `contract-guardian`: run
   `node tap26/scripts/spec-drift.mjs`; if not clean, update `tap26/openapi/openapi.yaml` and regenerate
   JSON (`npx --yes js-yaml tap26/openapi/openapi.yaml > tap26/openapi/openapi.json`). Can run in parallel with step 3.
3. **Update tests** — delegate in parallel, each with its slice of the plan:
   - `api-automation`: "Update/add API tests per the plan. Change route functions in `playwright/src/api/`
     and `endpoints.ts`, types in `playwright/src/types/models.ts`. Functional style, frozen results,
     assert on `res.status`/`res.body`."
   - `ui-automation`: "Update/add UI tests per the plan. Fix selectors in `playwright/src/ui/selectors.ts`
     usages and specs; use `bySel`/`waitForApi`; run mobile too if layout changed."
   - `e2e-architect`: only if the plan lists e2e journeys.
   Rule for all: a test that fails because the **app is now wrong** is not "fixed" — report it as a
   suspected regression and hand it to `debugger` instead.
4. **Run affected tests twice** — delegate to `env-ops` (or run yourself) from `playwright/`:
   `npx playwright test <affected spec files> --project=<api|ui-desktop|ui-mobile|e2e> --repeat-each=2`
   then `npm run typecheck`. If the impact list is long or uncertain, run the whole project instead.
5. **Triage** — any failure → delegate to `debugger` with the failing title, error and trace path
   (`test-results/**/trace.zip`); decide: test bug (back to automation agent) vs app regression (report).
6. **Review** — for non-trivial test changes delegate to `code-reviewer`: "Review `git diff -- playwright`
   for weakened assertions, skipped tests, selector hygiene and FP conventions."

## Quality gates
- Impact report exists and every impacted spec in it is either updated or explicitly "no change needed" with reason.
- Gate 2 (when routes changed): `node tap26/scripts/spec-drift.mjs` clean.
- Gate 3: removed/renamed `data-test` ids no longer referenced under `playwright/` (grep proves it).
- Gate 4: all affected tests pass 2× in a row; `npm --prefix playwright run typecheck` clean.
- No `test.skip`, `test.fixme`, `.only` or loosened assertion added without a documented reason.
- Gate 6: `code-reviewer` approve for non-trivial diffs.

## Output
```
Since        <ref | working tree>
Impact       routes ~n · selectors +n -n ~n · specs n      report: tap26/reports/impact/impact-<YYYYMMDD-HHmm>-<slug>.md
Updated      <spec files>
Added        <new tests>
Run ×2       api n/n ✓   ui-desktop n/n ✓   ui-mobile n/n ✓ | n/a
Regressions  <none | list handed to debugger>
```
Show the condensed hand-offs and suggest `/tap-run-tests all` for a full confidence run.

## Memory
- Each change in the ledger handled → `node tap26/scripts/memory.mjs journal "tap-sync-tests: synced <n> specs for <files>" --by test-impact-analyst`
- Patterns that keep breaking tests (e.g. a selector that changes often) →
  `memory.mjs add-learning "<title>" --lesson "<t>" --tags tests,impact --applies test-impact-analyst,ui-automation --by knowledge-curator`
- Suspected app regressions → `memory.mjs add-question "<q>" --by test-impact-analyst`; finally `memory.mjs digest`.

## Learn more
- `tap26/docs/06-workflows.md` (change → tests → docs), `tap26/docs/07-testing-framework.md`, `tap26/docs/05-memory-and-self-learning.md`
- Lab: `tap26/labs/lab-09` (sync tests)
