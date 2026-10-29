# 01 · Getting started in VS Code

This guide takes you from a fresh machine to your first conversation with the TAP26 orchestrator.
It is the long version of the 5-minute quick start in the [README](../README.md). The hands-on
companion is [Lab 01 — Setup](../labs/lab-01-setup.md).

## 1. Prerequisites

| Tool | Version | Check with | Why |
|---|---|---|---|
| VS Code | 1.94 or newer | *Help → About* | hosts the Claude Code extension |
| Node.js | **22** (see `.nvmrc`) | `node --version` | runs the app, the tests and every TAP26 script |
| Yarn | **1.x classic** | `yarn --version` | the app's package manager (`yarn dev`, `yarn db:seed:dev`) |
| Git | any recent | `git --version` | lab branches (`tap26-base`), diffs for test-impact analysis; on Windows Claude Code uses Git Bash |
| Claude Code extension | latest | Extensions view | the chat panel where agents run |
| A Claude account | Pro/Max/Team/Enterprise or Console | — | you sign in on first use |

Notes:

- **Node 22 via a version manager** is easiest: `nvm install 22 && nvm use` (macOS/Linux) or
  `nvm-windows` / `fnm` on Windows. The repo's `.nvmrc` tells them which version to use.
- **Yarn 1**: `npm install -g yarn` or `corepack enable && corepack prepare yarn@1.22.22 --activate`.
- **Windows**: install **Git for Windows** (includes Git Bash). Claude Code uses Git Bash for its Bash
  tool, and the lab commands assume a Bash-style shell. TAP26 hooks are declared in *exec form*
  (`"command": "node"` plus `"args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>.mjs"]`), so they start
  `node` directly and do not depend on a particular shell. `node` must still be on your `PATH`
  (`node --version` in a new terminal). The doctor warns on Windows when Git Bash is missing.

## 2. Open the project and install the extension

1. *File → Open Folder…* → choose the repository root (it contains `package.json`, `CLAUDE.md`, `tap26/`).
2. Accept **Trust the authors** — otherwise extensions and tasks are disabled.
3. VS Code suggests the workspace's recommended extensions (from `.vscode/extensions.json`). Click
   *Install All*, or install **Claude Code** (publisher Anthropic) from the Extensions view.
4. Open the Claude panel: the **Spark** icon in the editor toolbar (top-right, appears when a file is
   open), the **✻ Claude Code** status-bar item, or *Command Palette → "Claude Code" → Open in New Tab*.
5. Sign in when the panel asks.

## 3. Create the TAP26 base branch

Labs work on branches made from a baseline branch called **`tap26-base`**, and lab resets switch back to
it. Create it once, before your first `/tap-setup`, in the VS Code terminal at the repo root. This works
in Git Bash, macOS and Linux:

```bash
# A. zip download, no git repository yet ("fatal: not a git repository" from git status)
git init -b tap26-base && git add -A && git commit -m "TAP26 baseline"

# B. already a git repository: commit or stash local work first, then
git switch -c tap26-base          # or: git switch tap26-base   if it already exists
```

`.gitignore` keeps `node_modules/`, test results and TAP26's local-only memory files out of the commit.
[Lab 01](../labs/lab-01-setup.md) step 0 walks through this with checkpoints.

## 4. First run

In the Claude prompt box type:

```
/tap-start
```

What happens:

1. The orchestrator asks `env-ops` to run `node tap26/scripts/doctor.mjs` (read-only checks of Node,
   Yarn, dependencies, Playwright browsers, ports 3000/3001/3100/3101, the DB file).
2. You get a ten-line explanation of TAP26, five useful commands and a recommended lab.
3. If dependencies are missing, run `/tap-setup` (installs the app with `CYPRESS_INSTALL_BINARY=0 yarn install`,
   then `playwright/` with `npm install` and `npx playwright install chromium`).
4. Start the app with `/tap-run`. Open http://localhost:3000 and log in as **`Heath93`** / **`s3cret`**.

> **Try it** — Ask in plain English: *"What is running on port 3001 and how do I check it is healthy?"*
> Notice that the orchestrator either answers directly or routes the question to `env-ops`.

## 5. Panel mode vs terminal mode

| | Panel (default) | Terminal mode |
|---|---|---|
| Looks like | a graphical chat with inline diffs | the classic CLI inside a VS Code terminal |
| Turn on | default | Settings → search `claudeCode.useTerminal` → tick |
| Diffs | side-by-side diff with Accept/Reject | diff opened in the editor by the CLI |
| Best for | students, reviewing changes | keyboard-first users, CLI-only features |

Where the panel opens is controlled by `claudeCode.preferredLocation` (`panel` = editor tab,
`sidebar` = right sidebar). The workspace `.vscode/settings.json` may already set this for you.

### Running the CLI from the integrated terminal

The extension bundles its own copy of Claude Code for the panel, but it does **not** put `claude` on your
`PATH`. To use the CLI, install it separately (see the official setup page), then in VS Code open the
integrated terminal (`` Ctrl+` `` / `` Cmd+` ``) at the repo root and run:

```bash
claude --agent tap-orchestrator     # start a session whose main thread IS the orchestrator
claude                              # normal session; CLAUDE.md still applies the orchestrator protocol
```

Inside the CLI everything works the same: `/tap-*` skills, agents, hooks and memory.

## 6. Permission prompts

Claude Code asks before doing things that change your machine. The mode indicator at the bottom of the
prompt box shows the current **permission mode**; click it to switch.

