---
name: tap-start
description: "Welcome and onboarding for TAP26-Junior. Runs the environment doctor, explains in ten lines how agents, skills, memory and hooks fit together, shows the five most useful commands and recommends the next lab. Use when a student opens the repo for the first time, says 'where do I start', 'what is TAP26' or 'help me get going'."
argument-hint: "[optional: your experience level or goal, e.g. 'new to Playwright']"
allowed-tools: Bash(git status *), Bash(head *), Bash(ls *), Bash(node tap26/scripts/*)
---

# /tap-start — welcome to TAP26-Junior

## Goal
Get a student from "I just opened the repo" to "I know what TAP26 is, my environment status, and
which lab to do next" in under five minutes, without changing any files.

## Inputs
- `$ARGUMENTS` — optional free text about the student (experience level, goal, e.g.
  "I know Cypress, new to agents"). Use it to tailor the explanation and the lab recommendation.
- Empty `$ARGUMENTS` → assume a junior tester new to both Playwright and Claude Code agents.

Current repository state (read-only snapshot, captured at invocation):
- Branch / pending changes: !`git status --short --branch 2>/dev/null | head -15 || true`
- Shared memory files: !`ls tap26/memory 2>/dev/null || true`

## Steps
1. **Doctor.** Delegate to the `env-ops` agent with: "Run `node tap26/scripts/doctor.mjs` from the
   repo root and return the result table, the exit code and, for every FAIL/WARN row, a one-line fix.
   Do not install or start anything." If `env-ops` is unavailable, run the command yourself.
2. **Explain TAP26 in 10 lines** (yourself, no delegation). Cover exactly:
   1. TAP26-Junior is a team of 24 **agents** (an orchestrator + 23 specialists) in `.claude/agents/` (dev, testing, docs, analysis).
   2. `tap-orchestrator` is the conductor: it plans, delegates and enforces quality gates.
   3. 31 **skills** are slash commands in `.claude/skills/` — type `/tap-` in the chat to see them all.
   4. Each skill runs a pipeline of agents, e.g. `/tap-change-api` = be-dev → contract-guardian → tests → docs → review.
   5. Every agent ends with a **hand-off report** (status, changed files, verification, next agent).
   6. **Shared memory** lives in `tap26/memory/` (facts, decisions, learnings, change ledger).
   7. `MEMORY.md` is the digest injected at session start, so agents remember what happened before.
   8. **Hooks** in `.claude/hooks/` guard risky Bash, log app edits to `changes.md` and keep a journal.
   9. The app under test is the Cypress Real World App (UI :3000, API :3001); tests live in `playwright/`.
   10. Docs are in `tap26/docs/`, guided exercises in `tap26/labs/` (lab-01 … lab-15).
3. **Show the five most useful commands** as a table:
   | Command | When |
   |---|---|
   | `/tap-setup` | first time, or after `git pull` changed dependencies |
   | `/tap-run` | start the app (add `all` for Swagger + mock server) |
   | `/tap-run-tests api` | run a Playwright project and get a triaged summary |
   | `/tap-change-api <what>` | change the API with spec, tests, docs and review |
   | `/tap-debug <symptom>` | find the root cause of a failure |
4. **Recommend the next lab** from the doctor result and `$ARGUMENTS`:
   - Dependencies or browsers missing (doctor FAIL on node_modules / playwright / chromium) → `lab-01` (setup) and `/tap-setup`.
   - Installed but ports 3000/3001 down → `lab-02` (run the app) and `/tap-run`.
   - App healthy, no prior journal entries → `lab-03` (explore) then `lab-04` (ask the roles).
   - Student says they already know Playwright → `lab-05` (first API test) or `lab-07` (first API change).
   If the student wants coaching, delegate to the `tutor` agent with: "Introduce lab-NN in three
   sentences and ask the student one warm-up question; do not do the lab for them."
5. **Offer the teaching output style.** Tell the student they can switch on explanations-as-you-go with
   `/output-style` → choose **TAP26 Mentor** (defined in `.claude/output-styles/tap26-mentor.md`), and
   switch back the same way.

## Quality gates
- No files are modified by this skill (doctor and git status are read-only).
- The doctor result shown is real output from this run, not a guess; failures each have a fix.
- The lab recommendation is justified by a doctor row or by `$ARGUMENTS`.

## Output
Show the student, in this order and in under 40 lines:
1. "Your environment" — doctor table condensed to PASS/WARN/FAIL counts + any FAIL rows with fixes.
2. "What TAP26 is" — the 10 lines.
3. "Five commands" — the table.
4. "Next step" — one lab + one command, e.g. "Open `tap26/labs/lab-01` and run `/tap-setup`."
5. The output-style tip.

## Memory
- Journal the onboarding: `node tap26/scripts/memory.mjs journal "tap-start: doctor <PASS|WARN|FAIL>, recommended lab-NN" --by tap-orchestrator`
- If the doctor reveals a new, stable environment fact (e.g. a port permanently taken by another
  tool), record it: `node tap26/scripts/memory.mjs add-fact env "<fact>" --by env-ops`
- Do not change active work; onboarding is not a work item.

## Learn more
- `tap26/README.md` — start here
- `tap26/docs/00-index.md`, `tap26/docs/01-getting-started-vscode.md`, `tap26/docs/03-agents.md`, `tap26/docs/04-skills.md`
- `tap26/docs/05-memory-and-self-learning.md`, `tap26/docs/10-hooks-and-guardrails.md`
- Labs: `tap26/labs/lab-01` (setup), `lab-02` (run), `lab-03` (explore), `lab-04` (ask roles)
