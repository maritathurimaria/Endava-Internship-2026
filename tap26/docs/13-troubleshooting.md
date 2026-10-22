# 13 · Troubleshooting

Start every investigation with the doctor — it checks most of the things on this page in seconds:

```bash
node tap26/scripts/doctor.mjs          # or /tap-doctor, or the "TAP: Doctor" task
```

Still stuck? `/tap-debug <symptom>` hands the problem to the `debugger` agent. Paste exact error text.

## Quick index

| Symptom | Jump to |
|---|---|
| `EADDRINUSE`, app won't start | [Ports busy](#ports-busy) |
| Odd install errors, `engine` warnings | [Wrong Node version](#wrong-node-version) |
| `yarn: command not found` | [Yarn missing](#yarn-missing) |
| `browserType.launch: Executable doesn't exist` | [Playwright browsers missing](#playwright-browsers-missing) |
| Tests fail on counts/names after you used the app | [Tests fail because of data](#tests-fail-because-of-data) |
| `blocked by CORS policy` | [CORS errors](#cors-errors) |
| Ledger/journal stay empty, guard never triggers | [Hooks do not fire (Windows)](#hooks-do-not-fire-windows) |
| `/tap-…` not in the menu | [Skill not showing](#skill-not-showing-in-the--menu) |
| Main chat does the work itself | [Agent not delegating](#agent-not-delegating) |
| Agents "forget" recent facts | [Memory digest stale](#memory-digest-stale) |
| `fatal: invalid reference: tap26-base`, `not a git repository`, husky fails on install | [No tap26-base branch](#no-tap26-base-branch) |

## Ports busy

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3001` or Vite picks port 3001+1.

| Port | Used by |
|---|---|
| 3000 | UI (Vite) |
| 3001 | API (Express) |
| 3100 | Swagger UI server |
| 3101 | mock API server |

**Fix:** find and stop the old process — usually a previous `yarn dev` in another terminal.

```bash
# macOS / Linux
lsof -i :3001            # note the PID
kill <PID>
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

Avoid `pkill -f <pattern>` from inside Claude — it can kill the shell running it (learning L-005).

## Wrong Node version

**Symptom:** install fails with native-module errors, `The engine "node" is incompatible`, or
ts-node crashes. **Fix:** use Node 22 (`.nvmrc`):

```bash
nvm install && nvm use      # reads .nvmrc
node --version              # v22.x
```

Reopen VS Code (or the terminal) after switching so the Claude panel and tasks see the new version.

## Yarn missing

**Symptom:** `yarn: command not found`, or `yarn --version` prints 2.x/3.x/4.x.
**Fix:** `npm install -g yarn` or `corepack enable && corepack prepare yarn@1.22.22 --activate`. The
app needs **Yarn 1 classic**.

## Playwright browsers missing

**Symptom:** `browserType.launch: Executable doesn't exist at …/chromium-…`.
**Fix:**

```bash
cd playwright && npm install && npx playwright install chromium
# Linux CI/containers may also need: npx playwright install --with-deps chromium
```

`/tap-setup` does both.

## Tests fail because of data

**Symptom:** a test that passed yesterday fails on a count, name or balance after you clicked around the
app or ran `yarn db:seed`.

- Each test re-seeds via `POST /testData/seed`, so manual clicks are wiped — but **`yarn db:seed`
  regenerates** `data/database-seed.json` with new random data and breaks expectations. Restore it:
  `git checkout data/database-seed.json`, then `yarn db:seed:dev`.
- If the API was down when a test started, the seed fixture fails first — check the first error.
- Tests run serially (`workers: 1`) on purpose; don't raise workers.

## CORS errors

**Symptom:** browser console `Access to fetch at 'http://localhost:3001/…' from origin 'http://localhost:3100' has been blocked by CORS policy`.

The API only allows the origin `http://localhost:3000` with credentials.

- In **Swagger UI**, choose the **`/api`** server (same-origin proxy), not `http://localhost:3001`.
- From **your own page or tool**, call the API from Node/curl/Playwright, not from a browser on another origin.
- In **Playwright stubs**, use `stubApi`/`transformApi` — they add the CORS headers the app needs.

## Hooks do not fire (Windows)

**Symptoms:** `tap26/memory/changes.md` never grows after edits, no journal file for today, dangerous
commands aren't blocked.

1. TAP26 hooks use **exec form** (`"command": "node"`, `"args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>.mjs"]`),
   so they start `node` directly and do not depend on Git Bash or PowerShell. The usual cause is that
   `node` is not on the `PATH` VS Code was started with. Run `node --version` in a **new** VS Code
   terminal. If it fails, reinstall Node with "Add to PATH" (or fix `nvm-windows`/`fnm`), then restart
   VS Code completely.
2. Still install **Git for Windows**: Claude Code's Bash tool uses Git Bash, and the lab commands assume
   it. `node tap26/scripts/doctor.mjs` warns on Windows when Git Bash is missing (set
   `CLAUDE_CODE_GIT_BASH_PATH` if it is installed somewhere unusual).
3. Check the wiring: `node tap26/scripts/check-framework.mjs --strict` reports any hook in
   `.claude/settings.json` that points to a missing script.
4. Check hooks aren't disabled: look for `"disableAllHooks": true` in `.claude/settings.local.json` or
   your user `~/.claude/settings.json`.
5. Open **Customize → Hooks** in the panel (or `/hooks` in the CLI) — are TAP26 hooks listed?
6. Run one by hand: `echo '{}' | node .claude/hooks/session-start.mjs` — it should print JSON.
7. Start a **new** session after changing settings.

## Skill not showing in the `/` menu

- Is the workspace opened at the **repo root**? Skills are read from `<root>/.claude/skills/`.
- Does the folder contain `SKILL.md` (exact name) with valid frontmatter (`name`, `description`)?
  A YAML error (e.g. an unquoted `:` in the description) hides the skill.
- Did you start a new session after adding it? Try *Developer: Reload Window*.
- Browse **Customize → Slash commands** in the panel to search the full list.

## Agent not delegating

**Symptom:** the main chat does everything itself, or the wrong agent runs.

- Name the agent explicitly: *"Use the **ui-automation** agent to…"*.
- Use the skill — skills name the agent for every step.
- Check the agent file exists in `.claude/agents/` and its `description` matches your wording.
- Only `tap-orchestrator`, `qa-lead` and `e2e-architect` can delegate further. A `be-dev` cannot call
  `api-automation` — it hands back to the orchestrator (by design: depth ≤ 3).
- For terminal users: `claude --agent tap-orchestrator` makes the orchestrator the main thread.

## Memory digest stale

**Symptom:** agents don't know a fact or learning that is in `facts.md` / `learnings.md`.

```bash
node tap26/scripts/memory.mjs digest     # rebuild MEMORY.md
```

Then start a new session (`/clear` or a new tab) so `CLAUDE.md` re-imports the digest. Check that the
entry was written with `memory.mjs` (correct format) — hand-edited entries in the wrong format are skipped.

## No tap26-base branch

**Symptoms:** a lab reset says `fatal: invalid reference: tap26-base`, `git status` says
`fatal: not a git repository`, or `yarn install` fails in `husky install`.

The labs expect a baseline branch called `tap26-base` (see [Lab 01](../labs/lab-01-setup.md) step 0).
From the repo root, in Git Bash, macOS or Linux:

```bash
# zip download, no repository yet
git init -b tap26-base && git add -A && git commit -m "TAP26 baseline"
# existing repository: commit or stash your work first, then
git switch -c tap26-base
```

Then re-run `/tap-setup` if the install had failed.

## Other common problems

| Problem | Fix |
|---|---|
| Not logged in · Please run /login | sign in again; *Developer: Reload Window* if the screen doesn't appear |
| `claude: command not found` in the terminal | the extension doesn't add `claude` to PATH — install the standalone CLI |
| `yarn types` fails after an agent change | ask the owning agent to fix it; gate 1 must pass |
| A test only fails on `ui-mobile` | the side nav and filters are **drawers** below 600 px (tests treat < 414 px as mobile); use the navigation helpers (L-001) |
| `waitForApi` never resolves | start it **before** the action (L-004); check method/path/GraphQL operation |
| The permission prompt appears for every command | that's Manual mode — fine while learning; see doc 01 §5 |
| An agent edited files you didn't expect | `git diff` to review, `git restore <file>` to undo (asks first) |

Related: [01 Getting started](01-getting-started-vscode.md) · [10 Hooks](10-hooks-and-guardrails.md) ·
[14 FAQ](14-faq.md) · [Lab 13 — Debugging](../labs/lab-13-debugging.md).
