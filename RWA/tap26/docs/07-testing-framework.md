# 07 · The Playwright testing framework

TAP26's automated tests live in `playwright/`: a **functional** Playwright + TypeScript framework ported
from the app's Cypress suite. No classes, no page objects — just small functions and fixtures. The
framework's own [README](../../playwright/README.md) is the detailed reference; this page is a guided tour.

## Structure

```
playwright/
├── playwright.config.ts     projects api · ui-desktop · ui-mobile · e2e · workers 1 · UTC · traces on failure
├── src/
│   ├── config/env.ts        BASE_URL, API_URL, seed password, page size (from .env)
│   ├── types/models.ts      User, Transaction, BankAccount, Notification…
│   ├── api/                 http.ts (send/get/post/patch/del) + one function per backend route
│   ├── ui/                  selectors, network, app, auth, navigation, forms, transactions
│   ├── mocks/               stub builders + data factories (mock-smith)
│   ├── utils/               fp.ts (pipe, matches…), money.ts, dates.ts
│   └── fixtures/            index.ts (api, seed, db, page) · api.ts (users, me) · ui.ts (users)
├── tests/api/*.api.spec.ts  users, transactions, bankaccounts, social, testdata, contract
├── tests/ui/*.spec.ts       auth, bankaccounts, new-transaction, notifications, feeds, view, settings, a11y
├── tests/e2e/*.e2e.spec.ts  cross-layer journeys (e2e-architect)
└── test-data/               JSON fixtures (e.g. public-transactions.json)
```

Imports use path aliases: `@api`, `@ui`, `@fixtures/api`, `@fixtures/ui`, `@utils/*`, `@config`, `@models`.

## Projects

| Project | Tests | Browser | Viewport | Script |
|---|---|---|---|---|
| `api` | `tests/api` | none (request context) | — | `npm run test:api` |
| `ui-desktop` | `tests/ui` | Chromium | 1280×1000 | `npm run test:ui` |
| `ui-mobile` | `tests/ui` | Chromium | 375×667 | `npm run test:ui:mobile` |
| `ui-tablet` | `tests/ui` | Chromium | 500×800 | `npm run test:ui:tablet` |
| `e2e` | `tests/e2e/*.e2e.spec.ts` | Chromium | desktop | `npx playwright test --project=e2e` |

`workers: 1` and `fullyParallel: false` because all tests share **one JSON database** that is re-seeded
before every test.

### Independent actors in one journey

For simultaneous users, create one `browser.newContext()` per actor; each context has isolated cookies
and local storage. Create a page in each context, call `exposeAppServices(page)` before navigation,
then authenticate each page independently with `loginByXstate`. Prefer an event-based wait such as
`waitForApi` when checking a change after another actor's action. See the two-context payment example
in [pay-a-friend.e2e.spec.ts](../../playwright/tests/e2e/pay-a-friend.e2e.spec.ts).

## Fixtures — the heart of the framework

Fixtures replace Cypress's `beforeEach` + `let ctx = {}`. A fixture builds a value, hands it to the
test with `use(value)`, then cleans up.

| Fixture | From | Gives you |
|---|---|---|
| `api` | `@fixtures` | an API request context with its own cookie jar |
| `seed` | `@fixtures` | **auto**: `POST /testData/seed` before every test |
| `db` | `@fixtures` | `db.filter(entity, query)`, `db.find(entity, query)` over the seeded data |
| `page` | `@fixtures` | the page with XState services exposed (`window.Cypress = true`) |
| `users` | `@fixtures/api`, `@fixtures/ui` | the five seeded users, in seed order |
| `me` | `@fixtures/api` | **auto**: `users[0]` logged in on `api` before every API test |

## API helpers

Every call resolves to a **frozen result** `{ status, ok, body, headers }` and **never throws** on an HTTP
error — the test decides what status is correct. Use `bodyOrThrow(res)` in setup code that must succeed.

```ts
import { test, expect } from "@fixtures/api";
import { bankAccounts } from "@api";

test("rejects a bank account without a name", async ({ api }) => {
  const res = await bankAccounts.createBankAccount(api, { accountNumber: "1234567890", routingNumber: "123456789" } as any);
  expect(res.status).toBe(422);
});
```

## UI helpers

All take `page` first. The most used:

| Helper | Use |
|---|---|
| `bySel(page, "signin-submit")` | locate by `data-test` (the selector contract) |
| `bySelLike(page, "transaction-item")` | `data-test` prefix match |
| `loginViaForm(page, user, pw)` / `loginByXstate(page, user)` | log in through the form / fast through the app's auth service |
| `goToSideNav(page, "bankaccounts")` | navigate (handles the mobile drawer) |
| `waitForApi(page, { method, path })` | wait for a response — **start it before the action** |
| `stubApi` / `transformApi` | fake or tweak an API response ([09 Mocks](09-mocks-and-stubs.md)) |
| `fillAndBlur`, `typeThenClear` | Formik validates on blur |

```ts
import { test, expect } from "@fixtures/ui";
import { loginByXstate, goToSideNav, bySel, bySelLike, waitForApi } from "@ui";

test("deletes a bank account", async ({ page, users }) => {
  await loginByXstate(page, users[0].username);
  await goToSideNav(page, "bankaccounts");
  const deleted = waitForApi(page, { method: "POST", path: "/graphql", graphqlOperation: "DeleteBankAccount" });
  await bySel(page, "bankaccount-delete").first().click();
  await deleted;
  await expect(bySelLike(page, "list-item").first()).toContainText("Deleted");
});
```

## Running tests

From `playwright/` (start the app first with `/tap-run` or `yarn dev`):

