> **Purpose:** Traceability from app features to the tests that cover them (Cypress e2e/API/component, Playwright api/ui, Vitest), plus known gaps as ideas for students.
> **Last verified:** 2026-10-16 (test titles read from `cypress/tests/**`, `src/**/*.cy.tsx`, `src/**/__tests__`, `playwright/tests/**`. Playwright last run: passed, per `playwright/test-results/.last-run.json` and memory)

# Test map

The full, always-current list of spec files and titles is `generated/tests-inventory.md`. Route and selector coverage is
`generated/coverage-matrix.md`. This page groups tests **by feature** and lists what is missing.

**Paths:** Cypress e2e = `cypress/tests/ui/*.spec.ts`, Cypress API = `cypress/tests/api/api-*.spec.ts`,
Cypress component (CT) = `src/**/*.cy.tsx`, Playwright API = `playwright/tests/api/*.api.spec.ts`, Playwright UI =
`playwright/tests/ui/*.spec.ts` (each runs in **ui-desktop** and **ui-mobile**), Vitest = `src/__tests__/*.test.ts`
(these call `backend/database.ts` **directly** against `data/database.json`).

Playwright titles mirror the Cypress titles one-to-one unless noted (Playwright API titles are often prefixed with
`METHOD /path`).

## Suites at a glance

| Suite | Command | Count (titles) | Notes |
|---|---|---|---|
| Playwright `api` | `cd playwright && npx playwright test --project=api` | 55 tests | 5 spec files. Adds checkAuth/logout and invalid-password tests that Cypress lacks |
| Playwright `ui-desktop` / `ui-mobile` | `--project=ui-desktop` / `--project=ui-mobile` | 59 tests each | 7 spec files. Same specs, 2 viewports |
| Playwright `e2e` | `--project=e2e` | – | decided in **D-006** (`tests/e2e/*.e2e.spec.ts`), not created yet |
| Cypress e2e + API | `yarn cypress:run` (needs the Cypress binary) | 9 API + 7 UI specs | percy `visualSnapshot` calls. Mobile via `yarn cypress:run:mobile` |
| Cypress auth providers | `cypress/tests/ui-auth-providers/*` | 4 specs | need real Auth0/Okta/Cognito/Google accounts, **not ported** |
| Cypress component | `yarn cypress:run:component` | 5 specs | `AlertBar`, `SignInForm`, `TransactionDateRangeFilter`, `TransactionTitle`, `TransactionsContainer` |
| Vitest | `yarn test:unit:ci` | 8 files + `src/utils/__tests__/transactionUtils.test.ts` | DB-level logic. `generateSeedData.test.ts` is `describe.skip`. Two bank-transfer tests are `it.skip` |

## Feature ↔ test traceability

### Authentication

| Behaviour | Cypress | Playwright | Vitest / CT |
|---|---|---|---|
| Unauthenticated user → `/signin` | ui/auth "should redirect unauthenticated user to signin page" | ui/auth.spec.ts same title | – |
| Login → home | ui/auth "should redirect to the home page after login" | same | CT `SignInForm.cy.tsx` "submits the username and password to the backend" |
| Remember me (30-day cookie) | ui/auth "should remember a user for 30 days after login" | same | – |
| Login form validation | ui/auth "should display login errors" | same | – |
| Invalid user / invalid password | ui/auth "should error for an invalid user", "…invalid password for existing user" | same + api/users "POST /login › rejects an invalid password" | – |
| API login | api-users "POST /login › logs in as a user" | api/users "logs in as a user" | – |
| checkAuth / logout API | – | api/testdata "Auth API › GET /checkAuth returns the logged-in user", "POST /logout ends the session" | – |
| Third-party providers | ui-auth-providers/{auth0,okta,cognito,google}.spec.ts | – | – |

### Sign-up and onboarding

| Behaviour | Cypress | Playwright |
|---|---|---|
| Sign-up → login → onboarding (create bank account) → logout | ui/auth "should allow a visitor to sign-up, login, and logout" | ui/auth.spec.ts same title |
| Sign-up form validation | ui/auth "should display signup errors" | same (parameterised per field) |
| Onboarding when the user has no bank accounts | ui/bankaccounts "renders an empty bank account list state with onboarding modal" | ui/bankaccounts.spec.ts same |
| Create user API (incl. balance in cents, invalid field) | api-users "POST /users › creates a new user", "…with an account balance in cents", "errors when an invalid field sent" | api/users same titles |

### Users, search and settings

