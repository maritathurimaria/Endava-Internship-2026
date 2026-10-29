# Lab 12 — An end-to-end journey: new user gets paid

**Level:** ★★★ · **Time:** 90 min · **Tracks:** Tester, Full
**Skills/agents practised:** `/tap-e2e`, `/tap-test-plan`, `/tap-run-tests`, `/tap-review` · `e2e-architect`, `ui-automation`, `api-automation`, `qa-lead`, `code-reviewer`

## Learning objectives

1. Design a cross-layer journey: UI for what the user does, API for setup the user doesn't see.
2. Let `e2e-architect` decompose the journey and delegate parts to `ui-automation` / `api-automation`.
3. Keep a long test readable and deterministic: unique data, waits on responses, no hard waits.
4. Tag and run journeys in their own Playwright project (`e2e`, decision D-006).

## Prerequisites

- [Lab 05](lab-05-first-api-test.md), [Lab 06](lab-06-first-ui-test.md). App running.

## Background

The journey (one test, one story):

1. A visitor **signs up** through the UI (`/signup`) and logs in.
2. The **onboarding** dialog appears (`user-onboarding-dialog`): *Next* → bank account form
   (`bankaccount-bankName-input`, `-routingNumber-input`, `-accountNumber-input`, `bankaccount-submit`)
   → *Finished* → *Done*.
3. **API setup:** seeded user `Heath93` pays the new user $25 (`POST /login`, then `POST /transactions`
   with `transactionType: "payment"` and Heath93's bank account as `source`). The new user's id is
   looked up by username (`GET /users/search?q=`), never hard-coded.
4. The new user **sees the result**: the notifications badge (`nav-top-notifications-count`) shows 1,
   the notifications page lists *"… received payment."*, and the side-nav balance
   (`sidenav-user-balance`) shows **$25.00**.

Where journeys live (decision **D-006**): `playwright/tests/e2e/*.e2e.spec.ts`, run by the dedicated
`e2e` Playwright project (desktop viewport), tagged `{ tag: ['@e2e'] }`, with one `test.step` per
journey step.

The existing `auth.spec.ts` already covers sign-up + onboarding alone — reuse its helpers
(`openSignUp`, `signUpViaForm`, `loginViaForm`) rather than copying code. UI specs may also use the
`api` fixture (an independent request context with its own cookies) for setup.

## Steps

### 0. Branch

```bash
git switch -c lab/12-e2e-journey
```

### 1. Design before code

```
/tap-e2e design (don't implement yet) the journey "new user signs up, onboards a bank account, receives a $25 payment from Heath93 via API setup, sees the notification and the $25.00 balance". Which steps are UI, which API, which assertions, which existing helpers, and what makes it deterministic? Target file playwright/tests/e2e/new-user-gets-paid.e2e.spec.ts (decision D-006: e2e project, tag @e2e, one test.step per journey step).
```

**Observe:** the design should explain why the payment is done via API (speed, it's not what the new
user does) and why the username must be unique (faker or a timestamp) even though the DB is reseeded.

### 2. Implement

```
Design approved. Implement it, delegating UI parts to ui-automation and the API setup to api-automation if useful. Run it twice with --project=e2e.
```

**Observe:** which agents were spawned (the hand-off should say), and whether shared steps were
extracted into helpers in `playwright/src/` or kept local to the spec. Which is better here?

### 3. Read it like a reviewer

Open the spec. Check:

- `test.step(...)` blocks that map 1:1 to the four story steps;
- every wait starts **before** its action (`const r = waitForApi(...); await click; await r`);
- the expected balance is computed with `formatCents(dollarsToCents(25))`, not typed as a string;
- the tag: `test("…", { tag: ["@e2e"] }, …)`.

```
/tap-review
```

(reviews your uncommitted changes — the journey spec and any helpers the agents added).

### 4. Run journeys on their own

```
/tap-run-tests e2e
```

(or in `playwright/`: `npx playwright test --project=e2e`).

### 5. Plan the next journeys

```
/tap-test-plan which 3 further end-to-end journeys give the most risk coverage for this app? One line each, with the risk they address.
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Spec exists | file `playwright/tests/e2e/new-user-gets-paid.e2e.spec.ts` | exists |
| 2 | Tagged, in the e2e project | in `playwright/`: `npx playwright test --list --project=e2e --grep @e2e` | lists the journey (`Total: 1 test` or more) |
| 3 | Green ×2 | `npx playwright test --project=e2e --repeat-each=2` | `0 failed` |
| 4 | Not duplicated in UI projects | `npx playwright test --list --project=ui-desktop --grep @e2e` | `Total: 0 tests` (or "No tests found") |
| 5 | No hard-coded ids/waits | `node -e "const s=require('fs').readFileSync('playwright/tests/e2e/new-user-gets-paid.e2e.spec.ts','utf8');console.log(/waitForTimeout|uBmeaz5pX/.test(s))"` | `false` |
| 6 | Typecheck | `npm --prefix playwright run typecheck` | exit 0 |
| 7 | Suite unaffected | `npx playwright test --project=ui-desktop` | `0 failed` |

## Stretch goals

- Add step 5: the new user pays back $10 through the UI and Heath93's balance (checked via API) drops
  by exactly $10.
- Turn the API setup into a reusable fixture `paidNewUser` in `playwright/src/fixtures/` — what are the
  trade-offs of hiding a journey's setup in a fixture?
- Run the journey at 375×667 too: ask `e2e-architect` for the pros and cons of an `e2e-mobile` project vs.
  covering mobile only in `ui-mobile` specs.

## Reflection questions

1. Where did the split UI vs. API come from — your prompt or the agent's design? Would you change it?
2. The journey takes longer than any other test. How did the agent keep failures diagnosable (steps,
   messages, traces)?
3. Did `e2e-architect` delegate to other agents? Was the extra coordination worth it for one spec?
4. What context would a new teammate need to maintain this journey, and is it in the spec?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 12: new-user-gets-paid journey"
git switch tap26-base
```

## Instructor notes

- API setup sketch (in the test, using the `api` fixture): `auth.login(api, "Heath93")` via the seeded
  `users[0].username`; `bankAccounts.listBankAccounts(api)` → `source`; `users.searchUsers(api, newUsername)`
  → `receiverId`; `transactions.createTransaction(api, { transactionType: "payment", amount: 25, … })`.
- After the API payment the UI does not refresh by itself: `page.reload()` (or navigate) before
  asserting the badge and balance. Agents that wait for the badge without reloading hang until timeout.
- Notification copy is `"<userFullName> received payment."` (see `NotificationListItem.tsx`); assert
  with `toContainText("received payment")`.
- The e2e project uses the desktop viewport, so the balance is visible without opening the drawer.
- D-006: if `--project=e2e` reports *Project(s) "e2e" not found*, the `e2e` project is missing from
  `playwright/playwright.config.ts` — the student asks `e2e-architect` to add it
  (`{ name: "e2e", testDir: "./tests/e2e", testMatch: /.*\.e2e\.spec\.ts/, use: desktop viewport }`).
  `ui-desktop`/`ui-mobile` use `testDir: ./tests/ui`, so journeys never run twice.