```bash
npx playwright test                                  # all projects
npx playwright test --project=api                    # one project
npx playwright test tests/ui/auth.spec.ts -g "invalid user" --project=ui-desktop
npx playwright test --project=ui-desktop --headed    # watch the browser
npx playwright test --repeat-each=2 tests/api/users.api.spec.ts   # flake check (gate 4)
npm run typecheck                                    # tsc --noEmit
npm run report                                       # open the HTML report
```

Or ask: `/tap-run-tests mobile "bank account"` — you get a summary and triage instead of logs.

## Debugging in VS Code (Playwright Test extension)

1. Install **Playwright Test for VS Code**. Open the **Testing** sidebar (flask icon).
2. If tests do not appear, open the Playwright section and make sure `playwright/playwright.config.ts`
   is selected as a config, and tick the `api`, `ui-desktop`, `ui-mobile`, `e2e` projects.
3. Click ▶ next to a test to run it; right-click ▶ → *Debug Test* to stop on breakpoints.
4. Tick **Show browser** to watch UI tests; use **Pick locator** to hover the app and get a locator
   (prefer turning it into `bySel(page, "<data-test>")`).
5. Tick **Show trace viewer** or open a trace after a failure.

## Trace viewer

Traces are kept on failure (`trace: "retain-on-failure"`). Open one:

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

The trace shows every action, a DOM snapshot before/after it, network calls, console logs and the
source line. It is the fastest way to answer "what did the page look like when it failed?".

## Writing a new test — checklist

1. Pick the project: API behaviour → `tests/api`; user-visible behaviour → `tests/ui`; multi-step journeys → `tests/e2e`.
2. Import `test`/`expect` from `@fixtures/api` or `@fixtures/ui` (never from `@playwright/test` directly).
3. Set up data through the API or `db`, not through the UI (unless the UI is what you test).
4. Locate with `bySel` (`data-test`). If an element has none, ask `fe-dev` to add one.
5. Start `waitForApi` **before** the click that triggers the request. Never `waitForTimeout`.
6. Assert the outcome (status, body, visible text), including at least one negative case.
7. Run it twice (`--repeat-each=2`) and `npm run typecheck`.

Or: `/tap-new-test ui "<description>"` and review what `ui-automation` writes.

## Cypress → Playwright mapping (summary)

| Cypress | Playwright here |
|---|---|
| `cy.task("db:seed")` | `seed` auto-fixture |
| `cy.database("filter", …)` | `db.filter(entity, query)` |
| `cy.getBySel(id)` | `bySel(page, id)` |
| `cy.intercept().as("x")` + `cy.wait("@x")` | `const r = waitForApi(page, m); await action; await r` |
| `cy.intercept(url, { fixture })` | `stubApi(page, matcher, json)` |
| `cy.loginByXstate` | `loginByXstate(page, username)` |
| `beforeEach` + `ctx` | typed fixtures via `test.extend` |

Full table: [playwright/README.md](../../playwright/README.md#cypress--playwright-mapping).

## Contract tests

`playwright/tests/api/contract.api.spec.ts` (owned by `contract-guardian`) loads
`tap26/openapi/openapi.json`, compiles response schemas with AJV and checks that real responses match
the spec. They test **shape**, not behaviour. See [08 API contract](08-api-contract-and-swagger.md).

## Accessibility tests

`playwright/tests/ui/a11y.spec.ts` (owned by `a11y-auditor`) runs axe-core (`@axe-core/playwright`) per
screen with WCAG 2.2 AA tags and fails on serious/critical violations. Run `/tap-a11y <screen>` for a
full audit including manual keyboard and focus checks.

## Known issues: assert what *should* happen, then fix deliberately

The app has verified defects listed in `tap26/knowledge/known-issues.md` (KI-01…KI-33 plus
A11Y-01…A11Y-04 and test-suite issues TS-01/TS-02). The OpenAPI spec documents what the API *actually*
does. Tests follow decision **D-005**:

1. Assert the **correct** behaviour, never the buggy one.
2. Mark the test as an expected failure with the catalogue id: `test.fail(true, "KI-xx: <summary>")`
   (a new defect without a KI row uses its bug report id, `BUG-###`).

Reference example, KI-33 in `playwright/tests/ui/mocked-states.spec.ts` (test *"tells the user when the
public feed fails to load (KI-33)"*):

```ts
test("tells the user when the public feed fails to load (KI-33)", async ({ page, users }) => {
  test.fail(true, "KI-33: a 500 on the public feed renders the empty state with no error message");
  await stubServerError(page, feedMatcher("public"));
  // … log in and wait for the 500 …
  // Correct behaviour: an error is shown instead of the "you have no transactions" empty state.
  await expect(bySel(page, "alert-bar-error")).toBeVisible({ timeout: 3_000 });
});
```

The report shows it as *expected to fail*. When you fix the KI (`/tap-change-api fix KI-xx …`), the test
starts passing, Playwright flags it, and you remove the `test.fail` line, update the spec and mark the
row ✅. Never "fix" a red test by quietly changing its
assertion to match a bug.

## Mocks in tests

Use `stubApi` for states the real API can't easily produce (empty lists, 500s) and factories from
`playwright/src/mocks/` for data. Never stub the thing a test claims to verify. See
[09 Mocks & stubs](09-mocks-and-stubs.md).

> **Try it** — Run `npx playwright test tests/ui/auth.spec.ts --project=ui-desktop` from `playwright/`,
> break one assertion on purpose, run again, and open the trace. Then undo your change.

Labs: [Lab 05 — First API test](../labs/lab-05-first-api-test.md) · [Lab 06 — First UI test](../labs/lab-06-first-ui-test.md).
