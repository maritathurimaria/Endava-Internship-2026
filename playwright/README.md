# Real World App – Playwright framework

Functional Playwright + TypeScript test framework for the [Cypress Real World App](../README.md).
It's a port of the app's Cypress suite (`cypress/tests/api` and `cypress/tests/ui`). It uses plain functions and fixtures instead of classes or page objects.

## Quick start

```bash
# 1. Start the app (from the project root, in another terminal)
yarn dev                       # UI on :3000, API on :3001

# 2. Install and run the tests (from this folder)
cd playwright
npm install
npx playwright install chromium
npm test                       # api + ui-desktop + ui-mobile + ui-tablet + e2e
npm run test:ui:tablet         # UI specs at 500×800 (tablet breakpoint)
```

| Script | What it runs |
| --- | --- |
| `npm run test:api` | API specs only (no browser) |
| `npm run test:ui` | UI specs at 1280×1000 |
| `npm run test:ui:mobile` | UI specs at 375×667 (mobile layout) |
| `npm run test:ui:tablet` | UI specs at 500×800 (tablet-width layout) |
| `npm run test:headed` | Desktop UI specs in a visible browser |
| `npm run test:e2e` | End-to-end journeys (`tests/e2e`) |
| `npm run test:contract` | OpenAPI contract tests |
| `npm run test:a11y` | Accessibility scans (axe) |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier over src, tests and config |

Run one spec or test: `npx playwright test tests/ui/auth.spec.ts -g "invalid user" --project=ui-desktop`.

> ⚠️ **Every test reseeds the app database** (`POST /testData/seed`), exactly like the Cypress suite.
> Running the tests against your instance resets it to the seed data.

## Configuration

Copy `.env.example` to `.env` to override defaults:

| Variable | Default | Notes |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | Frontend |
| `API_URL` | `http://localhost:3001` | Backend |
| `SEED_DEFAULT_USER_PASSWORD` | `s3cret` | Password of every seeded user |
| `PAGINATION_PAGE_SIZE` | `10` | Must match the app's `.env` |

## Layout

```
playwright/
├── playwright.config.ts      projects: api, ui-desktop, ui-mobile, ui-tablet, e2e · workers: 1 · UTC
├── src/
│   ├── config/env.ts         frozen runtime config
│   ├── types/models.ts       domain types (User, Transaction, …)
│   ├── api/                  HTTP layer + one function per backend route
│   │   ├── http.ts           send/get/post/patch/del → frozen { status, ok, body, headers }
│   │   ├── endpoints.ts      every route in one place
│   │   ├── testData.ts       seedDatabase, filterEntity, findEntity, dbFor()
│   │   ├── contract.ts       loadContract, validateResponse (AJV vs tap26/openapi/openapi.json)
│   │   ├── auth.ts users.ts transactions.ts bankAccounts.ts (REST + GraphQL) social.ts
│   ├── ui/                   browser helpers (all take `page` as first argument)
│   │   ├── selectors.ts      bySel / bySelLike / textbox / helperText
│   │   ├── network.ts        waitForApi, waitForApiJson, stubApi, transformApi, recordApi
│   │   ├── app.ts            exposeAppServices, sendToService, isMobile, alertBar…
│   │   ├── auth.ts           loginViaForm, loginByXstate, logoutByXstate, switchUser, signUpViaForm
│   │   ├── navigation.ts     goToSideNav, signOut, mobile drawer helpers
│   │   ├── forms.ts          typeThenClear, fillAndBlur, touch (Formik validates on blur)
│   │   ├── transactions.ts   feeds, pagination, createTransactionViaApp, pickDateRange, setAmountRange
│   │   └── a11y.ts           scanA11y (axe-core, attaches JSON), newViolations, describeViolations
│   ├── mocks/                test doubles (`@mocks`)
│   │   ├── factories.ts      buildUser, buildTransaction(ResponseItem), buildBankAccount, buildNotification, buildList, buildPage
│   │   └── stubs.ts          stubEmptyFeed, stubFeed, stubServerError, stubLatency, stubNotifications, stubBankAccounts, withScenario
│   ├── utils/                fp.ts (pipe, matches, intersection…), money.ts, dates.ts
│   └── fixtures/             index.ts (api, seed, db, page) · api.ts (users, me) · ui.ts (users)
├── tests/
│   ├── api/                  users, transactions, bankaccounts, social, testdata, contract
│   ├── ui/                   auth, bankaccounts, new-transaction, notifications,
│   │                         transaction-feeds, transaction-view, user-settings,
│   │                         mocked-states (stubs + factories), a11y (axe-core, @a11y)
│   └── e2e/                  *.e2e.spec.ts cross-layer journeys (`e2e` project, D-006), e.g. pay-a-friend
└── test-data/public-transactions.json   stubbed public feed (from cypress/fixtures)
```

