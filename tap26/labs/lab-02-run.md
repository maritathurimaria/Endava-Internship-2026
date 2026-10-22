# Lab 02 — Run the app and the test suite

**Level:** ★☆☆ · **Time:** 30–45 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-run`, `/tap-run-tests`, `/tap-data` · `env-ops`, `debugger`, `data-tester`

## Learning objectives

1. Start the Real World App (UI :3000, API :3001) through an agent and through a VS Code task.
2. Log in with a seeded user and reset the database to the seed.
3. Run the Playwright `api`, `ui-desktop` and `ui-mobile` projects and read the HTML report.
4. Explain why every test reseeds the database and what that means for manual work.

## Prerequisites

- [Lab 01](lab-01-setup.md) — dependencies installed, doctor green apart from ports.

## Background

The RWA is a React + Vite frontend (`src/`) and an Express + lowdb backend (`backend/`). `yarn dev`
starts both with `concurrently`; the API runs under **nodemon**, so edits in `backend/` restart it
automatically. The database is one JSON file, `data/database.json`. `POST /testData/seed` copies the
seed (`data/database-seed.json`: 5 users, 600 transactions, password `s3cret`) over it.

The Playwright framework (`playwright/`) has four projects: `api` (no browser), `ui-desktop`
(1280×1000), `ui-mobile` (375×667) and `e2e` (cross-layer journeys, desktop viewport — Lab 12). Every test **reseeds** via an auto-fixture, so tests are
independent — and anything you created by hand in the browser disappears when tests run.

## Steps

### 0. Branch

```bash
git switch -c lab/02-run
```

### 1. Start the app through an agent

```
/tap-run
```

**Observe:** `env-ops` starts `yarn dev` in the background and polls both ports before saying "healthy".
If the app was already running it should *detect that* instead of starting a second copy.

> Alternative: *Terminal → Run Task… → **TAP: Start app***. The task is a *background* task: VS Code
> marks it ready when Vite prints `ready in … ms`.

### 2. Use the app like a user

Open http://localhost:3000 and sign in as **`Heath93`** / **`s3cret`** (Ted Parisian). Note the balance
in the side navigation, open *Notifications*, then create a $5 payment to any contact.

### 3. Ask about what you just saw

```
/tap-ask data which seeded user has the lowest balance, and how many notifications does Heath93 have in the seed?
```

**Observe:** a good answer reads `data/database-seed.json` (or `GET /testData/users`) and cites it.
Balances are stored **in cents** — check whether the agent noticed.

### 4. Reset the database

```
/tap-data reset
```

Reload the browser: your $5 payment is gone. Equivalent without an agent:

```bash
node -e "fetch('http://localhost:3001/testData/seed',{method:'POST'}).then(r=>console.log('reseed',r.status))"
```

(also available as task **TAP: Reset DB**).

### 5. Run the API tests

```
/tap-run-tests api
```

**Observe:** the summary should give counts (passed/failed/skipped) and duration, not a wall of logs.

### 6. Run the UI tests on desktop and mobile

```
/tap-run-tests ui "Bank Accounts"
```

```
/tap-run-tests mobile "toggles the navigation drawer"
```

Then open the report: task **TAP: Playwright report**, or in `playwright/`: `npm run report`.

### 7. Run a test from the editor

Open `playwright/tests/ui/bankaccounts.spec.ts`. With the Playwright extension installed, a green ▶
appears next to each `test(`. Run "creates a new bank account" from the gutter, then open the
**Testing** view (flask icon) and pick the `ui-desktop` project.

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | UI up | `node -e "fetch('http://localhost:3000').then(r=>console.log(r.status))"` | `200` |
| 2 | API up, auth enforced | `node -e "fetch('http://localhost:3001/checkAuth').then(r=>console.log(r.status))"` | `401` |
| 3 | Seed endpoint | `node -e "fetch('http://localhost:3001/testData/users').then(r=>r.json()).then(j=>console.log(j.results.length))"` | `5` (after a reseed) |
| 4 | API suite green | in `playwright/`: `npm run test:api` | `… passed`, `0 failed` |
| 5 | Report exists | file `playwright/playwright-report/index.html` | exists |
| 6 | Doctor | `node tap26/scripts/doctor.mjs` | ports 3000 and 3001 UP |

## Stretch goals

- Run the whole suite twice in a row (`npm test` in `playwright/`). Any test that passes once and fails
  once is **flaky** — ask `/tap-debug failing test <title>` about it.
- Start the app empty: stop `yarn dev`, run `yarn start:empty`, log in fails (no users). What does
  that tell you about test data dependencies? Restart with `yarn dev` afterwards.
- Ask: `/tap-explain why are Playwright workers set to 1 in playwright/playwright.config.ts?`

## Reflection questions

1. Did `/tap-run` check whether the app was already up before starting it? Why does that matter?
2. When tests failed (if any), did the agent show you the *first* useful error line or the whole log?
3. The agent needed to know the seed password. Where did it find it — memory, `.env`, `playwright/.env.example`?
4. How would you prompt differently to get only the failing tests re-run?

## Reset

```bash
git status --short                   # data/database.json changes are runtime state
git restore data/database.json       # never commit the runtime DB file
git switch tap26-base
git branch -D lab/02-run
```

Leave the app running for the next labs.

## Instructor notes

- **Port already in use (3000/3001):** another `yarn dev` is running (often in a second VS Code window).
  The doctor shows which port; `/tap-doctor port 3001 in use` explains how to find the PID.
- **Port 3001 taken by something else:** the API uses `detect-port` (`src/utils/portUtils.ts`) and
  *silently* starts on the next free port, while the UI still calls :3001. Symptom: login fails, but
  `yarn dev` shows no error. Check that :3001 is really the RWA:
  `node -e "fetch('http://localhost:3001/testData/users').then(r=>console.log(r.status))"` must print `200`.
- **Vite ready but API not:** `nodemon` crashed on a TypeScript error in `backend/`; the API terminal
  shows `app crashed - waiting for file changes`.
- `data/database.json` is tracked by git but changes constantly — tell students to `git restore` it,
  never commit it.
- UI tests need the UI and the API; API tests only need the API. A failing `ui-*` run with a green `api`
  run usually means Vite is down.
- At the start of the course expect about 70+ API tests (functional + contract) and about 75 UI tests per
  viewport project, plus one `e2e` journey; numbers grow as labs add tests. In `playwright/`,
  `npx playwright test --list --project=api` (or `--project=ui-desktop`) prints the exact count.
