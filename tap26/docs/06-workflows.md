# 06 · Workflows

Step-by-step recipes for the jobs you will do most often. Each recipe gives you the **exact prompt or
slash command**, what the agents do, and a **"You check"** list — because you stay responsible for what
gets committed.

Before any workflow:

```bash
git switch -c lab/07-nickname      # work on a branch (convention: lab/NN-name)
```

…and make sure the app is running (`/tap-run`). Remember: **running tests re-seeds the database.**

## Workflow 1 — Change the API → spec → tests → docs

**Command**

```
/tap-change-api Add an optional "nickname" string (max 40 chars) to bank accounts.
Accept it on POST /bankAccounts, return it on GET /bankAccounts and GET /bankAccounts/:id.
Reject longer values with 422. Don't change the UI.
```

**What happens**

| Step | Agent | Does |
|---|---|---|
| 1 | `be-dev` | edits `backend/bankaccount-routes.ts`, `backend/validators.ts`, `backend/database.ts` (and GraphQL if needed); runs `yarn types` |
| 2 | `contract-guardian` | updates `tap26/openapi/openapi.yaml`, regenerates `openapi.json`, runs `node tap26/scripts/spec-drift.mjs` |
| 3 | `test-impact-analyst` | runs `node tap26/scripts/impact.mjs`, lists affected specs |
| 4 | `api-automation` | adds/updates `playwright/tests/api/bankaccounts.api.spec.ts`, runs it twice |
| 5 | `doc-writer` | updates docs/knowledge |
| 6 | `code-reviewer` | reviews the whole diff, gives a verdict |

**You check**

- [ ] The **Changed files** in each hand-off match what you see in Source Control.
- [ ] `openapi.yaml` has the new property, with `maxLength: 40` and the 422 response.
- [ ] There is a **negative** test (41 characters → 422), not only a happy path.
- [ ] `npx playwright test --project=api` is green (run it yourself once from `playwright/`).
- [ ] `tap26/memory/changes.md` has ledger lines for the backend files.

Lab: [Lab 07 — API change](../labs/lab-07-api-change.md).

## Workflow 2 — Change the UI → selectors → tests

**Command**

```
/tap-change-ui On the Bank Accounts page show "N accounts" above the list.
Use data-test="bankaccount-count". Must work on mobile (375px) too.
```

**What happens:** (`ux-designer` if the design is unclear) → `fe-dev` edits `src/components/…` and keeps
or adds `data-test` → `test-impact-analyst` finds specs that use affected selectors → `ui-automation`
adds tests for `ui-desktop` and `ui-mobile` → `doc-writer` → `code-reviewer`.

**You check**

- [ ] No existing `data-test` value was renamed or removed (search the diff for `data-test=`).
- [ ] The new selector follows the `<area>-<thing>` naming used elsewhere.
- [ ] Tests use `bySel(page, "bankaccount-count")`, not CSS classes or text that may change.
- [ ] Both `ui-desktop` and `ui-mobile` ran when layout was touched.
- [ ] Look at the page yourself at http://localhost:3000/bankaccounts.

Lab: [Lab 08 — UI change](../labs/lab-08-ui-change.md).

## Workflow 3 — Feature slice (story → API → UI → tests → docs)

**Command**

```
/tap-feature As a user I can add a short memo to a bank transfer so I remember why I moved money.
```

**What happens:** `business-analyst` writes a user story with Gherkin acceptance criteria → you
**approve the story** → `be-dev` → `fe-dev` → `qa-lead` writes a risk-based test plan →
`api-automation` + `ui-automation` (or `e2e-architect`) → `doc-writer` → `code-reviewer`.

**You check**

- [ ] Every Gherkin scenario maps to at least one test (ask *"show me the traceability"*).
- [ ] The plan lists risks you agree with; challenge any you don't.
- [ ] Ask for a plan first if the scope feels large: *"Plan only — list the files you'd touch."*

## Workflow 4 — Sync tests after manual edits

You changed app code yourself (in the editor, or in a Claude chat without a skill). Now tests may be stale.

**Command**

```
/tap-sync-tests --since tap26-base
```

**What happens:** `impact.mjs` reads `git diff tap26-base` plus the change ledger → finds changed routes,
added/removed `data-test` selectors and the specs that reference them → `test-impact-analyst` writes an
update plan → `api-automation` / `ui-automation` apply it and run the affected specs.

**You check**

