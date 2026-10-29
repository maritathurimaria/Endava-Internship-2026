# Lab 07 — Change the API: add a user nickname

**Level:** ★★☆ · **Time:** 60–90 min · **Tracks:** Developer, Full
**Skills/agents practised:** `/tap-change-api`, `/tap-review`, `/tap-swagger` · `tap-orchestrator`, `be-dev`, `contract-guardian`, `test-impact-analyst`, `api-automation`, `doc-writer`, `code-reviewer`

## Learning objectives

1. Drive a multi-agent pipeline (code → contract → impact → tests → docs → review) with one command.
2. Read each hand-off and check the orchestrator's **quality gates** yourself.
3. Find the hidden constraint an agent must discover (the `userFieldsValidator` `oneOf`).
4. Verify an API change from the outside with a black-box request.

## Prerequisites

- [Lab 05](lab-05-first-api-test.md) (you have `playwright/tests/api/profile.api.spec.ts`).
- App running (`/tap-run`).

## Background

**The change request:** *Users may set an optional `nickname` (string, max 20 characters). It is
returned by the public profile `GET /users/profile/:username` and editable with
`PATCH /users/:userId`. Longer values are rejected with 422.*

Relevant code:

- `backend/user-routes.ts` — the profile route uses `pick(["firstName", "lastName", "avatar"], …)`;
  the PATCH route runs `userFieldsValidator` then `isUserValidator`.
- `backend/validators.ts` — `userFieldsValidator` is a `oneOf([...])`: the body must contain at least
  one *known* field, otherwise 422. `nickname` is not in that list (yet).
- `src/models/user.ts` — the shared `User` interface.
- `tap26/openapi/openapi.yaml` — the contract; `spec-drift.mjs` compares it with the routes.

The API restarts automatically (nodemon watches `backend/`).

## Steps

### 0. Branch

```bash
git switch -c lab/07-api-change lab/05-first-api-test   # builds on your Lab 05 spec
```

Skipped Lab 05? Branch from `tap26-base` instead (`git switch -c lab/07-api-change tap26-base`) and ignore step 5.

### 1. Ask for a plan first

```
/tap-change-api add an optional "nickname" field to users (string, max 20 chars). Return it from GET /users/profile/:username and allow updating it with PATCH /users/:userId (also when it is the only field sent). Longer than 20 → 422. Show me the plan and wait for my OK before editing.
```

**Observe:** the plan should list `be-dev` → `contract-guardian` → `test-impact-analyst` →
`api-automation` → `doc-writer` → `code-reviewer`. Does it mention `userFieldsValidator`? If not, ask:

```
What happens today if PATCH /users/:userId receives only {"nickname":"Teddy"}? Check backend/validators.ts before answering.
```

### 2. Approve and watch the pipeline

```
Plan approved — go ahead.
```

While it runs, open the files as they change (VS Code shows inline diffs). Note each **hand-off report**.

### 3. Check the contract

```bash
node tap26/scripts/spec-drift.mjs
```

`spec-drift` compares **paths and methods** only (exit 0 = in sync), so a new *field* never shows up as
drift — you must check the schema yourself. Open `tap26/openapi/openapi.yaml` → search `nickname`. It should appear in the user schema, the
profile response and the PATCH request body with `maxLength: 20`.

### 4. Black-box check

```bash
node -e "const A='http://localhost:3001';(async()=>{const l=await fetch(A+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'Heath93',password:'s3cret'})});const c=l.headers.get('set-cookie').split(';')[0];const id=(await l.json()).user.id;const p=(n)=>fetch(A+'/users/'+id,{method:'PATCH',headers:{'content-type':'application/json',cookie:c},body:JSON.stringify({nickname:n})}).then(r=>r.status);console.log('patch ok',await p('Teddy'));console.log('patch 21 chars',await p('x'.repeat(21)));console.log((await (await fetch(A+'/users/profile/Heath93')).json()).user)})()"
```

**Expected:**

```
patch ok 204
patch 21 chars 422
{ firstName: 'Ted', lastName: 'Parisian', avatar: '…', nickname: 'Teddy' }
```

