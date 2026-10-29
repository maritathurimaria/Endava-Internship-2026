---
name: tap-setup
description: "Install everything TAP26 needs, idempotently: checks Node against .nvmrc and Yarn 1, installs root app dependencies without the Cypress binary, installs the Playwright framework and Chromium, optionally seeds the database, then verifies with the doctor. Use on first checkout, after a git pull that changed package files, or when the doctor reports missing dependencies or browsers."
argument-hint: "[--seed] [--with-cypress] [--skip-app|--skip-playwright]"
allowed-tools: Bash(node --version), Bash(cat .nvmrc), Bash(yarn --version), Bash(node tap26/scripts/*)
---

# /tap-setup — install the toolchain

## Goal
Leave the machine in a state where `/tap-run` and `/tap-run-tests` work: correct Node, Yarn 1,
root `node_modules`, `playwright/node_modules` and a Chromium browser — safe to re-run any time.

## Inputs
`$ARGUMENTS` may contain any of these flags (empty = install app + Playwright, no seed, no Cypress binary):
- `--seed` — also reset `data/database.json` from the seed (`yarn db:seed:dev`). Wipes manual data: ask first.
- `--with-cypress` — install the Cypress binary too (only needed for the legacy `cypress/` suite).
- `--skip-app` / `--skip-playwright` — install only one half.

Snapshot at invocation:
- Node: !`node --version 2>/dev/null || true` (expected: !`cat .nvmrc 2>/dev/null || true`)
- Yarn: !`yarn --version 2>/dev/null || echo "not installed" || true`

## Steps
Delegate the whole procedure to the `env-ops` agent with this brief (it runs the commands, you report):

1. **Node version.** Compare `node --version` with `.nvmrc` (22.x; `package.json` engines allow `^22 || ^24`).
   If the major differs: stop and tell the student to run `nvm install && nvm use` (macOS/Linux, nvm),
   `nvm install 22 && nvm use 22` (Windows, nvm-windows), or install Node 22 LTS from nodejs.org. Do not continue on Node < 22.
2. **Yarn 1 classic.** If `yarn --version` fails or is not `1.x`: suggest `corepack enable` (ships
   with Node 22; may need an admin/elevated terminal on Windows) or `npm i -g yarn@1`. Re-check.
3. **Root app dependencies** (skip if `--skip-app`). From the repo root:
   - default: `CYPRESS_INSTALL_BINARY=0 yarn install --frozen-lockfile`
   - with `--with-cypress`: `yarn install --frozen-lockfile`
   - Windows (PowerShell, not Git Bash): `$env:CYPRESS_INSTALL_BINARY=0; yarn install --frozen-lockfile`.
   If the lockfile check fails, retry once without `--frozen-lockfile` and report that `yarn.lock` changed.
   `postinstall` runs `husky install && patch-package` — a husky warning outside a git repo is harmless.
4. **Playwright framework** (skip if `--skip-playwright`):
   `cd playwright && npm ci && npx playwright install chromium`
   - Linux CI / fresh containers may also need: `npx playwright install-deps chromium` (needs sudo — ask first).
   - Corporate proxy: set `HTTPS_PROXY` before installing browsers.
   - If `playwright/.env` is missing, copy `playwright/.env.example` to `playwright/.env` (defaults are fine).
5. **Database (only with `--seed`).** Confirm with the student, then `yarn db:seed:dev`
   (copies `data/database-seed.json` → `data/database.json`; 5 users, password `s3cret`).
6. **Verify.** `node tap26/scripts/doctor.mjs` — every install row must be PASS. Ports 3000/3001
   being down is expected if the app is not started yet (`/tap-run` handles that).

Platform notes for the student:
- **Windows:** use Git Bash or the VS Code terminal set to Git Bash for `VAR=value cmd` syntax; keep the
  repo path short (e.g. `C:\dev\rwa`) to avoid long-path errors; allow Node through the firewall when prompted.
- **macOS (Apple Silicon):** no Rosetta needed; if `npx playwright install` is slow, it is downloading ~150 MB once.
- **All:** never `sudo yarn install`; fix ownership of `~/.npm` / `~/.cache` instead.

## Quality gates
- Idempotent: re-running changes nothing when already installed (`yarn install` reports "Already up-to-date").
- `node tap26/scripts/doctor.mjs` shows Node, Yarn, root deps, Playwright deps and Chromium as PASS.
- `npm --prefix playwright run typecheck` succeeds (proves `@playwright/test` and types are installed).
- No changes to `backend/`, `src/`, `cypress/` or `data/` except `data/database.json` when `--seed` was approved.

## Output
Hand-off from `env-ops` in the standard format (Status / Changed files / Verification / Risks / Memory / Next).
Show the student a checklist:
```
[x] Node 22.x   [x] Yarn 1.x   [x] app deps   [x] playwright deps   [x] chromium   [ ] db seeded (skipped)
Next: /tap-run   then   /tap-run-tests api
```
List any WARN/FAIL with the exact fix command.

## Memory
- Record verified versions once: `node tap26/scripts/memory.mjs add-fact env "Setup verified: node <v>, yarn <v>, @playwright/test 1.56.0" --by env-ops`
- Any install gotcha that cost time (proxy, permissions, OS quirk):
  `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<fix>" --tags setup,<os> --applies env-ops,tap-setup --by env-ops`

## Learn more
- `tap26/docs/01-getting-started-vscode.md`, `tap26/docs/13-troubleshooting.md`, `tap26/docs/07-testing-framework.md`
- `playwright/README.md` (Quick start)
- Lab: `tap26/labs/lab-01` (setup)
