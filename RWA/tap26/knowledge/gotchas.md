> **Purpose:** Practical pitfalls when running, changing or testing the Real World App, each with the reason and the fix. API defects are referenced by their `KI-xx` id in [known-issues.md](known-issues.md) rather than repeated.
> **Last verified:** 2026-10-16 (code reading plus live checks on :3000/:3001: curl, a read-only Playwright probe, and an isolated copy of `database.ts` for mutating checks)

# Gotchas

Legend: ✅ verified live · 📖 verified by reading code · ⏱ timing is approximate

## Environment and running

| # | Gotcha | Why | What to do |
|---|---|---|---|
| E-01 | **Node 22 is required** (`.nvmrc` 22.20.0, `engines: ^22 \|\| ^24`) 📖 | Vite 8, ESLint 10 and the current deps need it. This machine runs v22.22.0 | `nvm use`, or install Node 22 |
| E-02 | **Yarn 1 classic for the root, npm for `playwright/`** 📖 | root `packageManager: yarn@1.22.22`. `playwright/` has its own `package-lock.json` | `yarn install` at the root, `npm ci` in `playwright/` |
| E-03 | `CYPRESS_INSTALL_BINARY=0 yarn install` skips the ~500 MB Cypress binary ✅ (no `~/.cache/Cypress` here) | TAP26 tests use Playwright | Cypress commands (`yarn cypress:*`) will not run until you install the binary (`npx cypress install`) |
| E-04 | `yarn dev` **reseeds the DB on start** 📖 | `predev` runs `db:seed:dev` | Manual data does not survive a restart of `yarn dev` |
| E-05 | Backend edits restart the API through **nodemon** (watches `backend/` only) ⏱ | `nodemon → yarn tsnode → nyc → ts-node` recompiles. Expect a few seconds of `ECONNREFUSED` | Poll `GET http://localhost:3001/` before testing. Edits in `src/models` or `src/utils`, which the backend imports, do **not** trigger a restart |
| E-06 | **An API restart logs everyone out on the server** 📖 | express-session default **MemoryStore** | Log in again, or let tests log in per test |
| E-07 | **Stale UI login**: after E-06 (or cleared cookies) the UI still looks logged in, with empty lists and no redirect ✅ | `authService` state is rehydrated from `localStorage.authState`. Every call returns 401 and the machines go to `failure` | Log out (`sidenav-signout`), or run `localStorage.removeItem("authState")` and reload |
| E-08 | **Editing `data/database.json` by hand has no effect** 📖 | lowdb reads the file once and keeps state in memory. The next write overwrites your edit | Use `POST /testData/seed`, or the API |
| E-09 | `data/database.json` is **git-tracked** ✅ (`git status` shows ` M data/database.json`) | every write rewrites it | `git checkout data/database.json` before committing (or reseed) |
| E-10 | `yarn test:unit` is **watch mode**. Use `yarn test:unit:ci` 📖 | `vitest` vs `vitest --run` | Vitest specs call `seedDatabase()` and write `data/database.json` from their own process. The running API does not see those writes and overwrites them (E-08) |
| E-11 | `yarn db:seed` **regenerates** the seed with faker 📖 | new users, ids and amounts. Breaks memory facts, docs and hard-coded data | Use `yarn db:seed:dev` or `POST /testData/seed` to reset. Ask before regenerating |
| E-12 | Port 3001 busy → the API silently starts on another port 📖 | `getBackendPort()` uses `detect-port` | The UI still calls 3001. Free the port and don't change ports |
| E-13 | Third-party auth needs **three** steps 📖 | the `VITE_*` flag via `yarn dev:<provider>`, credentials in `.env`, and swapping `src/index.tsx` for `src/index.<provider>.tsx` | See [app-architecture.md §7](app-architecture.md#7-authentication) |
| E-14 | `/testData/*` exists only when `NODE_ENV` is `development` or `test` 📖 | `app.ts` | `yarn dev` sets development. A plain `ts-node backend/app.ts` has no seed endpoint |

## Network, CORS and API

| # | Gotcha | Why | What to do |
|---|---|---|---|
| N-01 | **Browser calls from any origin other than :3000 fail** ✅ | CORS always answers `Access-Control-Allow-Origin: http://localhost:3000` with credentials | Swagger UI uses its same-origin proxy (`swagger-server.mjs`, :3100 → `/api/*`). curl and Playwright's `request` are unaffected |
| N-02 | **The UI cannot be pointed at the mock server** (:3101) | the backend URL is built from `VITE_BACKEND_PORT` at Vite start and CORS is fixed | The mock server is for API exploration and demos. UI tests stub with `stubApi`/`transformApi` |
| N-03 | **`amount` in `POST /transactions` is whole dollars**: stored ×100 and truncated (`12.75` → 1200 cents). Everything else, including `POST /users` `balance`, is cents ✅📖 | `toInt()` + `× 100` | KI-18. Compare with `formatCents` (`playwright/src/utils/money.ts`) |
| N-04 | **Rejecting a request still moves the money** (and so does every repeated PATCH) ✅ (isolated copy) | `updateTransactionById` checks "is it a request?", not the new status | KI-05. Don't build tests that assume balances are unchanged after a reject, unless you write it as a `test.fail` |
| N-05 | Public feed: page 1 = 5 contacts' items + public items 0–4. Page 2 starts at public item **10**, so items 5–9 never appear ✅ | page 1 concatenates, later pages don't offset | KI-20 (totalPages) plus this gap. Don't assert "page 2 continues page 1" |
| N-06 | `limit` is capped at **50** ✅ | express-paginate default `maxLimit` | Page through larger sets. KI-19 |
| N-07 | Filters need **both** bounds. The amount max is **exclusive**. Unknown query params filter everything out 📖 | `hasDateQueryFields`, lodash `inRange`, query spread into lowdb `filter` | KI-21, KI-22. Use `dateRangeStart`/`dateRangeEnd`, not the validated-but-unused `rangeStartTs` |
| N-08 | No 404s. An unknown id gives a **500 HTML stack trace** or `200 {}`, and some routes touch the **wrong record** ✅ | no error middleware. lodash `find(undefined)` | KI-01…03, KI-10. Never "probe" with fake ids against shared data |
| N-09 | `GET /notifications` returns **unread only** 📖 | `getUnreadNotificationsByUserId` | Dismissed items disappear for good |
| N-10 | Likes and comments notify **both** parties, even yourself ✅ (isolated copy) | `\|\|` instead of `&&` | KI-24. Count notifications carefully |
| N-11 | GraphQL "succeeds" (200) when logged out, with an `errors` array ✅ | no HTTP auth on `/graphql` | KI-09. Check `body.errors`, not only the status |
| N-12 | The bank-account UI uses **GraphQL**, not REST 📖 | `bankAccountsMachine` | Wait for `POST /graphql` with `operationName` `ListBankAccount` / `CreateBankAccount` / `DeleteBankAccount` (`waitForApi(..., { graphqlOperation })`) |
| N-13 | `/login` failures are **plain text** (`Unauthorized` 401, `Bad Request` 400). `/logout` returns **302** ✅ | passport defaults | KI-13, KI-14. Don't `JSON.parse` blindly. Playwright `http.ts` falls back to text |

## Data

| # | Gotcha | Why | What to do |
|---|---|---|---|
| D-01 | **Shared DB ⇒ serial tests** 📖 | one JSON file and one in-memory state for every client | `workers: 1` (D-002). Never run two suites, or Cypress and Playwright, at the same time |
| D-02 | **Seeding wipes manual data**, for everyone ✅ | each Playwright/Cypress test calls `POST /testData/seed` | Warn students before running tests. Recreate demo data afterwards |
| D-03 | For requests, **`senderId` is the requester** (who gets paid) 📖 | naming | Read [data-model.md](data-model.md#sender-and-receiver-the-naming-trap) |
| D-04 | Seeded contacts are **one-directional** 📖 | A→B rows only | "Friends" of A ≠ users who have A as a contact |
| D-05 | Seeded combos the API never produces (`pending` payments, 135 of them) 📖 | the generator picks status at random | Don't treat them as reachable states in UI tests |
| D-06 | **Privacy is not enforced** in the Friends feed or in the 5 contact items of the Everyone feed (✅ a `private` item on Heath93's page 1) | no filter on contacts' transactions | Ask the BA for the intended rule before asserting it |
| D-07 | Soft-deleted bank accounts are still returned and listed "(Deleted)" 📖 | `getBankAccountsByUserId` doesn't filter `isDeleted` | Filter yourself in assertions. Deleting the last account does not reopen onboarding |
| D-08 | User payloads include the **bcrypt hash** ✅ | KI-07 | Never print them in reports |

## UI and test automation

| # | Gotcha | Why | What to do |
|---|---|---|---|
| U-01 | **`data-test` sits on the MUI wrapper for some fields and on the `<input>` for others** 📖 | `<TextField data-test>` vs `inputProps` | Use `textbox(page, …)` or see the cheat-sheet in [ui-map.md](ui-map.md#selector-placement-cheat-sheet-mui-textfield) |
| U-02 | **Formik validates on blur/change.** Typing without blurring shows no error. The Sign Up link can move when blur validation fires (L-002) 📖 | Formik defaults | `fillAndBlur`, `typeThenClear`, `touch` (`playwright/src/ui/forms.ts`). `openSignUp` retries with `toPass()` |
| U-03 | The New Transaction buttons start **disabled** 📖 | `validateOnMount` + required fields | Fill both fields before clicking |
| U-04 | **Feeds are virtualised** (react-virtualized): only visible rows are in the DOM. Infinite scroll loads the next page near the bottom 📖 | `TransactionInfiniteList` | Count from the API response (`waitForFeed`), not DOM rows. Use `scrollFeedToBottom` or `fetchFeedPage` |
| U-05 | Re-clicking the **already selected tab doesn't refetch** (L-003) | same route, no remount | Reload, or start from another tab |
| U-06 | **Dates are UTC**: the date filter reuses the picked local day as a UTC day and compares `createdAt` 📖 | `localDateToUTCISOString` | Run browser and Node in UTC (`playwright.config.ts` does). Pick days by `aria-label` |
| U-07 | **Amount slider 0–100 = $0–$1,000** in $10 steps. The query is in cents (`amountMin=v×1000`) 📖 | `padAmountWithZeros` | `setAmountRange(page, minDollars, maxDollars)` uses keyboard steps. Cypress hacks the React fiber (`setTransactionAmountRange`) |
| U-08 | **Mobile layout starts below 600 px, the tests' `isMobile()` below 414 px** ✅ (drawer temporary at 599, persistent at 600) | MUI `xs` vs `mobileViewportWidthBreakpoint: 414` | Use 375 (mobile) or ≥ 600 (desktop) viewports. 414–599 is untested no-man's land |
| U-09 | **At 375 px the mobile drawer covers the backdrop's centre**, so a plain backdrop click hits the drawer (L-001) 📖 | 240 px drawer | `closeSideNavOnMobile` clicks the backdrop's right edge. Helpers are idempotent |
| U-10 | Notification "Dismiss" has **no text on mobile** (icon button) ✅ | `xsBreakpoint` branch | Select by `notification-mark-read-{id}`, not by text |
| U-11 | **App services are on `window` only if `window.Cypress` is truthy** before the bundle runs. `createTransactionService` exists only on `/transaction/new` ✅ | guards in `App.tsx` and the list components | Use the `page` fixture (`exposeAppServices`) plus `waitForService(page, name)` |
| U-12 | "Transaction Submitted!" and step 3 appear **before** the API answers. API errors are swallowed 📖 | snackbar in `onSubmit`. The child machine is stopped when the parent leaves `stepTwo` | Assert on the `POST /transactions` response (`waitForApi`), not on the snackbar alone |
| U-13 | The snackbar auto-hides after **3 s** 📖 | `snackbarMachine` `after: 3000` | Assert right after the action. Don't wait first |
| U-14 | An unknown route or unknown transaction id gives a **blank content area**, with no error page ✅ | no catch-all route. Detail machine `failure` renders nothing | Assert on the absence of content, or on the API status |
| U-15 | Sign-up does **not** log you in. It returns to `/signin` 📖 | `performSignup` → `history.push("/signin")` | Log in after sign-up. New users see onboarding |
| U-16 | Comment form: **Enter submits**, there is no button, empty comments are allowed 📖 | `CommentForm` | `fill` + `press("Enter")`, then wait for `POST /comments/{id}` |
| U-17 | `transaction-item-{id}` exists on **both** the feed row and the detail wrapper. `bySelLike("new-transaction")` matches the top-bar button **and** the step-3 buttons 📖 | naming | Scope locators, or use `.first()` deliberately |
| U-18 | Cypress-only `cy.visualSnapshot` (Percy) has no Playwright counterpart | not ported | Use `toHaveScreenshot()` if needed |
| U-19 | Playwright `ui-mobile` keeps the desktop Chrome engine (`isMobile: false`), only the viewport changes 📖 | mirrors Cypress | No touch events or mobile UA. Real-device behaviour is untested |

## Tooling

| # | Gotcha | What to do |
|---|---|---|
| T-01 | `yarn lint` only lints `**/*.ts`, not `.tsx` (`eslint.config.mjs`). Prettier still checks `.tsx` | Run `yarn types` too |
| T-02 | No git hooks run (husky 7 ignores the `package.json` `husky` field, and `.husky/` has no hook scripts) | Run checks yourself before committing |
| T-03 | `pkill -f <pattern>` can kill your own shell (L-005) | Kill by PID, or use `pgrep -f "[p]attern"` |
| T-04 | `knowledge/generated/*` is overwritten by `scan-app.mjs` | Edit curated files only |
