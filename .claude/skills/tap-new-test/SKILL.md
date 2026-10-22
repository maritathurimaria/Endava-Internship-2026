---
name: tap-new-test
description: "Create one new Playwright test from a plain-language description, at the right level: api (api-automation, playwright/tests/api), ui (ui-automation, playwright/tests/ui) or e2e (e2e-architect, playwright/tests/e2e). The test must be run and pass twice; if it exposes a real app bug it is kept as a documented expected failure and a bug report is filed. Use when a student says 'write a test that…', e.g. api \"GET /users/search returns 422 for empty q\"."
argument-hint: "api|ui|e2e \"<what the test should prove>\""
---

# /tap-new-test — one good test from a sentence

## Goal
Add a single, readable, functional-style Playwright test that proves exactly what the student
described, placed in the right spec, reusing existing helpers and fixtures, and verified by running it.

## Inputs
- Parse `$ARGUMENTS` (the whole input text) yourself: **the first word is the level** (`api|ui|e2e`);
  **everything after it is the description** — what the test must prove, e.g.
  `api GET /users/search returns 422 for empty q` → level `api`, description `GET /users/search returns 422 for empty q`.
- First word is not a level → the whole `$ARGUMENTS` is the description; infer the level: mentions an HTTP method/status/endpoint → `api`; a screen, click or form →
  `ui`; a multi-step user journey across screens and API → `e2e`. State the inferred level.
- Empty → ask for a one-sentence description.

## Steps
1. **Choose the agent** from the level:
   - `api` → `api-automation` · `ui` → `ui-automation` · `e2e` → `e2e-architect`.
2. **Write the test** — delegate to that agent with: "Create a test that proves: <the description = $ARGUMENTS minus its first
   word when that word is a level, otherwise all of $ARGUMENTS, verbatim>. Level: <level>.
   - Find the right existing spec first (`playwright/tests/api/<area>.api.spec.ts`,
     `playwright/tests/ui/<area>.spec.ts`, or `playwright/tests/e2e/<journey>.spec.ts`); add a new file only if no spec fits.
   - Reuse `playwright/src/api/*` route functions (add one to the right module + `endpoints.ts` if missing),
     `playwright/src/ui/*` helpers (`bySel`, `loginByXstate`, `waitForApi`, `goToSideNav`…) and fixtures
     from `@fixtures/api` / `@fixtures/ui`. No classes or page objects; one behaviour per test;
     title states the behaviour; Arrange–Act–Assert.
   - Check the real behaviour first (route in `backend/*-routes.ts`, validator in `backend/validators.ts`,
     or the screen at http://localhost:3000) so the expected values come from the app, not assumptions.
   - For `e2e`, follow `/tap-e2e` rules (D-006: `playwright/tests/e2e/*.e2e.spec.ts`, existing `e2e` project).
   - Run it: `cd playwright && npx playwright test <file> -g \"<title>\" --project=<api|ui-desktop|e2e> --repeat-each=2`
     and `npm run typecheck`. Report the counts."
3. **If the test fails**, delegate to `debugger` with the failure output to decide:
   - **Test is wrong** → back to the authoring agent to fix; re-run step 2's commands.
   - **App is wrong** (the description is the correct expected behaviour) → first check
     `tap26/knowledge/known-issues.md`: if it is a known defect, reuse its KI id. Ask the student to
     confirm the expected behaviour, keep the assertion (the CORRECT behaviour) and mark it per D-005:
     `test.fail(true, "KI-xx: <summary>")` for a catalogued defect, or `test.fail(true, "BUG-###: <summary>")`
     for a new one (next free number in `tap26/reports/bugs/`). The suite stays green and the test flips to an
     unexpected pass once the defect is fixed. Reference example: KI-33 in
     `playwright/tests/ui/mocked-states.spec.ts`. Known KI → skip step 4; new defect → go to step 4.
4. **File the bug (only for a new app bug)** — delegate to `manual-tester` with: "Write a reproducible bug
   report from `tap26/templates/bug-report.md` to `tap26/reports/bugs/BUG-###-<slug>.md` (D-007): title, severity,
   steps (including the curl or UI steps), expected vs actual, evidence (test file/title, response body
   or trace path), environment (commit, Node version). If the defect is not yet in
   `tap26/knowledge/known-issues.md`, propose a new KI entry in the hand-off."
5. **Explain** — in two or three sentences, tell the student why the test sits at this level and which
   helpers it reused (teaching mode).

## Quality gates
- Gate 4: the test was actually run and passes 2× (`--repeat-each=2`), or is a documented `test.fail`
  expected failure (`KI-xx`/`BUG-###`, D-005) with a catalogue entry or bug report.
- `npm --prefix playwright run typecheck` clean; functional style; no `.only`; no hard waits
  (`waitForTimeout`) — use web-first assertions or `waitForApi`.
- Assertion matches the description exactly (no weaker check, e.g. not `toBeGreaterThanOrEqual(400)` for "422").
- Every test reseeds via the auto `seed` fixture — no reliance on data created by other tests.

## Output
```
Level     <api|ui|e2e>   agent: <name>
Test      <file> › <title>
Run       passed 2/2    typecheck ✓          (or: expected failure — KI-xx | tap26/reports/bugs/BUG-###-<slug>.md)
Reused    <helpers/fixtures>
```
Show the final test code block (it is short) and the agent's hand-off Status/Verification lines.

## Memory
- New helper or route function added → `node tap26/scripts/memory.mjs add-fact tests "<helper> added in playwright/src/<path>" --by <agent>`.
- App bug found → `node tap26/scripts/memory.mjs add-question "Bug: <title> — fix or accept? (tap26/reports/bugs/BUG-###-<slug>.md)" --by manual-tester`.
- Something non-obvious (e.g. validator returns 422 not 400) → `memory.mjs add-learning "<title>" --lesson "<t>" --applies api-automation --by <agent>`.

## Learn more
- `playwright/README.md` (Adding a test, functional design), `tap26/docs/07-testing-framework.md`
- Labs: `tap26/labs/lab-05` (first API test), `lab-06` (first UI test), `lab-12` (e2e journey)
