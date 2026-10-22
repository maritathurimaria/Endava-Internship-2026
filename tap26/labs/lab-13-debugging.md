# Lab 13 — Debug an injected bug with the debugger agent

**Level:** ★★★ · **Time:** 90–120 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-debug`, `/tap-change-api`, `/tap-run-tests`, `/tap-retro` · `debugger`, `be-dev`, `contract-guardian`, `api-automation`, `knowledge-curator`

## Learning objectives

1. Describe a symptom well enough for an agent to reproduce it (what you did, expected, actual).
2. Follow the debugging method: reproduce → isolate (layer) → trace → root cause → minimal fix → regression test.
3. Explain why a whole test layer can stay green while a real bug exists.
4. Debug and fix a *real* catalogued defect (KI-01) end-to-end.
5. Record a learning so the next session benefits.

## Prerequisites

- [Lab 02](lab-02-run.md), [Lab 05](lab-05-first-api-test.md). App running. Work in **pairs** if you can:
  one person injects the bug, the other debugs without looking.

## Background

The `debugger` agent is told never to guess: it reproduces first, then narrows down the layer (UI,
XState machine, HTTP, route, validator, `database.ts`, utils) with evidence at each step. You'll
inject a realistic bug on a lab branch — the kind a tired developer writes during a "small refactor" —
then hand the agent only the **symptom**.

The API runs under nodemon, so a change in `backend/` is live within seconds.

## Steps

### 0. Branch and inject the bug (the *injector* does this)

```bash
git switch -c lab/13-debugging
node -e "const fs=require('fs'),f='backend/database.ts',s=fs.readFileSync(f,'utf8'),t=s.replace('amount: transactionDetails.amount * 100,','amount: transactionDetails.amount * 10,');if(s===t)throw new Error('pattern not found - already injected?');fs.writeFileSync(f,t);console.log('bug injected')"
git commit -m "refactor: tidy transaction creation" -- backend/database.ts
```

**Expected:** `bug injected`. The commit hides the change from a plain `git diff` — like a real
regression that has already been merged.

> Don't read the snippet if you're the debugger! The injector should clear the terminal.

### 1. Experience the symptom (the *debugger* from here on)

Log in as `Heath93`/`s3cret`, click **New**, pay a contact **$25** with note "lab13". Look at the
transaction in the *Mine* feed and at the receiver's balance (log in as them). Write one sentence:
*I did …, I expected …, I got ….*

### 2. Run the suites — which layer notices?

```
/tap-run-tests api
```

```
/tap-run-tests ui tests/ui/new-transaction.spec.ts
```

**Observe:** the API suite is green; at least one UI test fails
(*"submits a transaction payment and verifies the deposit for the receiver"*). Why would API tests
miss a money bug? (Look at what `transactions.api.spec.ts` asserts about `amount`.)

### 3. Hand the symptom to the debugger

```
/tap-debug I paid $25 to a contact in the New Transaction form; the feed shows $2.50 and the receiver's balance went up by $2.50 instead of $25. The failing test is "submits a transaction payment and verifies the deposit for the receiver". Please work from the symptom: reproduce via the API first, isolate the layer, then use git history only if you get stuck.
```

**Observe** the method in the agent's output:

1. reproduction (an API call creating a payment and reading it back — amount in cents?),
2. isolation (is the UI sending 25? does the route receive 25? what is saved?),
3. root cause with `file:line`,
4. a **minimal** fix proposal (owner: `be-dev`),
5. a **regression test** at the lowest layer that would have caught it (an API test asserting
   `transaction.amount === dollarsToCents(amount)`).

### 4. Approve the fix and the regression test

```
Apply the minimal fix through be-dev, add the API regression test, and run api + the failing UI test twice.
```

When both are green, **commit the fix** (checkpoint 4 later re-injects the bug and restores the file
from your last commit, so an uncommitted fix would be lost):

```bash
git restore data/database.json
git add -A && git commit -m "fix: store transaction amounts in cents + regression test"
```

### 5. Capture the learning

```
/tap-retro lab-13
```

When the curator asks what to focus on, answer: *"What made this bug invisible to the API suite, and
which rule should api-automation follow from now on?"*

### 6. Part B — a real defect nobody injected (KI-01)

The RWA ships with verified defects, catalogued in `tap26/knowledge/known-issues.md`. Debug one from
the symptom only (don't open the catalogue yet):

```
/tap-debug as Heath93 I sent DELETE /contacts/abc123XYZ (an id that does not exist) and got 200 — afterwards ALL my contacts were gone from the New Transaction contact list. Reproduce on a fresh seed via the API, find the root cause and stop before fixing.
```

**Observe:** the agent should reproduce with a request (counting contacts before/after via
`GET /contacts/Heath93` or `GET /testData/contacts`), then trace `DELETE /contacts/:contactId` in
`backend/contact-routes.ts` → `removeContactById` in `backend/database.ts`. Compare its root cause with
row **KI-01** in the catalogue. Then fix it through the API pipeline:

```
/tap-change-api fix KI-01: DELETE /contacts/{id} with an unknown id must not delete anything and should return 404. Update the OpenAPI spec, turn the KI-01 test.fail into a passing regression test (decision D-005), and mark KI-01 as fixed in tap26/knowledge/known-issues.md.
```

Commit this fix too, **before** the checkpoints (the KI-01 fix may also touch `backend/database.ts`):

```bash
git restore data/database.json
git add -A && git commit -m "fix KI-01: DELETE /contacts with an unknown id returns 404"
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Bug was real | `git log --oneline -5 -- backend/database.ts` | shows `refactor: tidy transaction creation` and, above it, your fix commit |
| 2 | Fixed | `git grep -n "amount: transactionDetails.amount \* 100," -- backend/database.ts` | one match |
| 3 | Regression test exists | `git grep -nE "dollarsToCents\|\* ?100" -- playwright/tests/api/transactions.api.spec.ts` | at least one match in a payment/request test |
| 4 | Regression test catches the bug | first check `git status --short -- backend` prints nothing (fixes committed). Re-run the step 0 node snippet **without** its `git commit` line, then in `playwright/`: `npx playwright test tests/api/transactions.api.spec.ts --project=api` | ≥1 failed. Then restore your committed fix: `git checkout -- backend/database.ts` |
| 5 | All green ×2 | `npx playwright test --project=api --repeat-each=2` and `npx playwright test tests/ui/new-transaction.spec.ts --project=ui-desktop` | `0 failed` |
| 6 | Learning stored | `node tap26/scripts/memory.mjs search amount` | a new `L-###` entry |
| 7 | KI-01 fixed | `git grep -n "KI-01" -- tap26/knowledge/known-issues.md` | the row is marked ✅ with a reference to your change |
| 8 | KI-01 guarded | in `playwright/`: `npx playwright test --project=api -g "contact"` | `0 failed`, and no `test.fail(…'KI-01…')` left: `git grep -n "KI-01" -- playwright/tests` shows no `test.fail` |
| 9 | Contract still clean | `node tap26/scripts/spec-drift.mjs` | exit 0 |