## Functional design

- **No classes or page objects.** Each helper is a standalone function that takes its dependency as the first argument, e.g. `createTransaction(http, payload)` or `pickDateRange(page, start, end)`. Specs compose these functions.
- **Data, not clients.** API calls resolve to frozen result objects, so assertions read `res.status` / `res.body`. Calls never throw on an HTTP status; checking the status is the test's job. For setup code that should fail fast, use `bodyOrThrow`.
- **Fixtures replace mutable hooks.** Cypress specs fill a `let ctx = {}` in `beforeEach`. Here each spec extends `test` with a typed fixture (e.g. `ctx`, `seedIds`, `user`) that builds the value and hands it to the test. Fixtures every test needs are marked `{ auto: true }`.
- **Partial application where it helps.** `dbFor(http)` binds the test-data helpers to one request context, and `matches(partial)` builds a predicate like lodash's `_.matches`.

## Cypress → Playwright mapping

| Cypress | Here |
| --- | --- |
| `cy.task("db:seed")` | `seed` auto-fixture (runs before every test) |
| `cy.database("filter" \| "find", entity, query)` | `db.filter(entity, query)` / `db.find(entity, query)` |
| `cy.getBySel` / `cy.getBySelLike` | `bySel(page, id)` / `bySelLike(page, fragment)` |
| `cy.intercept(...).as()` + `cy.wait("@x")` | `const r = waitForApi(page, matcher); …action…; await r` |
| `cy.intercept(url, { fixture })` | `stubApi(page, matcher, json)` |
| `cy.intercept(url, req => req.continue(res => …))` | `transformApi(page, matcher, body => …)` |
| `cy.login` | `loginViaForm(page, username, password, { rememberUser })` |
| `cy.loginByApi` | `auth.login(http, username)` |
| `cy.loginByXstate` / `logoutByXstate` / `switchUserByXstate` | `loginByXstate` / `logoutByXstate` / `switchUser` |
| `cy.createTransaction` | `createTransactionViaApp(page, draft)` |
| `cy.nextTransactionFeedPage` | `fetchFeedPage(page, feed, n)` |
| `cy.pickDateRange` | `pickDateRange(page, start, end)` |
| `cy.setTransactionAmountRange` (React-fiber hack) | `setAmountRange(page, min, max)` (real keyboard input on the slider) |
| `isMobile()` | `isMobile(page)` + the `ui-mobile` project |

### Notes and deliberate differences

- **Programmatic hooks.** The app attaches its XState services to `window` only when `window.Cypress` is truthy. The `page` fixture sets that flag before the app loads (`exposeAppServices`), so these tests get the same fast-login and data-setup hooks as the Cypress suite.
- **Serial runs.** Tests run with `workers: 1` because all of them share one JSON database.
- **UTC everywhere.** Both Node and the browser run in UTC, matching the app's date handling, so date-range assertions don't depend on the machine's timezone.
- **Date picker.** Days are clicked by their exact `aria-label` (e.g. "August 1, 2025"), so a greyed-out day from the neighbouring month is never picked by mistake.
- **Visual snapshots.** The Percy `cy.visualSnapshot` calls aren't ported. To add visual checks, use Playwright's `expect(page).toHaveScreenshot()`.
- **Auth-provider specs.** The Auth0/Okta/Cognito/Google specs need real third-party credentials and aren't included.

## Adding a test

```ts
import { test, expect } from "@fixtures/ui";
import { loginByXstate, goToSideNav, bySel } from "@ui";

test("shows the bank accounts page", async ({ page, users }) => {
  await loginByXstate(page, users[0].username);
  await goToSideNav(page, "bankaccounts");
  await expect(bySel(page, "bankaccount-list")).toBeVisible();
});
```

