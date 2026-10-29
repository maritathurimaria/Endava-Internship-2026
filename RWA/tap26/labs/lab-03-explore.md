# Lab 03 — Explore the app with agents

**Level:** ★☆☆ · **Time:** 45–60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-scan`, `/tap-explain`, `/tap-test-cases` · `knowledge-curator`, `tutor`, `manual-tester`, `researcher`

## Learning objectives

1. Generate and read the app's **knowledge inventory** (routes, selectors, tests, coverage).
2. Use @-mentions to give an agent precise context and get answers backed by `file:line` citations.
3. Run a time-boxed **exploratory charter** with an agent and record notes.
4. Spot the difference between what the agent *read* and what it *assumed*.

## Prerequisites

- [Lab 02](lab-02-run.md) — app running on :3000/:3001.

## Background

An agent is only as good as the context it gets. TAP26 gives agents three kinds of context:
**memory** (`tap26/memory/`, injected at start), **curated knowledge** (`tap26/knowledge/*.md`) and
**generated knowledge** (`tap26/knowledge/generated/*.md`, rebuilt by `scan-app.mjs`). Exploring with an
agent is fast, but agents can hallucinate plausible-looking routes or selectors. Your job in this lab
is to make the agent *prove* things with file references and to verify a sample by hand.

## Steps

### 0. Branch

```bash
git switch -c lab/03-explore
```

### 1. Refresh the generated knowledge

```
/tap-scan
```

**Observe:** files appear or update under `tap26/knowledge/generated/`: `api-routes.md`,
`ui-selectors.md`, `ui-routes.md`, `tests-inventory.md`, `coverage-matrix.md`. Open `api-routes.md` in
VS Code. (Same thing without an agent: task **TAP: Scan app**.)

### 2. Ask for a guided tour with evidence

```
/tap-explain give me a 15-minute tour of the RWA architecture: how a payment travels from the "Pay" button in src/components/TransactionCreateStepTwo.tsx to the balance update in backend/database.ts. Cite file:line for every hop and draw it as a Mermaid sequence diagram.
```

**Observe:** open two of the cited lines yourself. Are they right? Preview the Mermaid diagram
(Markdown preview, `Ctrl+Shift+V`, with the Markdown Mermaid extension).

### 3. Use @-mentions for precise questions

Type `@` in the prompt box and pick `backend/user-routes.ts`, then ask:

```
@backend/user-routes.ts which fields does GET /users/profile/:username return, what happens for an unknown username, and does it require login?
```

Verify the agent's claim yourself:

```bash
node -e "fetch('http://localhost:3001/users/profile/nobody_here').then(r=>r.text()).then(t=>console.log(t))"
```

**Expected:** `{"user":{}}` with status 200 — arguably a defect (should be 404). Remember it for Lab 05.

### 4. Find selectors without opening every component

```
Which data-test selectors exist on the New Transaction flow (all three steps)? Use tap26/knowledge/generated/ui-selectors.md first and then confirm in src/components. Output a table: selector | component file | what it is.
```

### 5. Explore like a tester

```
/tap-test-cases the Bank Accounts screen (/bankaccounts) charter
```

Spend **15 minutes** following the charter in the browser (logged in as `Heath93` / `s3cret`). Write
your notes in the session-notes section of the file the agent created.

### 6. Record a learning

If you discovered something surprising (e.g. the profile endpoint behaviour), store it:

```bash
node tap26/scripts/memory.mjs add-learning "Profile endpoint returns 200 with empty user for unknown usernames" --lesson "GET /users/profile/:username never 404s; tests assert 404 with test.fail per D-005, OpenAPI documents the 200" --tags api,users --by student
```

## ✅ Checkpoints

| # | Check | How | Expected |
|---|---|---|---|
| 1 | Inventory generated | file `tap26/knowledge/generated/api-routes.md` | exists and lists `/users/profile/:username` |
| 2 | Selector inventory | `node -e "const t=require('fs').readFileSync('tap26/knowledge/generated/ui-selectors.md','utf8');console.log(t.includes('transaction-create-description-input'))"` | `true` |
| 3 | Claim verified | step 3 command | `{"user":{}}` |
| 4 | Charter written | a new file under `tap26/reports/manual/` (path given in the hand-off) | contains a *Session notes* section with your notes |
| 5 | Learning stored | `node tap26/scripts/memory.mjs search "empty user"` | finds your entry |

## Stretch goals

- Ask `researcher` to compare the Cypress suite (`cypress/tests/ui`) with the Playwright suite
  (`playwright/tests/ui`): which Cypress specs have no Playwright equivalent? Check one of its claims.
- Record a codegen session to discover selectors: in `playwright/` run
  `npx playwright codegen http://localhost:3000` and click through sign-in. Compare the locators codegen
  suggests with the `data-test` contract — which would you keep?
- Ask the tutor to quiz you: `/tap-explain quiz me with 5 questions about the app's architecture`.

## Reflection questions

1. Which answer was the most *grounded* (cited lines you could open) and which was the least? Why?
2. Did the agent use the generated inventory or grep the source? Which was faster, which more reliable?
3. Where did @-mentioning a file change the quality of the answer?
4. How would you phrase a prompt that forces the agent to say "I don't know" rather than guess?

## Reset

```bash
git restore data/database.json
git add tap26 && git commit -m "lab 03: exploration notes"   # optional: keep notes on the lab branch
git switch tap26-base
```

`tap26/knowledge/generated/` is safe to regenerate at any time.

## Instructor notes

- If `/tap-scan` fails, check `node tap26/scripts/scan-app.mjs` directly — it is zero-dependency and
  should run on any Node ≥ 18.
- Students often accept the Mermaid diagram without reading it. Ask them to find one arrow that is
  wrong or missing (e.g. the XState `createTransactionService` between the form and the API call).
- Step 3 is a seed for Lab 05: the "empty user" behaviour is arguably a bug (should be 404). Let the
  class debate *"document what it does" vs. "assert what it should do"* — TAP26 settles it in decision
  D-005 (`tap26/memory/decisions.md`): tests assert correct behaviour + `test.fail`, OpenAPI documents actual behaviour.
- Codegen tends to propose `getByRole`/`getByText` locators; this framework prefers `data-test`
  (`bySel`). Good discussion: stability vs. user-facing semantics.
