---
name: tap-run-tests
description: "Run the test suites and get a triaged summary: Playwright projects api, ui (ui-desktop), mobile (ui-mobile) or all, optionally filtered by spec file or grep; also Vitest unit tests (unit) and the legacy Cypress suite (cypress, needs the Cypress binary). Summarises pass/fail/flaky, sends failures to the debugger for triage and offers the HTML report. Use when a student says 'run the tests', 'run the api tests', 'is everything green', or 'run auth.spec'."
argument-hint: "[api|ui|mobile|e2e|all|unit|cypress] [spec file or grep text]"
allowed-tools: Bash(grep *), Bash(node tap26/scripts/*), Bash(npx playwright test *), Bash(npx playwright show-report *)
---

# /tap-run-tests — run, summarise, triage

## Goal
Run exactly the tests the student asked for against the running app, and come back with a clear
pass/fail/flaky summary plus a probable cause for every failure — not a wall of logs.

## Inputs
Parse `$ARGUMENTS` (the whole input text) yourself: **the first word is the project**
(`api|ui|mobile|e2e|all|unit|cypress`); **the rest is the filter** (a spec path or grep text, free text).
If the first word is not a project, the project is `all` and the whole `$ARGUMENTS` is the filter.
- **project**, default `all`:
  | value | command (Playwright ones run from `playwright/`) |
  |---|---|
  | `api` | `npx playwright test --project=api` |
  | `ui` | `npx playwright test --project=ui-desktop` |
  | `mobile` | `npx playwright test --project=ui-mobile` |
  | `e2e` | `npx playwright test --project=e2e` (journeys in `tests/e2e/*.e2e.spec.ts`, D-006) |
  | `all` | `npx playwright test` (every project) |
  | `unit` | `yarn test:unit:ci` from the repo root (Vitest, `src/__tests__`) |
  | `cypress` | `yarn cypress:run` from the root — legacy suite, needs the Cypress binary (`yarn cypress install`) |
- **filter** (the rest of `$ARGUMENTS`), optional:
  - looks like a path or ends in `.spec.ts` → pass as file, e.g. `tests/ui/auth.spec.ts`
  - otherwise → `-g "<filter>"` (title grep), e.g. `/tap-run-tests ui "invalid user"`.
  - For `cypress`: a path becomes `--spec <path>`.

Playwright projects configured now: !`grep -o 'name: "[^"]*"' playwright/playwright.config.ts 2>/dev/null || true`

## Steps
1. **Pre-flight** — delegate to `env-ops`: "Run `node tap26/scripts/doctor.mjs --quick`. Required: :3000 and
   :3001 up (all projects except `unit`), Playwright deps + Chromium installed (ui/mobile/e2e/all),
   Cypress binary (cypress). If anything is missing, stop and recommend `/tap-run` or `/tap-setup`."
   Warn the student once: **every Playwright/Cypress test reseeds the database** (`POST /testData/seed`),
   wiping manual data in the running app.
2. **Run** — delegate to `env-ops` with the exact command from the table plus the filter. Do not pass
   `--reporter` (it would replace the config's reporters): `playwright.config.ts` already writes
   `list` (console) + `html` (open with `npx playwright show-report`). Examples:
   - `cd playwright && npx playwright test --project=api`
   - `cd playwright && npx playwright test tests/ui/auth.spec.ts --project=ui-desktop`
   - `cd playwright && npx playwright test --project=ui-desktop -g "invalid user"`
   Ask for: total, passed, failed, flaky, skipped, duration, and for each failure the title, file:line,
   first error line and trace path (`playwright/test-results/<dir>/trace.zip`). Long full runs (`all`
   takes several minutes, `workers: 1` by design) may run as a background process.
3. **Flaky check** — if anything failed, re-run only the failing tests once
   (`npx playwright test --last-failed`). Passed on re-run ⇒ classify **flaky**.
4. **Triage failures** — for each remaining failure (max 5; group by shared error) delegate to `debugger`
   with title, error and trace path: "Classify as test bug / app regression / environment / data, with
   evidence and the next action. Do not edit files." Independent failures may be triaged in parallel.
5. **Offer the report** — tell the student they can open the HTML report with
   `cd playwright && npx playwright show-report` (or `npm run report`), and a trace with
   `npx playwright show-trace <path>`. For Cypress, screenshots/videos are under `cypress/screenshots|videos`.
6. **Next actions** — test bug → suggest `/tap-debug failing test "<title>"`; regression → `/tap-debug`
   with the app symptom; drift after app changes → `/tap-sync-tests`.

## Quality gates
- Tests were run against a healthy app (pre-flight passed) — otherwise report "not run" with the reason.
- Summary counts come from the reporter output, not estimates.
- Every failure has a triage class and evidence; flaky tests are listed separately (gate 4 says tests must pass 2× in a row).
- This skill does not modify tests or app code; fixes go through `/tap-debug` or `/tap-sync-tests`.

## Output
```
Ran        <command>
Result     ✓ passed n   ✗ failed n   ~ flaky n   – skipped n     (<duration>)
Failures
  1. <project> › <file>:<line> › <title>
     <first error line>
     triage: <class> — <cause> → <next action>
Flaky      <titles> (passed on retry)
Report     cd playwright && npx playwright show-report
```

## Memory
- Known flaky test → `node tap26/scripts/memory.mjs add-fact tests "Flaky: <title> (<project>), fails ~n/10 — <suspected cause>" --by debugger`
- Recurring environment cause → `memory.mjs add-learning "<title>" --lesson "<t>" --tags tests,env --applies env-ops,tap-run-tests --by env-ops`
- Journal the run: `node tap26/scripts/memory.mjs journal "tap-run-tests <project>: <passed>/<total>" --by env-ops`

## Learn more
- `playwright/README.md` (scripts table), `tap26/docs/07-testing-framework.md`, `tap26/docs/13-troubleshooting.md`
- Labs: `tap26/labs/lab-05`, `lab-06`, `lab-13` (debugging)
