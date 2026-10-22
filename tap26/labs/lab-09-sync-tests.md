# Lab 09 — Sync the tests after a hand-made change

**Level:** ★★☆ · **Time:** 45–60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-sync-tests`, `/tap-scan`, `/tap-run-tests` · `test-impact-analyst`, `ui-automation`, `knowledge-curator`

## Learning objectives

1. Predict the test impact of a selector rename **before** running anything.
2. Use `impact.mjs` and `/tap-sync-tests` to turn a git diff into a test update plan and repaired tests.
3. Explain why the change ledger missed your edit and why the git diff did not.
4. Judge a repair: update tests vs. revert the rename vs. keep a backward-compatible selector.

## Prerequisites

- [Lab 06](lab-06-first-ui-test.md) (your `sidenav-profile.spec.ts` uses the balance selector).
- App running.

## Background

`data-test` attributes are the contract between `src/` and the tests. When a developer renames one by
hand (no agent involved), three things can drift: Playwright specs, the Cypress reference suite and the
generated knowledge (`tap26/knowledge/generated/ui-selectors.md`). The **change ledger**
(`tap26/memory/changes.md`) is written by a hook only when an *agent* edits `backend/`, `src/` or
`data/`; `impact.mjs` therefore also reads `git diff` to catch human edits.

Partial selectors make impact harder to see: `bySelLike(page, "user-balance")` matches *any*
`data-test` containing `user-balance` — renaming the attribute silently breaks it.

## Steps

### 0. Branch and baseline

```bash
git switch -c lab/09-sync-tests lab/06-first-ui-test   # includes your sidenav-profile spec
cd playwright
npx playwright test tests/ui/new-transaction.spec.ts --project=ui-desktop
npx playwright test --project=e2e
cd ..
```

**Expected:** all green. Without a green baseline you cannot attribute failures to your change.

### 1. Predict (human step, 5 minutes)

Search the repo for the selector in VS Code (`Ctrl+Shift+F`): `user-balance`. Write down every test
you expect to break if `sidenav-user-balance` becomes `sidenav-balance`. Include partial matches.

### 2. Make the change by hand (not with Claude)

Open `src/components/NavDrawer.tsx`, find `data-test="sidenav-user-balance"` and change it to:

```tsx
data-test="sidenav-balance"
```

Save. Vite hot-reloads the UI. Check the ledger — your edit is **not** there:

```bash
node tap26/scripts/memory.mjs search NavDrawer
```

### 3. See the raw impact

```bash
node tap26/scripts/impact.mjs --write
```

(also task **TAP: Impact analysis**). `--write` also saves the report as
`tap26/reports/impact/impact-<YYYYMMDD-HHmm>.md` — open it in VS Code. **Observe:** removed/added selectors and the specs that reference
them. Compare with your prediction from step 1. Did the script catch the `bySelLike` partial match?

### 4. Let the agents repair the tests

```
/tap-sync-tests
```

**Observe:** the `test-impact-analyst` report (impacted tests, why, proposed edits), then
`ui-automation` updating specs and running them **twice** on desktop and mobile (the balance is read
inside the mobile drawer). Did it also find the `e2e` journey? If not, ask:
*"Does anything in playwright/tests/e2e use the old selector?"*

### 5. Challenge the repair

```
/tap-ask ui-auto you replaced bySelLike(page, "user-balance"). Was a partial match still the right choice, or should the tests use the exact selector now? What about cypress/tests/ui/new-transaction.spec.ts?
```

### 6. Refresh the knowledge

```
/tap-scan
```

Then confirm `tap26/knowledge/generated/ui-selectors.md` lists `sidenav-balance` and no longer
lists `sidenav-user-balance`.

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Rename in source | `git diff tap26-base -U0 -- src/components/NavDrawer.tsx` | `-` line with `sidenav-user-balance`, `+` line with `sidenav-balance` |
| 2 | No stale selector in Playwright | `git grep -n --untracked "user-balance" -- playwright` | no output |
| 3 | Desktop green ×2 | in `playwright/`: `npx playwright test tests/ui/new-transaction.spec.ts tests/ui/sidenav-profile.spec.ts --project=ui-desktop --repeat-each=2` | `0 failed` |
| 4 | Mobile green ×2 | same with `--project=ui-mobile` | `0 failed` |
| 4b | E2E journey green | in `playwright/`: `npx playwright test --project=e2e` | `0 failed` (`tests/e2e/pay-a-friend.e2e.spec.ts` also reads the balance with `bySelLike(page, "user-balance")`) |
| 5 | Knowledge refreshed | `node -e "const t=require('fs').readFileSync('tap26/knowledge/generated/ui-selectors.md','utf8');console.log(t.includes('sidenav-balance'),t.includes('sidenav-user-balance'))"` | `true false` |
| 6 | Impact report saved | `node -e "console.log(require('fs').readdirSync('tap26/reports/impact').filter(f=>f.startsWith('impact-')).length>0)"` | `true` |
| 7 | Impact recorded in memory | `node tap26/scripts/memory.mjs search sidenav-balance` | at least one entry (ledger/intent or learning) |

(If you skipped Lab 06, branch from `tap26-base` in step 0 and drop `tests/ui/sidenav-profile.spec.ts` from checkpoints 3–4.)

## Stretch goals

- Instead of renaming, make the change **backward compatible**: keep `sidenav-user-balance` on the
  element and expose the new name elsewhere? (Hint: one element can only have one `data-test`.) Discuss
  with `/tap-ask fe` what a deprecation path for selectors could look like.
- Repeat with a backend change: rename the JSON key `pageData.totalPages` in one route of
  `backend/transaction-routes.ts`, run `/tap-sync-tests`, and see whether UI *and* API impact is found.
- `/tap-sync-tests --since tap26-base` after committing — does the result differ from the uncommitted run?

## Reflection questions

1. How close was your prediction to the impact report? What did you miss, and what did the script miss?
2. Should an agent update tests to follow a renamed selector automatically, or first ask whether the
   rename was intended? Where in TAP26 would you encode that rule?
3. The ledger is blind to manual edits. What other blind spots does an agentic workflow have?
4. What would you add to `impact.mjs` so partial `bySelLike` matches are never missed?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 09: rename sidenav balance selector + synced tests"
git switch tap26-base
```

Switching back restores `sidenav-user-balance` in `src/` — and the tests on `tap26-base` still expect it.

## Instructor notes

- Expected impact: `playwright/tests/ui/new-transaction.spec.ts` — one `bySel(page, "sidenav-user-balance")`
  and three `bySelLike(page, "user-balance")`; two `bySelLike(page, "user-balance")` in
  `playwright/tests/e2e/pay-a-friend.e2e.spec.ts` (easy to miss: different project); the student's
  `sidenav-profile.spec.ts`; plus `cypress/tests/ui/new-transaction.spec.ts` (reference suite — report,
  don't necessarily fix).
- `bySelLike(page, "balance")` would be the lazy fix; push for the exact `bySel(page, "sidenav-balance")`.
- If tests still fail after sync, the student probably didn't save the file or Vite shows a compile
  error overlay — check the browser.
- Good debate for question 2: TAP26's CLAUDE.md says *"Keep data-test selectors stable; if one must
  change, run /tap-sync-tests"* — the policy is "change on purpose, then sync", not "never change".