| Mode | Behaviour | Use it when |
|---|---|---|
| **Manual** | asks before edits and most shell commands, shows a diff first | you are learning — recommended |
| **Plan** | describes the plan and waits for approval, no edits | big or risky changes (`/plan …`) |
| **Edit automatically** | edits files without asking | you trust the task and will review the diff |
| **Auto** | a classifier reviews actions instead of asking you | experienced users |

TAP26's `.claude/settings.json` pre-allows safe, read-only commands (e.g. `node tap26/scripts/doctor.mjs`,
`git diff`, `npx playwright test`) and denies dangerous ones. Everything else prompts you. When a prompt
appears, read the **exact command** before choosing *Yes*. See [10 Hooks & guardrails](10-hooks-and-guardrails.md).

## 7. Recommended VS Code extensions

| Extension | Why you want it |
|---|---|
| **Claude Code** (Anthropic) | the agent panel |
| **Playwright Test for VS Code** (Microsoft) | run/debug tests from the Testing sidebar, pick locators, view traces |
| **ESLint** | inline lint warnings in app and test code |
| **Prettier – Code formatter** | consistent formatting (`npm --prefix playwright run format`) |
| **OpenAPI (Swagger) Editor** (42Crunch) | navigate and validate `tap26/openapi/openapi.yaml` |
| **Markdown Preview Mermaid Support** | renders the Mermaid diagrams in these docs |

All of them are listed in `.vscode/extensions.json`, so VS Code offers to install them.

## 8. VS Code tasks ("TAP: …")

The workspace defines tasks for the common scripts, so you can run them without the chat:
*Terminal → Run Task…* and type `TAP`. The entries:

| Task | Runs |
|---|---|
| TAP: Doctor | `node tap26/scripts/doctor.mjs` |
| TAP: Install all | TAP: Install app deps → TAP: Install Playwright deps → TAP: Install Chromium |
| TAP: Start app | `yarn dev` (background task, ready when Vite prints `ready in`) |
| TAP: Swagger UI | `node tap26/scripts/swagger-server.mjs` (http://localhost:3100) |
| TAP: Mock server | `node tap26/scripts/mock-server.mjs` (http://localhost:3101) |
| TAP: Test API | `npx playwright test --project=api` (in `playwright/`) |
| TAP: Test UI (desktop) | `npx playwright test --project=ui-desktop` |
| TAP: Test UI (mobile) | `npx playwright test --project=ui-mobile` |
| TAP: Test all | `npx playwright test` (all projects, including `e2e`) |
| TAP: Playwright report | `npx playwright show-report` |
| TAP: Scan app | `node tap26/scripts/scan-app.mjs` |
| TAP: Impact analysis | `node tap26/scripts/impact.mjs` |
| TAP: Spec drift | `node tap26/scripts/spec-drift.mjs` |
| TAP: Memory digest | `node tap26/scripts/memory.mjs digest` |
| TAP: Reset DB | `POST http://localhost:3001/testData/seed` |
| TAP: Framework check | `node tap26/scripts/check-framework.mjs --strict`: run it after changing agents, skills, hooks, docs or labs |

The authoritative list is `.vscode/tasks.json`.

### The TAP26 scripts from a terminal

Every script is zero-dependency Node, run from the repo root. The same scripts have npm aliases in
`tap26/package.json`: `npm --prefix tap26 run -s tap:<name>`, with flags after `--`
(e.g. `npm --prefix tap26 run -s tap:impact -- --since tap26-base`).

| Script | Common flags | Alias | What it does |
|---|---|---|---|
| `node tap26/scripts/doctor.mjs` | `--quick`, `--json` | `tap:doctor`, `tap:doctor:quick` | toolchain, deps, browsers, ports, app health → ✔ / ⚠ / ✘ table with fix commands |
| `node tap26/scripts/scan-app.mjs` | — | `tap:scan` | regenerates `tap26/knowledge/generated/` (routes, selectors, tests, coverage) |
| `node tap26/scripts/impact.mjs` | `--since <ref>`, `--staged`, `--write`, `--json` | `tap:impact` | test impact of your changes; `--write` saves to `tap26/reports/impact/` |
| `node tap26/scripts/spec-drift.mjs` | — | `tap:drift` | OpenAPI vs Express routes |
| `node tap26/scripts/swagger-server.mjs` | — | `tap:swagger` | Swagger UI on :3100 |
| `node tap26/scripts/mock-server.mjs` | — | `tap:mock` | mock API on :3101 |
| `node tap26/scripts/perf-smoke.mjs` | `--n 200 --c 10`, `--json` | `tap:perf` | p50/p95 latency probe |
| `node tap26/scripts/memory.mjs <cmd>` | see doc 05 | `tap:memory`, `tap:digest` | shared-memory CLI |
| `node tap26/scripts/check-framework.mjs` | `--strict`, `--json` | — | framework self-check: agent/skill frontmatter, references, paths, links, hook wiring |

Each script prints its usage when run with `--help` or no valid command.

> **Try it** — Run *TAP: Doctor* from *Terminal → Run Task*. Then ask the panel *"Explain the doctor
> output to me"*. Which way do you prefer, and why?

## 9. Checklist before moving on

- [ ] `git branch --list tap26-base` lists `tap26-base` (section 3)
- [ ] `node --version` prints v22.x and `yarn --version` prints 1.x
- [ ] `/tap-start` ran and the doctor shows no FAIL rows (or you know how to fix them)
- [ ] The app is running and you can log in at http://localhost:3000
- [ ] You know where the permission mode indicator is
- [ ] You can open the Testing sidebar (Playwright extension) and see the `api`, `ui-desktop`, `ui-mobile` and `e2e` projects

Next: [02 Architecture](02-architecture.md) and [Lab 02 — Run the app](../labs/lab-02-run.md).
Problems? See [13 Troubleshooting](13-troubleshooting.md).
