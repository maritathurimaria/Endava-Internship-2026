# Lab 01 — Set up your agentic workbench

**Level:** ★☆☆ · **Time:** 30–45 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-start`, `/tap-setup`, `/tap-doctor` · `tap-orchestrator`, `env-ops`, `tutor`

## Learning objectives

By the end of this lab you can:

1. Open the repository in VS Code with the Claude Code extension and the recommended extensions installed.
2. Install the app and the Playwright framework **through an agent** and explain what it ran.
3. Read the environment doctor's report and fix one problem it finds.
4. Name the four building blocks of TAP26: agents, skills, memory, hooks.

## Prerequisites

- Git, Node **22** (see `.nvmrc`), Yarn **1.x**, VS Code 1.94+.
- A Claude account you can sign in with.
- Windows: Git for Windows (Git Bash) — Claude Code runs shell commands and hooks through it.

## Background

Claude Code is an **agent**: it reads files, runs commands and edits code in a loop until a goal is met.
TAP26 adds a **team** on top: `CLAUDE.md` tells the main chat to behave like an orchestrator,
`.claude/agents/*.md` define 24 agents (an orchestrator + 23 specialists), `.claude/skills/*/SKILL.md` define `/tap-*` commands
(fixed pipelines), `.claude/hooks/*.mjs` enforce guardrails and `tap26/memory/` is what the team
remembers between sessions. You will *ask* for setup instead of typing install commands yourself, then
**verify** what the agent did — the core habit of agentic work: delegate, then check.

## Steps

### 0. Create the TAP26 base branch

Every lab starts from a branch called **`tap26-base`**: a commit of the project exactly as you received
it. Lab resets switch back to it, and several checkpoints compare your work against it
(`git diff tap26-base -- …`). You create it once, here.

Open the VS Code terminal (`` Ctrl+` `` / `` Cmd+` ``) at the repository root. The commands work in
Git Bash (Windows), macOS and Linux terminals. Pick the case that matches your folder:

**A — you downloaded a zip (no git repository yet).** Check with `git status`: it prints
`fatal: not a git repository`. Then:

```bash
git init -b tap26-base
git add -A
git commit -m "TAP26 baseline"
```

`node_modules/`, `playwright/node_modules/`, `test-results/` and other generated folders are excluded by
`.gitignore`, so the commit contains only the project files. (If git asks *"Please tell me who you are"*,
run `git config user.name "Your Name"` and `git config user.email "you@example.com"`, then commit again.)

**B — the folder is already a git repository** (you cloned it). Commit or stash any local work first
(`git status --short` should print nothing), then:

```bash
git switch -c tap26-base       # first time
# git switch tap26-base        # if the branch already exists
```

Now create this lab's branch from it:

```bash
git switch -c lab/01-setup
```

> Do this **before** step 3: `yarn install` runs `husky install`, which needs a `.git` folder.

### 1. Open the folder and install the recommended extensions

1. *File → Open Folder…* → the repository root. Click **Trust**.
2. VS Code shows *"This workspace has extension recommendations"* → **Install All**.
   (Or *Command Palette* → `Extensions: Show Recommended Extensions`.) The list comes from
   `.vscode/extensions.json`: Claude Code, Playwright Test, ESLint, Prettier, OpenAPI, Markdown Mermaid, YAML.
3. Open the Claude Code panel (Spark icon in the editor toolbar or *Command Palette → "Claude Code"*). Sign in.

**Observe:** the panel opens in the sidebar because `.vscode/settings.json` sets
`"claudeCode.preferredLocation": "sidebar"`.

### 2. Meet the orchestrator

In the Claude Code prompt box type:

```
/tap-start I am new to agentic testing; I know a bit of JavaScript
```

**Observe:** the doctor runs (you may be asked to approve a `node tap26/scripts/doctor.mjs` command),
you get a ten-line tour and a recommended lab. Note which **permission prompts** appeared and why.

### 3. Install everything through an agent

```
/tap-setup
```

**Observe** the plan before it runs. It should:

- check `node --version` against `.nvmrc` and `yarn --version` (1.x),
- run `CYPRESS_INSTALL_BINARY=0 yarn install` (skips the 500 MB Cypress binary),
- run `npm ci` (or `npm install`) in `playwright/` and `npx playwright install chromium`,
- finish with the doctor.

> Prefer VS Code tasks? *Terminal → Run Task… → **TAP: Install all*** does the same three steps
> without an agent. Try it later and compare.

### 4. Ask the doctor directly

```
/tap-doctor
```

Then ask a follow-up in plain English:

```
Which of the doctor's checks would fail if I had Node 18 installed, and how would I fix it on my OS?
```

**Observe:** does the answer cite `.nvmrc` and the doctor script, or does it guess?

### 5. Look under the hood

Ask the tutor to map what you just used:

```
/tap-explain in 10 bullet points: what happened when I typed /tap-setup — which files were read, which agent ran, which commands executed, and which hook (if any) fired?
```

Open the files it mentions in the editor: `.claude/skills/tap-setup/SKILL.md`, `.claude/agents/env-ops.md`,
`.claude/settings.json`. Skim the frontmatter of each.

### 6. Check the shared memory

```bash
node tap26/scripts/memory.mjs show
```

**Observe:** the digest (`tap26/memory/MEMORY.md`) is what every new session is given at start-up.

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 0a | Base branch exists | `git rev-parse --abbrev-ref tap26-base` | `tap26-base` (and `git branch --show-current` prints `lab/01-setup`) |
| 0b | Framework committed on the base | `git ls-tree -r --name-only tap26-base -- CLAUDE.md .claude/settings.json` | lists both files |
| 1 | Node version | `node --version` | starts with `v22.` |
| 2 | Yarn classic | `yarn --version` | starts with `1.` |
| 3 | App deps installed | `node -e "require.resolve('vite/package.json')"` | no output, exit code 0 |
| 4 | Playwright installed | in `playwright/`: `npx playwright --version` | `Version 1.56.0` |
| 5 | Specs discoverable | in `playwright/`: `npx playwright test --list --project=api` | last line `Total: <n> tests in <m> files` — about 70+ API tests at the start of the course (the command prints the exact number; it grows as labs add tests) |
| 6 | Doctor | `node tap26/scripts/doctor.mjs` | every dependency row OK; ports 3000/3001 may be DOWN (you start the app in Lab 02) |
| 7 | Extensions | VS Code Extensions view → *Recommended* | all seven show as installed |

## Stretch goals

- Run **TAP: Doctor** from *Terminal → Run Task…* and compare its output with `/tap-doctor`. What does
  the agent add on top of the raw script?
- Break something on purpose: rename `playwright/node_modules` to `node_modules_x`, run `/tap-doctor`
  and see whether it diagnoses the cause and proposes the right fix. Rename it back afterwards.
- Read `.claude/settings.json` and list every hook event TAP26 uses (SessionStart, PreToolUse, …).

## Reflection questions

1. Which steps did the agent do that you would have got wrong or forgotten by hand?
2. Where did it ask for permission, and was each prompt one you understood well enough to approve?
3. What context did the agent need that it found by itself (`.nvmrc`, `package.json`)? What would have
   happened without that file?
4. How would you phrase the setup request for a teammate who is on Windows without Git Bash?

## Reset

```bash
git switch tap26-base
git branch -D lab/01-setup  # this lab changes no tracked files
```

Installed dependencies stay — that's what you want.

## Instructor notes

- **Most common failure:** wrong Node major. `nvm use` (reads `.nvmrc`) fixes it; restart VS Code so the
  extension's shell picks up the new `PATH`.
- `yarn install` runs `postinstall` → `husky install && patch-package`; a missing `.git` folder (zip
  download) makes husky fail. Step 0 (case A, `git init -b tap26-base`) prevents this — make sure
  students do it before `/tap-setup`. `git init -b` needs Git 2.28+; on older Git use
  `git init && git switch -c tap26-base` (or `git checkout -b tap26-base`).
- Students who skip step 0 hit `fatal: invalid reference: tap26-base` at the first lab reset. Fix: commit
  their current state as the base (`git switch -c tap26-base` from a clean tree), then carry on.
- Corporate proxies break `npx playwright install chromium`; set `HTTPS_PROXY` or use
  `PLAYWRIGHT_DOWNLOAD_HOST`. The doctor reports "chromium missing" in that case.
- If `/tap-*` commands don't appear in the `/` menu, the folder opened is not the repo root (no
  `.claude/` visible) — reopen at the root.
- Emphasise step 5: students should be able to say *which agent* did *what* — that is the mental model
  for the rest of the course.