| Behaviour | Cypress | Playwright | Vitest |
|---|---|---|---|
| List users / get user / invalid id / profile by username | api-users "GET /users…", "GET /users/:userId…", "GET /users/profile/:username…" | api/users same | – |
| Search by email / phone / username (API) | api-users "GET /users/search › gets users by email/phone number/username" | api/users "gets users by email/phoneNumber/username" | users.test.ts (5 search tests) |
| Search by attribute (UI, step 1) | ui/new-transaction "searches for a user by attribute" (per attr) | ui/new-transaction.spec.ts same | – |
| Settings form renders / validation / update | ui/user-settings (3 tests) | ui/user-settings.spec.ts (3 tests) | – |
| PATCH user API (+ invalid field) | api-users "PATCH /users/:userId…" | api/users same | – |

### Bank accounts (REST + GraphQL)

| Behaviour | Cypress | Playwright | Vitest |
|---|---|---|---|
| Create via UI | ui/bankaccounts "creates a new bank account" | same | bankaccounts.test.ts "should create a bank account for user" |
| Form validation | ui/bankaccounts "should display bank account form errors" | same | – |
| Soft delete via UI | ui/bankaccounts "soft deletes a bank account" | same | "should delete a bank account" |
| REST list/get/create/delete | api-bankaccounts (4 contexts; note the context title says "DELETE /contacts/:bankAccountId") | api/bankaccounts.api.spec.ts (4) | "should retrieve…" |
| GraphQL list/create/delete | api-bankaccounts "/graphql" (3) | api/bankaccounts "/graphql" (3) | – |
| Bank transfers list | api-banktransfers "gets a list of bank transfers for user" | api/social "GET /bankTransfers…" | transactions.test.ts withdrawal tests are **`it.skip`** |

### Transactions: create, request, accept, reject

| Behaviour | Cypress | Playwright | Vitest |
|---|---|---|---|
| Pay via UI (3-step flow) | ui/new-transaction "navigates to the new transaction form, selects a user and submits a transaction payment" | same | – |
| Request via UI | ui/new-transaction "…submits a transaction request" | same | – |
| Form validation | ui/new-transaction "displays new transaction errors" | same | – |
| Payment updates the receiver's balance | ui/new-transaction "submits a transaction payment and verifies the deposit for the receiver" | same | "should create a payment" |
| Request accepted by the receiver (balance) | ui/new-transaction "submits a transaction request and accepts the request for the receiver" | same | "should accept (update) a transaction" |
| Accept / reject on the detail page | ui/transaction-view "accepts a transaction request", "rejects a transaction request" | same | "should reject (update) a transaction" (checks the status only) |
| No buttons on a completed request | ui/transaction-view "does not display accept/reject buttons on completed request" | same | – |
| API create payment / request / PATCH / invalid field | api-transactions "POST /transactions…", "PATCH /transactions/:transactionId…" | api/transactions same | "should create a request", "…find it in the personal transactions" |

### Feeds: public / contacts / personal, filters, pagination

| Behaviour | Cypress (ui/transaction-feeds) | Playwright (ui/transaction-feeds.spec.ts) | API / Vitest |
|---|---|---|---|
| Drawer toggle and layout | "toggles the navigation drawer" | same | – |
| Item variations (paid/requested/charged, likes/comments counts) | "renders transactions item variations in feed" (stubbed with `public-transactions.json`) | same (`stubApi` + `playwright/test-data/public-transactions.json`) | – |
| Pagination per feed | "paginates ${feed} transaction feed" | "paginates public/contacts/personal transaction feed" | api-transactions "contacts, page one/two". Vitest "public transactions, default sort" |
| Date range filter (per feed) / out of range | "filters ${feed} transaction feed by date range", "does not show … out of range date limits" | same | api "pending request transactions … between a time range". Vitest "contacts - between date range". CT `TransactionDateRangeFilter.cy.tsx` (3) |
| Close date picker (mobile) | "closes date range picker modal" | "closes date range picker modal (mobile only)" | – |
| Amount range filter / out of range | "filters ${feed} … by amount range", "does not show … out of range amount limits" | same | – |
| Feed visibility rules | "mine feed only shows personal transactions", "first five items belong to contacts in public feed", "friends feed only shows contact transactions" | same | Vitest "…for a users contacts" |
| Empty / container rendering | – | – | CT `TransactionsContainer.cy.tsx` (4) |

### Likes, comments, notifications

| Behaviour | Cypress | Playwright | Vitest |
|---|---|---|---|
| Like on the detail page | ui/transaction-view "likes a transaction" | same | likes.test.ts (2) |
| Comment on the detail page | ui/transaction-view "comments on a transaction" | same | comments.test.ts (2) |
| Likes/comments API | api-likes (2), api-comments (2) | api/social "Likes API" (2), "Comments API" (2) | – |
| Like/comment notifications A→B, C→A+B | ui/notifications 4 "User A/C likes/comments…" tests | same titles | notifications.test.ts (7) |
| Payment / request notifications | ui/notifications "User A sends a payment to User B", "…payment request to User C" | same | – |
| Empty notifications | ui/notifications "renders an empty notifications state" | same | – |
| Notifications API (list, bulk, PATCH, invalid field) | api-notifications (4) | api/social "Notifications API" (4) | – |
| Contacts API (list, create, invalid id, delete) | api-contacts (4) | api/social "Contacts API" (4) | contacts.test.ts (5) |
| Test data API | api-testdata (per entity) | api/testdata (per entity + "rejects an unknown entity") | – |

