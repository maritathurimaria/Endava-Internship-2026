# Known issues in the Real World App API

Purpose: verified defects and surprising behaviours in the RWA backend — a ready-made catalogue for
bug reports, security exercises, negative tests and "fix it" labs. The app is a demo; these are
**not** fixed upstream. Per decision D-005, tests assert the **correct** behaviour and are marked
`test.fail(true, "KI-xx: …")` until a lab fixes the code (reference: KI-33 in `playwright/tests/ui/mocked-states.spec.ts`).
Last verified: 2026-10-16 against the running API (contract-guardian verification run, 35 operations,
135 checks). The OpenAPI spec (`tap26/openapi/openapi.yaml`) documents the *actual* behaviour.

Severity: 🔴 high · 🟠 medium · 🟡 low. "Lab idea" = good exercise for `/tap-bug`, `/tap-security`,
`/tap-new-test`, or a fix via `/tap-change-api`.

## Data integrity — unknown ids touch the wrong records
| # | Behaviour | Sev | Lab idea |
|---|---|---|---|
| KI-01 | `DELETE /contacts/{id}` with a well-formed but unknown id deletes **every** contact | 🔴 | Write a failing API test, then fix `removeContactById` in `backend/database.ts` |
| KI-02 | `PATCH /notifications/{id}` with an unknown id updates the **first** notification in the DB | 🔴 | Regression test + fix |
| KI-03 | `PATCH /users/{id}` with an unknown id updates the **first** user | 🔴 | Regression test + fix |

## Authorization (IDOR / mass assignment)
| # | Behaviour | Sev | Lab idea |
|---|---|---|---|
| KI-04 | `PATCH /users/{id}` lets any logged-in user edit **any** user, copying the whole body (incl. `balance`, `id`); a `password` is stored in plain text, so that user can no longer log in | 🔴 | `/tap-security` IDOR + mass-assignment exercise |
| KI-05 | `PATCH /transactions/{id}` doesn't check that the caller is the request's receiver. Sending `requestStatus: rejected` still moves the money and completes the request, and it does so again on every repeat call | 🔴 | Business-rule test; BA writes the correct acceptance criteria |
| KI-06 | Bank accounts, transactions and notifications by id are readable/changeable by any logged-in user | 🔴 | Security test matrix (user A vs user B resources) |
| KI-07 | User objects from `/login`, `/checkAuth`, `/users`, `/users/search`, `/testData/users` include the bcrypt **password hash** | 🟠 | Contract change: remove `password` from responses (OpenAPI + tests) |
| KI-08 | `GET /contacts/{username}` needs no authentication; unknown username → 500 | 🟠 | Auth matrix test |
| KI-09 | `POST /graphql` doesn't require authentication at the HTTP level (200 with an `errors` entry when logged out) | 🟡 | Contract discussion |

## Status codes & error shapes
| # | Behaviour | Sev |
|---|---|---|
| KI-10 | No 404 anywhere: unknown ids → 500 with an HTML stack trace, or 200 `{}` for bank accounts | 🟠 |
| KI-11 | Create returns 201 for users but 200 for contacts, bank accounts and transactions | 🟡 |
| KI-12 | Likes, comments and `POST /testData/seed` reply with plain-text `OK` | 🟡 |
| KI-13 | Login failures return plain text without a Content-Type (400 `Bad Request`, 401 `Unauthorized`) | 🟡 |
| KI-14 | `/logout` returns a 302 redirect; `/checkAuth` says `User is unauthorized` while other routes say `Unauthorized` | 🟡 |

## Validation gaps
| # | Behaviour | Sev |
|---|---|---|
| KI-15 | `POST /users` without a password → 500; duplicate usernames are accepted | 🟠 |
| KI-16 | `PATCH /users/{id}` with only `email` or only `phoneNumber` → 422 | 🟡 |
| KI-17 | `POST /notifications/bulk` without `items` → 500; mismatched items come back as `null` | 🟡 |
| KI-18 | Transaction `amount` is whole dollars, truncated to an integer (12.75 → 1200 cents); zero/negative amounts are not rejected | 🟠 |

## Pagination & filters
| # | Behaviour | Sev |
|---|---|---|
| KI-19 | `limit` is capped at 50; `limit=0` gives `totalPages: null` | 🟡 |
| KI-20 | The public feed adds up to five contacts' transactions to page 1 only, so `totalPages` differs between page 1 and later pages | 🟡 |
| KI-21 | Amount/date filters only work when both bounds are given; amounts are in cents; the upper amount bound is exclusive | 🟡 |
| KI-22 | Any unknown query parameter is treated as an exact-match filter and silently returns nothing (`rangeStartTs`/`rangeEndTs` are validated but never used, so they hit the same problem) | 🟠 |
| KI-23 | The contacts feed is sorted per contact, not globally | 🟡 |