- [ ] The impact report lists the selector or route you know you changed.
- [ ] Removed selectors were **replaced** in tests, not just deleted along with assertions.
- [ ] No assertion was weakened without a reason in the hand-off.

Lab: [Lab 09 — Sync tests](../labs/lab-09-sync-tests.md).

## Workflow 5 — Debug a failure

**Command** (paste the real failure)

```
/tap-debug npx playwright test tests/ui/new-transaction.spec.ts --project=ui-mobile fails:
"locator.click: Timeout 10000ms exceeded" on user-list-search-input
```

**What happens:** `debugger` reproduces the failure, opens the trace
(`npx playwright show-trace test-results/…/trace.zip`), isolates the cause (app bug? test bug? data?
environment?), proposes a minimal fix and hands it to the owner (`fe-dev`, `ui-automation`…). The
`knowledge-curator` records a learning if the cause was surprising.

**You check**

- [ ] The report names a **root cause**, not just a symptom ("drawer covers the input", not "flaky").
- [ ] The fix does not add `waitForTimeout` (hard waits) or `retries` to hide the problem.
- [ ] The test passes **twice in a row**.

**Variant — a real defect.** The app's verified defects are catalogued in
`tap26/knowledge/known-issues.md` (KI-01…KI-33 plus A11Y-01…A11Y-04 and test-suite issues TS-01/TS-02).
Pick one and debug it from the symptom:

```
/tap-debug KI-03: PATCH /users/{unknown id} changes the first user instead of returning 404.
Reproduce it with an API test, find the line in backend/database.ts, propose the fix but don't apply it.
```

Tests for known defects assert the **correct** behaviour and are marked
`test.fail(true, "KI-03: …")` (decision D-005), so they stay green while the bug exists and turn red —
reminding you to remove the marker — once it is fixed. A fix is a deliberate change — run it through `/tap-change-api fix KI-03 …` so spec, tests and docs move together,
and mark the row ✅ in `known-issues.md`.

Lab: [Lab 13 — Debugging](../labs/lab-13-debugging.md).

## Workflow 6 — Answer a role inquiry

**Commands**

```
/tap-ask ba What acceptance criteria would you write for "request money from a contact"?
/tap-ask qa How much regression testing does a change to notifications need?
/tap-ask data Which seed users have no bank account?
```

**What happens:** the matching agent answers in its professional voice, reading code and memory as
needed. No files change unless you ask for an artefact (e.g. *"…and save it as a test plan"*).

**You check**

- [ ] The answer cites real files, routes or seed data — not generic advice.
- [ ] Ask a follow-up from a different role to compare viewpoints.

Lab: [Lab 04 — Ask the roles](../labs/lab-04-ask-roles.md).

## Workflow 7 — Extend the suite with an end-to-end journey

**Command**

```
/tap-e2e A new user signs up, completes onboarding with a bank account, pays Arvilla_Hegmann $25
for "lunch", and Arvilla sees the notification.
```

**What happens:** `e2e-architect` designs the journey (steps, which layer does what: UI for the user
path, API for fast setup and verification, DB checks via `db.find`), chooses tags, then delegates spec
writing to `ui-automation`/`api-automation`. Journeys live in `playwright/tests/e2e/*.e2e.spec.ts` and run
with `npx playwright test --project=e2e` (decision D-006).

**You check**

- [ ] Setup that isn't under test is done through the API (fast), the journey itself through the UI.
- [ ] The journey asserts the **outcome** (balance, notification) not just that pages loaded.
- [ ] It runs in a reasonable time (< 60 s) and passes twice.

Lab: [Lab 12 — E2E journey](../labs/lab-12-e2e-journey.md).

## Quick map: situation → command

| Situation | Start with |
|---|---|
| I want the API to do something new | `/tap-change-api …` |
| I want the screen to look/behave differently | `/tap-change-ui …` |
| I have a feature idea | `/tap-feature …` |
| I edited code myself | `/tap-sync-tests --since tap26-base` |
| A test is red | `/tap-debug …` |
| I want an expert opinion | `/tap-ask <role> …` |
| I want a new test only | `/tap-new-test api\|ui\|e2e "…"` |
| Before committing | `/tap-review` |
| End of the day | `/tap-retro today` |

> **Try it** — Pick Workflow 6 and ask the same question to `manual` and `ui-auto`. Write down one
> thing each role noticed that the other did not.

Related: [04 Skills](04-skills.md) · [12 Prompting guide](12-prompting-guide.md) · [13 Troubleshooting](13-troubleshooting.md).
