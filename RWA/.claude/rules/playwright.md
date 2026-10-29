---
paths:
  - playwright/**
---

# Playwright test rules (functional framework)

Applies when reading or editing the Playwright framework in `playwright/`.
Owning agents: `api-automation` (tests/api), `ui-automation` (tests/ui), `e2e-architect` (journeys),
`mock-smith` (stubs/fixtures). Read `playwright/README.md` first.

## Do
- **Functional style only**: standalone helpers that take their dependency first
  (`createTransaction(http, payload)`, `pickDateRange(page, start, end)`). No classes, no page objects.
- Reuse the existing layers: HTTP via `src/api/*` (frozen `{ status, ok, body, headers }` results that
  never throw on status); UI via `src/ui/*` (`bySel`/`bySelLike`, `loginByXstate`, `goToSideNav`,
  `waitForApi`, `stubApi`). Compose these; don't re-implement them in a spec.
- Import through path aliases and fixtures: `import { test, expect } from "@fixtures/ui"` (or `@fixtures/api`),
  `import { loginByXstate, bySel } from "@ui"`, `import { … } from "@api"`.
- Start the wait **before** the action: `const res = waitForApi(page, m); await action(); await res;`
  (the port of `cy.intercept().as()` + `cy.wait()`).
- Select by `data-test` (`testIdAttribute` is set): `bySel(page, "signin-submit")`. Click date-picker days
  by exact `aria-label`. Drive the amount slider with real keyboard input (`setAmountRange`).
- Assert on real values: `res.status`, `res.body`, visible text/counts. Use `bodyOrThrow` only for setup
  that must fail fast.
- Keep tests deterministic: rely on the auto `seed` fixture; seed users' password is `s3cret`. Dates are UTC.
- Put a stubbed feed/fixture under `test-data/`; build mock scenarios with `mock-smith`.

## Don't
- **No hard waits** (`page.waitForTimeout`, arbitrary sleeps) — wait for a response, a selector or a URL.
- Don't assume `workers > 1`; the shared JSON DB means `fullyParallel: false`, `workers: 1`. Don't reorder
  tests to depend on each other.
- Don't weaken or delete an assertion to make a spec pass — document any deliberate change in the hand-off.
- Don't assert the buggy behaviour as if it were correct. Per D-005, a test asserts the **correct**
  behaviour and is marked `test.fail(true, 'KI-xx: …')` for a catalogued defect in
  `tap26/knowledge/known-issues.md` (a newly found defect is a `BUG-###`); when the code is fixed, remove
  the `test.fail` so the test guards the fix. OpenAPI still documents the *actual* behaviour.
- Don't add dependencies to `playwright/package.json` without the student's OK (`@axe-core/playwright` for
  a11y is the one expected addition, still ask first).
- Don't hardcode ids from the live DB; look them up via `db.find`/`db.filter` or the API.
- Don't add classes, inheritance or a page-object layer.
- Don't send `amount` in cents to `POST /transactions`: the create endpoint takes whole **dollars** and
  stores them ×100 (KI-18). Stored/derived amounts elsewhere are cents.

## E2E journeys (D-006)
- Cross-layer journeys live in `playwright/tests/e2e/*.e2e.spec.ts` under a dedicated `e2e` project
  (owned by `e2e-architect`), separate from `tests/api` and `tests/ui`.

## Verify before hand-off
- `npm --prefix playwright run typecheck` clean.
- Relevant project green **twice** in a row (flake gate §7.4): `--project=api` / `ui-desktop` /
  `ui-mobile` (mobile when layout is involved). Paste pass counts, not full logs.
- Note that the run reseeded the DB (wipes manual data).