Path aliases (`@api`, `@ui`, `@mocks`, `@fixtures/*`, `@utils/*`, `@config`, `@models`) are defined in `tsconfig.json`; Playwright resolves them natively. `tsconfig.json` also pins `"types": ["node"]` so stray `@types/*` packages from the app's root `node_modules` don't leak into the typecheck.

## End-to-end journeys (`@e2e`)

Cross-layer user stories live in `tests/e2e/*.e2e.spec.ts` and run in their own `e2e` project
(desktop viewport, 120 s timeout). A journey mixes UI steps with API/data checks and uses `test.step`
so the report reads like the story. Reference: `tests/e2e/pay-a-friend.e2e.spec.ts`
(Alice pays Bob → balances move → Bob is notified → Bob likes and comments → Alice is notified).

```bash
npm run test:e2e          # = npx playwright test --project=e2e
```

## Mocks: factories and stubs (`@mocks`)

Use them for UI states the seeded API can't easily produce: empty lists, errors, slow responses. Auth and everything you don't stub stay real.

- **Factories** are pure and deterministic. Ids, uuids and timestamps come from `seq` (default 1), so `buildUser({}, 2).id === "usr00002"`. Overrides always win, so assert on the values you pass in. `buildList(buildBankAccount, 3, (i) => ({ bankName: names[i] }))` builds seq 1…3, and `buildPage(items, { page: 2 })` builds a `{ pageData, results }` body. Amounts are in cents and dates are UTC ISO strings.
- **Stubs** take `page` first and must be registered **before** the action that sends the request:

```ts
import { buildList, buildNotification, stubBankAccounts, stubLatency, stubNotifications, stubServerError, withScenario } from "@mocks";
import { feedMatcher } from "@ui";

await stubNotifications(page, buildList(buildNotification, 3, { kind: "comment" }));
await stubServerError(page, feedMatcher("public"));           // 500 + JSON error
await stubLatency(page, feedMatcher("public"), 2_000);        // delay, then the real API (or an earlier stub)
await stubBankAccounts(page, []);                             // GraphQL ListBankAccount via transformApi
await withScenario("new-user-onboarding")(page);              // a tap26/mocks/scenarios/*.json file as stubs
```

The scenario files are shared with the mock server (`node tap26/scripts/mock-server.mjs`, see `tap26/mocks/README.md`), so one named state works in both places. `tests/ui/mocked-states.spec.ts` shows each helper. One behaviour worth knowing: when the public feed returns 500, the UI shows the same "No Transactions" empty state as an empty feed, with no error message.

## Contract tests

`tests/api/contract.api.spec.ts` calls the main GET endpoints as `users[0]` and checks the status and the body against the response schema in `tap26/openapi/openapi.json`. It is data-driven: add a row to `cases` to cover another operation.

```ts
const contract = loadContract();                                   // @api/contract
const verdict = validateResponse(contract, "GET", "/users/{userId}", res.status, res.body);
expect(verdict.errors, verdict.summary).toEqual([]);               // readable "/user/balance must be integer …"
```

The validator registers the spec's `components` as a single AJV schema, so `#/components/...` refs resolve. It accepts OpenAPI 3.0's `nullable`, ignores `example` (`strict: false`) and treats an undocumented status as a violation. The spec documents the API's *actual* behaviour (for example, the password hash in user objects, KI-07). So a failure here means the spec and the API have drifted apart, and the fix belongs with `contract-guardian`.

## Accessibility tests (`@a11y`)

`tests/ui/a11y.spec.ts` runs axe-core (WCAG 2.x A/AA tags) on sign-in, sign-up, the home feed, new transaction, bank accounts, notifications and user settings, on both viewports. Each test attaches its full results as `axe-<screen>.json` in the HTML report, and it fails only on **new** `critical` violations. Rule ids the app already violates are listed in `KNOWN_CRITICAL`. As of 2026-10-16 that list holds only `aria-required-children` (the react-virtualized feed grid). Run only these tests with `npx playwright test --grep @a11y`.