## Social & GraphQL quirks
| # | Behaviour | Sev |
|---|---|---|
| KI-24 | Likes and comments always notify the sender and the receiver (even if you are one of them); liking twice is allowed | 🟡 |
| KI-25 | GraphQL-created bank accounts store epoch-millisecond timestamps; seeded ones are ISO strings | 🟡 |
| KI-26 | `GET /graphql` always serves the Playground page and never runs a query | 🟡 |
| KI-27 | Missing GraphQL query → 400; form bodies → 415; with `Accept: application/graphql-response+json`, validation errors → 400 instead of 200 | 🟡 |

## Found during knowledge-base verification (2026-10-16)
| # | Behaviour | Sev | Lab idea |
|---|---|---|---|
| KI-28 | "Everyone" feed with the default page size never shows public items 5–9: page 1 = 5 contact items + public 0–4, page 2 starts at public item 10 | 🟠 | Pagination test that collects ids across pages |
| KI-29 | Privacy levels are not enforced in feeds: "Friends" and page 1 of "Everyone" include contacts' `private` transactions; the `contacts` level is never used | 🔴 | BA writes privacy rules as Gherkin; security + API tests |
| KI-30 | The UI can look logged in while the server session is gone (auth state cached in localStorage, sessions in API memory): after an API restart you see the layout with empty lists and no redirect to sign-in | 🟠 | UI test: clear cookies → expect redirect to /signin |
| KI-31 ✅ | Fixed 2026-10-20: success/completion now wait for POST /transactions; failures return to the form with a generic accessible error. Regression: `playwright/tests/ui/new-transaction.spec.ts` | 🟠 | Keep the HTTP 500 regression test green |
| KI-32 | Deleting your only bank account does not bring back the onboarding dialog | 🟡 | UX discussion + UI test |

## UI behaviour & accessibility (found by mock-smith / axe, 2026-10-16)
| # | Behaviour | Sev | Lab idea |
|---|---|---|---|
| KI-33 | A 500 on the public feed renders the same "No Transactions" empty state as an empty feed — no error message (D-005 reference test: `mocked-states.spec.ts` › "tells the user when the public feed fails to load (KI-33)" with `test.fail`) | 🟠 | UX spec for error states → fe-dev change → flip the test |
| A11Y-01 | Home feed: react-virtualized renders `role="grid"`/`rowgroup` without `role="row"` children (axe `aria-required-children`, **critical**) — allowlisted as `KNOWN_CRITICAL` in `playwright/tests/ui/a11y.spec.ts` | 🔴 | `/tap-a11y` + fe-dev fix, then remove from the allowlist |
| A11Y-02 | `link-name`: links without accessible names on every screen (serious) | 🟠 | Add aria-labels; enforce `serious` in the a11y spec |
| A11Y-03 | `list` / `listitem` structure violations on the feed and inner pages (serious) | 🟡 | |
| A11Y-04 | `color-contrast` on the home feed (3 nodes desktop, 10 mobile) (serious) | 🟡 | ux-designer palette proposal |

## Test-suite issues (kept on purpose as exercises)
| # | Behaviour | Used in |
|---|---|---|
| TS-01 | `playwright/tests/ui/notifications.spec.ts` › "renders an empty notifications state" asserts `bySel(page, "notification-list")` has count 0, but the component's selector is `notifications-list`, so the check can never fail (inherited from the Cypress original, `cypress/tests/ui/notifications.spec.ts:261`) | lab-11 (find & fix a vacuous assertion) |
| TS-02 | `cypress/tests/api/api-bankaccounts.spec.ts:76` titles a bank-account delete test `DELETE /contacts/:bankAccountId`, which misleads title-based coverage mapping (L-007) | coverage / impact-analysis discussions |

## How to use this file
- **Testers:** turn a row into a bug report (`/tap-bug KI-05`) or a regression test. Per decision D-005 the
  test asserts the **correct** behaviour and is marked `test.fail(true, "KI-05: …")`, so the suite stays green
  and Playwright reports an *unexpected pass* the moment the defect is fixed (then drop `test.fail`).
  The OpenAPI spec keeps documenting the **actual** behaviour until the fix lands.
- **Developers:** fix one in a lab branch with `/tap-change-api "fix KI-01 …"`. The pipeline updates OpenAPI,
  tests and docs. When a KI is fixed, mark the row ✅ and link the commit; do not delete rows.
- **Security:** KI-04…KI-09 are the core of `/tap-security` exercises; test only this local app.