### Units and components

| Area | Tests |
|---|---|
| `transactionUtils` (request detection, likes, query field helpers) | `src/utils/__tests__/transactionUtils.test.ts` (6) |
| AlertBar per severity | `src/components/AlertBar.cy.tsx` |
| TransactionTitle | `src/components/TransactionTitle.cy.tsx` |

## Known gaps: ideas for student labs

Each line names a concrete, checkable target. Write the test so it asserts the **correct** behaviour and mark it
`test.fail(true, "KI-xx: …")` (decision D-005). Use `BUG-###` for defects that are not catalogued yet.

| # | Gap | Why it matters | Suggested test |
|---|---|---|---|
| G-01 | **Rejecting a request moves money** (KI-05) | no test checks balances after a reject. Cypress, Playwright and Vitest only check the status | API: create a request, reject it, assert both balances are unchanged |
| G-02 | **Public feed skips items 5–9 of page 1** (verified: with limit 10, page 2 starts at public index 10) | infinite scroll silently hides 5 transactions. KI-20 covers only `totalPages` | API: union of pages 1+2 equals the first 15 items from `?limit=50` |
| G-03 | **Privacy not enforced** in the Friends feed and the contact items of the Everyone feed (`private` items shown) | product rule vs implementation | API: every Friends-feed item is non-private, or the BA writes the rule |
| G-04 | Authorization / IDOR (KI-04, KI-06): PATCH another user, read another user's bank account or transaction, PATCH a transaction you are not the receiver of | security | API matrix user A vs user B (`/tap-security`) |
| G-05 | Unknown-id behaviour (KI-01…03, KI-10): `DELETE /contacts/<unknown>` wipes all contacts | data integrity | API negative tests per id route |
| G-06 | Password hashes in responses (KI-07) | data exposure | API: `/login`, `/checkAuth`, `/users`, `/users/search` bodies have no `password` key |
| G-07 | Decimal and zero/negative amounts (KI-18) | money correctness | API + UI: `$5.75` → expect 575 cents |
| G-08 | Duplicate username sign-up (KI-15) | identity | API: second `POST /users` with the same username → 4xx |
| G-09 | GraphQL error cases: unauthenticated (KI-09), invalid variables, missing query (KI-27) | not covered at all | API tests on `/graphql` |
| G-10 | Self-like notifications (KI-24), double like via API | notification noise | API: like your own transaction → count notifications |
| G-11 | Optimistic "Transaction Submitted!" and step 3 when `POST /transactions` fails | UX error handling | UI: `stubApi(page, {method:"POST", path:"/transactions"}, {...}, 500)` → expect an error message (will fail today) |
| G-12 | Stale `localStorage.authState` after the server session is lost (API restart, cookie cleared) | blank feeds and no redirect | UI: clear cookies, reload, expect `/signin` |
| G-13 | Unknown route while logged in (blank page) and unknown transaction id (blank detail) | missing 404 UX | UI |
| G-14 | Viewports **414–599 px**: app layout is mobile, tests' `isMobile()` says desktop | the responsive breakpoint is untested | add a `ui-tablet` project (e.g. 500×800) or a param test |
| G-15 | Accessibility | no a11y tests exist | `@axe-core/playwright` scan per screen (`/tap-a11y`) |
| G-16 | Visual regression | Percy snapshots not ported | `toHaveScreenshot()` on stable screens |
| G-17 | XState machines have **no unit tests** (`authMachine` rehydration, `dataMachine` paging append, filters) | logic-heavy | Vitest with `interpret()` and mocked `httpClient` |
| G-18 | Vitest seed tests skipped (`generateSeedData.test.ts`), bank-transfer withdrawal `it.skip` | insufficient-funds path untested | un-skip and fix, or an API test: pay more than the balance → withdrawal transfer created, balance 0 |
| G-19 | Notifications "Dismiss" on mobile (icon button, no text) and badge count decrement | mobile-specific UI | UI mobile: dismiss → badge −1 |
| G-20 | Session cookie flags (no `SameSite`/`Secure`), hard-coded session secret, CORS always returning the :3000 origin | security posture | security report (`/tap-security`) |
| G-21 | Performance of feeds (`/transactions/contacts` builds all contacts' transactions per request) | scalability | `/tap-perf` smoke with `limit=50` |
| G-22 | User settings: no `defaultPrivacyLevel` control, new users without email/phone start with an invalid form | product gap | BA story + UI test |
