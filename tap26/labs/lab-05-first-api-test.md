# Lab 05 — Your first API test with an agent

**Level:** ★★☆ · **Time:** 45–60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-new-test`, `/tap-run-tests`, `/tap-review` · `api-automation`, `code-reviewer`

## Learning objectives

1. Describe an API test in plain English and have `api-automation` implement it in the functional framework.
2. Review generated test code against the framework's conventions (`playwright/README.md`).
3. Prove a test is meaningful: make it fail on purpose, then green twice in a row.
4. Handle a defect the TAP26 way (decision **D-005**): assert the *correct* behaviour and mark the test
   `test.fail(true, 'BUG-###: …')` so the suite stays green and flips when the bug is fixed.

## Prerequisites

- [Lab 02](lab-02-run.md) (app running), [Lab 03](lab-03-explore.md) step 3 (profile endpoint behaviour).

## Background

API tests in `playwright/tests/api/` call one function per route from `playwright/src/api/`
(e.g. `usersApi.getUserProfile(api, username)`), receive a frozen `{ status, ok, body, headers }`
object and assert on it. They never throw on HTTP errors — checking the status is the test's job.
Fixtures provide `api` (a request context), `me` (a logged-in seeded user) and an automatic `seed`.

Today's target: **`GET /users/profile/:username`** (public, no login). Lab 03 showed it returns
`{"user":{}}` with **200** for unknown usernames — a defect (it should be 404). TAP26's rule (D-005 in
`tap26/memory/decisions.md`): tests assert the **correct** behaviour; a test that fails because of a
known defect is marked `test.fail(true, '<KI or BUG id>: …')`. The OpenAPI spec, in contrast,
documents what the API *actually* does.

## Steps

### 0. Branch

```bash
git switch -c lab/05-first-api-test
```

### 1. Read the existing test first (human step)

Open `playwright/tests/api/users.api.spec.ts` and find `describe("GET /users/profile/:username")`.
Note the fixture names, the import style (`@api`, `@fixtures/api`) and how `res.body` is asserted.

### 2. Ask for the test

```
/tap-new-test api create playwright/tests/api/profile.api.spec.ts for GET /users/profile/:username with 3 tests — (1) a seeded user's profile contains exactly firstName, lastName, avatar and no private fields (balance, password, email, phoneNumber); (2) the endpoint works without logging in; (3) an unknown username should return 404; the app returns 200 with {\"user\":{}} today, so mark that test test.fail(true, 'BUG-pending: profile returns 200 for unknown username') per decision D-005. Reuse playwright/src/api/users.ts; follow playwright/README.md conventions.
```

**Observe the hand-off:** changed files, the command it ran, whether it ran twice, typecheck result.

### 3. Review the code like a reviewer

```
/tap-review
```

(`/tap-review` reviews your uncommitted changes; add a ref range such as `tap26-base..HEAD` after committing.)
Then focus it: *"Check profile.api.spec.ts specifically against the conventions in playwright/README.md."*

Check yourself:

- no classes, no `let ctx = {}`, no hard waits;
- uses `usersApi.getUserProfile` instead of raw `fetch`;
- test (2) really uses a *fresh, logged-out* request context (the `me` fixture logs in — does the test avoid it?).

### 4. Make it fail on purpose (mutation check)

In `profile.api.spec.ts` temporarily change the expected `firstName` to `"Nobody"` and run:

```bash
cd playwright
npx playwright test tests/api/profile.api.spec.ts --project=api
```

**Expected:** 1 failed with a readable diff. Undo the change. A test you have never seen fail is a test
you can't trust.

### 5. Run twice (flake gate)

```
/tap-run-tests api tests/api/profile.api.spec.ts
```

Then ask *"Run it once more and compare the two runs — is it stable?"* A test is only done when it is
green twice in a row.

### 6. File the defect and link it

Record the bug so the `test.fail` annotation points at something real:

```
/tap-bug GET /users/profile/<unknown> returns 200 with {"user":{}} instead of 404
```

The report lands in `tap26/reports/bugs/BUG-###-<slug>.md`. Replace `BUG-pending` in the `test.fail`
reason with the real id. Run the spec: test (3) is reported as *expected to fail* — green overall.

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Spec exists | file `playwright/tests/api/profile.api.spec.ts` | exists |
| 2 | Tests pass twice | in `playwright/`: `npx playwright test tests/api/profile.api.spec.ts --project=api --repeat-each=2` | `6 passed` |
| 3 | Typecheck | `npm --prefix playwright run typecheck` | exits 0, no output errors |
| 4 | Conventions | `node -e "const s=require('fs').readFileSync('playwright/tests/api/profile.api.spec.ts','utf8');console.log(/class |waitForTimeout|let ctx/.test(s))"` | `false` |
| 5 | Bug recorded | `node -e "console.log(require('fs').readdirSync('tap26/reports/bugs').filter(f=>f.startsWith('BUG-')))"` | lists your `BUG-###-….md` |
| 5b | Defect marked, not hidden | `node -e "console.log(/test\.fail\(true, *['\x22]BUG-\d+/.test(require('fs').readFileSync('playwright/tests/api/profile.api.spec.ts','utf8')))"` | `true` |
| 6 | Whole API suite still green | in `playwright/`: `npm run test:api` | `0 failed` |

## Stretch goals

- Write a fourth test **yourself** (no agent): usernames are case-sensitive — `heath93` vs `Heath93`.
  Predict the result first, then check.
- Ask for a data-driven version: one `test` per seeded user generated from `GET /testData/users`.
  Is that better or just longer?
- Ask `contract-guardian` whether `tap26/openapi/openapi.yaml` documents the empty-object response (it should — the spec records *actual* behaviour).

## Reflection questions

1. What did the agent get right on the first try, and what did you have to correct?
2. Which part of your prompt mattered most (file name, the list of 3 tests, "reuse src/api/users.ts")?
   Try removing one and predict what changes.
3. Was test (2) truly unauthenticated? How did you verify the agent's claim?
4. D-005 says *assert correct behaviour + `test.fail`*; the OpenAPI spec documents *actual* behaviour.
   Why might a team want both? What would go wrong if tests asserted the buggy 200?

## Reset

```bash
git restore data/database.json
git add -A playwright tap26 && git commit -m "lab 05: profile API tests"   # keep your work
git switch tap26-base
```

To discard instead: `git stash -u -m lab-05 && git switch tap26-base`.

## Instructor notes

- Solution sketch (test 2): use the `playwright` fixture to create a new request context
  (`playwright.request.newContext({ baseURL: env.apiURL })`) or reuse the plain `api` fixture *without*
  requesting `me`; the profile route has no `ensureAuthenticated`.
- Test 1 should use `toEqual({ firstName, lastName, avatar })` (exact keys) **plus** `not.toHaveProperty`
  for private fields — `toMatchObject` alone would not catch leaked fields.
- If students see `ECONNREFUSED`, the API is down — run `/tap-run`.
- `--repeat-each=2` is the cheapest flake gate; the agent may also run the command twice — both are fine.
- Test 3 sketch: `test("unknown username → 404", async ({ api }) => { test.fail(true, "BUG-001: …"); const res = await usersApi.getUserProfile(api, "no_such_user"); expect(res.status).toBe(404); });`
  If the agent asserts `200` + `{}` instead, point it to D-005 — that's a characterisation that would *hide* the defect.
- Keep this spec: Lab 07 changes this endpoint.