### 5. Review the impact on *your* Lab 05 spec

```
/tap-ask api-auto does playwright/tests/api/profile.api.spec.ts still describe the profile endpoint correctly after the nickname change? Which assertion is now incomplete rather than failing?
```

### 6. Independent review

```
/tap-review
```

Address any "request changes" findings by replying in the chat (e.g. *"Fix finding 2"*).

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Contract clean | `node tap26/scripts/spec-drift.mjs` | no missing/extra operations; exit 0 |
| 2 | Spec mentions field (YAML source + generated JSON) | `node -e "const fs=require('fs');console.log(['yaml','json'].map(x=>fs.readFileSync('tap26/openapi/openapi.'+x,'utf8').includes('nickname')))"` | `[ true, true ]` |
| 3 | Black-box | step 4 | `204`, `422`, profile includes `nickname` |
| 4 | Types | `yarn types` | exit 0 |
| 5 | API tests green ×2 | in `playwright/`: `npx playwright test --project=api --repeat-each=2` | `0 failed` |
| 6 | New tests exist | `node -e "const fs=require('fs');console.log(fs.readdirSync('playwright/tests/api').some(f=>fs.readFileSync('playwright/tests/api/'+f,'utf8').includes('nickname')))"` | `true` |
| 7 | Ledger updated | `node tap26/scripts/memory.mjs search nickname` | entries in `changes.md` |
| 8 | Docs updated | `git diff --stat lab/05-first-api-test -- tap26/docs tap26/knowledge` (skipped Lab 05: use `tap26-base`) | at least one file changed: only this lab's doc changes are listed |

## Stretch goals

- Show the nickname in the UI (side nav: `Ted "Teddy" P`). Which skill would you use? (Lab 08.)
- Ask `security-tester`: *"Can a nickname contain HTML/script, and is it rendered unsafely anywhere?"*
- Add the field to the GraphQL `User` type too and see which agent the orchestrator picks.
- Fix a real defect with the same pipeline: **KI-16** (`PATCH /users/{id}` with only `email` → 422) has the
  same root cause as the trap in this lab — `/tap-change-api fix KI-16 …`, then flip its `test.fail` (D-005).
- Boundary data: `/tap-data boundaries nickname` — compare the agent's list with the tests it wrote.

## Reflection questions

1. Did the agents discover the `oneOf` validator by themselves? At which step would you have noticed?
2. Which hand-off was the most useful to *you* and which was noise?
3. The existing `toEqual({firstName, lastName, avatar})` profile test still passes. Is that good or bad?
   What does it tell you about seeded data vs. new fields?
4. What would you put in the prompt next time to save one round-trip?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 07: user nickname via /tap-change-api"   # keep it on the lab branch
git switch tap26-base
node -e "fetch('http://localhost:3001/testData/seed',{method:'POST'}).then(r=>console.log('reseed',r.status))"
```

nodemon reloads `backend/` from `tap26-base` automatically after the switch.

## Instructor notes

- **The trap:** `userFieldsValidator` (`oneOf`) rejects a body containing only `nickname` with 422 —
  the same root cause as known issue **KI-16** in `tap26/knowledge/known-issues.md` (only `email` → 422). A
  correct solution adds `check("nickname").exists()` to the `oneOf` and
  `check("nickname").optional().isString().isLength({ max: 20 }).trim()` to `isUserValidator`.
- Profile route: add `"nickname"` to the `pick` list. `pick` omits missing keys, so seeded users (no
  nickname) still return exactly three fields — that's why the old `toEqual` keeps passing.
- `src/models/user.ts`: `nickname?: string`. Note `src/machines/authMachine.ts` already reads
  `event.user.nickname` for Auth0 — a good example of a name clash worth a comment.
- If `yarn types` fails, it's usually a non-optional `nickname: string` breaking seed generation types.
- `openapi.json` is generated from the YAML; if checkpoint 2 shows `[ true, false ]` the
  contract-guardian forgot to regenerate it — send it back (`/tap-swagger`).
- Watch for agents *weakening* the existing PATCH "invalid field" test — gate 4 forbids it.