## Stretch goals

**Fix another real defect.** Pick a 🟠/🔴 row from `tap26/knowledge/known-issues.md` (e.g. **KI-03**
`PATCH /users/{unknown id}` updates the first user, or **KI-18** amount truncation) and run
`/tap-debug` → `/tap-change-api fix KI-xx …` end-to-end. Which ones are risky to fix because tests or
the UI depend on the current behaviour?

**Bug B — pagination (harder).** Inject on the same branch:

```bash
node -e "const fs=require('fs'),f='backend/transaction-routes.ts',s=fs.readFileSync(f,'utf8'),t=s.replace('req.query.limit as unknown as number,','(req.query.limit as unknown as number) - 1,');if(s===t)throw new Error('pattern not found');fs.writeFileSync(f,t);console.log('bug B injected')"
git commit -m "chore: pagination tweak" -- backend/transaction-routes.ts
```

Symptom to give the agent: *"The Mine feed only ever shows 9 items per page."* Which test catches it
(hint: `transaction-feeds.spec.ts`, *paginates personal transaction feed*)? Revert it when done:
`git log --oneline -5` → copy the sha of `chore: pagination tweak` → `git revert --no-edit <sha>`
(plain `git revert HEAD` is only right if you committed nothing after the injection).

- Ask the debugger to use `git bisect` on purpose for bug B and explain each step.
- Use the VS Code debug config **TAP: Debug API** (stop `yarn dev`'s API first) and put a breakpoint
  in `createTransaction` in `backend/database.ts`. Compare with the agent's trace.

## Reflection questions

1. How much did the quality of your symptom description change the agent's path? Try a vague version
   (*"payments are broken"*) in a new conversation and compare.
2. Did the agent reproduce before theorising? Where (if anywhere) did it guess?
3. Was the regression test written at the lowest layer that can catch the bug? Why does that matter?
4. "Use git history only if stuck" — was that a good constraint for learning? For real work?

## Reset

```bash
git restore data/database.json
git switch tap26-base                 # tap26-base never had the bug
git branch -D lab/13-debugging        # or keep it to show your fix and regression test
node -e "fetch('http://localhost:3001/testData/seed',{method:'POST'}).then(r=>console.log('reseed',r.status))"
```

Undo only the injected commit while staying on the branch: `git revert --no-edit <inject-commit-sha>`.
Throw away an uncommitted injection: `git checkout -- backend/database.ts`.

## Instructor notes

- Root cause: `createTransaction` in `backend/database.ts` stores `amount * 10` instead of `* 100`
  (cents). Balances move by the stored amount, so sender and receiver stay *consistent* — only the
  absolute value is wrong. That's why nothing crashes.
- API tests only assert `status`, `requestStatus` and that an id exists — no amount check. The best
  regression test: create a payment of `randomAmount()` and assert
  `res.body.transaction.amount === dollarsToCents(amount)` plus the receiver's balance delta.
- If the agent jumps straight to `git log -p`, accept it but ask the student to have it explain the
  evidence that confirms the commit is the cause (reproduction before/after).
- Transactions created while the bug was live keep wrong amounts until a reseed — mention it when
  students see odd values after the fix.
- KI-01 root cause: `getContactBy("id", unknownId)` returns `undefined`, and lodash
  `remove(undefined)` uses the identity predicate — every (truthy) contact matches and is removed. Minimal
  fix: return 404 (or no-op) when the contact is not found, *before* calling `remove`. Make sure the fix
  doesn't break deleting an existing contact (`social.api.spec.ts` "DELETE /contacts/:contactId").
- Under D-005 the KI-01 test (if one exists) asserts the correct behaviour with `test.fail(true, 'KI-01: …')`;
  after the fix it *unexpectedly passes* until the agent removes `test.fail` — a nice visible signal.
- `/tap-retro` should produce a learning such as "API tests for money must assert amounts in cents".
