# Lab 06 — Your first UI test (desktop and mobile)

**Level:** ★★☆ · **Time:** 60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-new-test`, `/tap-run-tests`, `/tap-explain` · `ui-automation`, `tutor`

## Learning objectives

1. Have `ui-automation` write a UI test that uses `data-test` selectors, fixtures and programmatic login.
2. Cross-check UI against data: expected values come from the seed (via the `users` fixture), not hard-coded strings.
3. Make one test pass on **both** `ui-desktop` and `ui-mobile` and explain what differs.
4. Debug a UI test with the trace viewer and the VS Code Playwright extension.

## Prerequisites

- [Lab 05](lab-05-first-api-test.md).

## Background

UI specs in `playwright/tests/ui/` import `test`/`expect` from `@fixtures/ui` (which gives you `page`
with the app's XState services exposed, plus `users` = seeded users) and helpers from `@ui`:

- `loginByXstate(page, username)` — fast login through the app's auth machine (no form typing),
- `bySel(page, id)` / `bySelLike(page, fragment)` — `data-test` locators,
- `openSideNavOnMobile` / `withSideNav` — the app turns the side nav into a drawer below 600 px (MUI
  `xs`); the tests' `isMobile()` treats < 414 px as mobile and the `ui-mobile` project uses 375 px,
- `formatCents` from `@utils/money` — the API stores cents; the UI shows `$1,509.53`.

Today's target is the **side-nav profile card** (`src/components/NavDrawer.tsx`):
`sidenav-user-full-name` (first name + first letter of the last name), `sidenav-username` (`@Heath93`)
and `sidenav-user-balance`.

## Steps

### 0. Branch

```bash
git switch -c lab/06-first-ui-test
```

### 1. Predict before you prompt (human step)

Open `data/database-seed.json`, find user `Heath93`. Write down what the side nav *should* show for
name, username and balance. (Hint: balance `150953` cents.)

### 2. Ask for the test

```
/tap-new-test ui create playwright/tests/ui/sidenav-profile.spec.ts — after loginByXstate as users[0], the side nav shows full name "<firstName> <first letter of lastName>", "@<username>" and the balance formatted from users[0].balance with formatCents. Derive all expected values from the users fixture, no hard-coded names. Must pass on ui-desktop and ui-mobile (use withSideNav or openSideNavOnMobile).
```

**Observe:** did the agent read `NavDrawer.tsx` to learn the name format, or guess? Check the hand-off
for which projects it ran.

### 3. Run it on both viewports

```
/tap-run-tests ui tests/ui/sidenav-profile.spec.ts
```

```
/tap-run-tests mobile tests/ui/sidenav-profile.spec.ts
```

### 4. Watch it run (VS Code)

Open `playwright/tests/ui/sidenav-profile.spec.ts`. In the **Testing** view (flask icon), tick
*Show browser* and run the test from the ▶ gutter icon. Then run it with the debug config
**TAP: Debug Playwright current spec** (*Run and Debug* view, `F5`) and set a breakpoint on the balance assertion.

### 5. Read a trace

Break the test on purpose: change the expected username prefix from `@` to `#`. Run:

```bash
cd playwright
npx playwright test tests/ui/sidenav-profile.spec.ts --project=ui-desktop --trace=on
npx playwright show-trace test-results/*/trace.zip
```

**Observe:** the action timeline, the DOM snapshot at the failing step and the network tab (the
`/checkAuth` call). Revert your change.

### 6. Ask the tutor about the hard part

```
/tap-explain why does the balance check need openSideNavOnMobile on ui-mobile but not on ui-desktop? Point me to the code that decides.
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Spec exists | file `playwright/tests/ui/sidenav-profile.spec.ts` | exists |
| 2 | Desktop green ×2 | in `playwright/`: `npx playwright test tests/ui/sidenav-profile.spec.ts --project=ui-desktop --repeat-each=2` | all passed |
| 3 | Mobile green ×2 | same with `--project=ui-mobile` | all passed |
| 4 | No hard-coded data | `node -e "const s=require('fs').readFileSync('playwright/tests/ui/sidenav-profile.spec.ts','utf8');console.log(/Heath93|Parisian|1,509/.test(s))"` | `false` |
| 5 | No hard waits | `node -e "const s=require('fs').readFileSync('playwright/tests/ui/sidenav-profile.spec.ts','utf8');console.log(/waitForTimeout/.test(s))"` | `false` |
| 6 | Typecheck | `npm --prefix playwright run typecheck` | exit 0 |

## Stretch goals

- Add a test that the balance **changes** after a payment created through the API (`@api` helpers in a
  fixture, then `page.reload()`). Who should own that test — `ui-automation` or `e2e-architect`?
- Use the Playwright extension's *Pick locator* to hover the balance. Which locator does it suggest?
  Why does this framework prefer `bySel`?
- Ask `a11y-auditor` whether "Ted P" is a good accessible name for the avatar/profile card.

## Reflection questions

1. Did the agent derive expected values from data, as asked? If it hard-coded something, why do you
   think it did — and how would you prompt to prevent it next time?
2. What did the trace show you that the terminal output did not?
3. How long did the agent take vs. how long you would have taken? Where did *you* add the most value?
4. Which instruction in your prompt was the agent most likely to ignore? Why?

## Reset

```bash
git restore data/database.json
git add -A playwright && git commit -m "lab 06: side nav profile UI test"
git switch tap26-base
```

## Instructor notes

- Name format: `{currentUser.firstName} {head(currentUser.lastName)}` → `"Ted P"`. Agents that skip
  reading `NavDrawer.tsx` often assert the full last name.
- Balance: `formatCents(users[0].balance)` → `"$1,509.53"` for the default seed. The UI uses
  `formatAmount` (dinero.js); `formatCents` matches it for USD.
- Mobile: the profile card is inside the drawer; `withSideNav(page, () => …)` opens and closes it.
  On desktop it is always visible (`openSideNavOnMobile` is a no-op there).
- `show-trace` glob may need quoting on Windows PowerShell; the HTML report (`npm run report`) also links traces.
- Keep this spec: Lab 09 renames `sidenav-user-balance` and this test should be part of the impact.
