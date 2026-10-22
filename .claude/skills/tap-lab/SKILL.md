---
name: tap-lab
description: "Start, get a hint for, or check a TAP26 guided lab (lab-01 setup … lab-15 evolve the framework). '/tap-lab 05' introduces lab 05 (goal, prerequisites, first steps); '/tap-lab 05 hint' gives a Socratic hint for where the student is stuck; '/tap-lab 05 check' verifies the student's work against the lab's checkpoints with real evidence and kind feedback. With no argument lists all labs and suggests the next one. Use when the student says 'start lab 5', 'which lab next', 'check my lab', 'I'm stuck on lab 7'."
argument-hint: "[NN] [check|hint]   e.g. 05 · 05 hint · 05 check"
---

# /tap-lab — guided lab exercises

## Goal
Guide the student through a lab the way a good tutor would: clear start, hints instead of answers,
and an honest, evidence-based check of their work — never doing the lab for them unless they ask.

## Inputs
- `$ARGUMENTS` — `[NN] [mode]`:
  - `$0` = lab number (`5`, `05`, `lab-05` all mean `lab-05`); empty → list labs.
  - mode = `check` | `hint` | (none = show/start).
- Labs live in `tap26/labs/lab-NN-<slug>.md`, each with: Goal, Prerequisites, Steps (exact prompts and
  commands), Checkpoints, Stretch goals, Reflection questions.
- Available labs (snapshot): !`ls tap26/labs 2>/dev/null || true`
- Recent lab activity: !`node tap26/scripts/memory.mjs search lab- 2>/dev/null | tail -5 || true`

## Steps
1. **Resolve the lab.** Zero-pad `$0` to two digits and Glob `tap26/labs/lab-NN-*.md`. Not found →
   list available labs (number, title, one-line goal) and STOP.
   - No argument: list all labs as a table; recommend the next one = lowest lab not yet journaled as
     checked "all checkpoints passed" (from the activity snapshot above), or lab-01 if none.
2. **Show / start** (no mode) — delegate to `tutor` (Agent tool):
   > Introduce `<lab file>` to the student: the goal in 2 sentences, why it matters for a tester, the
   > prerequisites with how to verify each (e.g. `/tap-doctor`, `/tap-run`), and the first 1–2 steps exactly
   > as written in the lab. Ask one warm-up question. Do not reveal checkpoint answers or later solutions.
   Main thread then checks prerequisites that are cheap to verify (app up via
   `node tap26/scripts/doctor.mjs --quick`, branch `lab/NN-<slug>` per conventions) and reports them.
3. **Hint** (`hint`) — delegate to `tutor`:
   > The student is stuck on `<lab file>`. Look at their current work (`git status --short`, `git diff`
   > output provided below, and files the lab asks them to create). Identify the first checkpoint not yet
   > met. Give a graduated hint: (1) a guiding question, (2) where to look (file/doc, not the answer),
   > (3) only if they ask again — a partial snippet. Never paste the full solution.
   Provide the tutor with the `git status --short` and `git diff --stat` output (the tutor runs only
   read-only commands; checkpoints that need writes or test runs are run by the main thread).
4. **Check** (`check`) — main thread gathers evidence, tutor judges:
   1. Read the lab's **Checkpoints** section. For each checkpoint decide the evidence needed:
      file exists / contains X (Glob/Grep), command result (e.g. `npm --prefix playwright run typecheck`,
      `npx playwright test <spec> --project=api` from `playwright/`, `node tap26/scripts/spec-drift.mjs`,
      `curl -s http://localhost:3001/...`), report present in `tap26/reports/...`, memory entry present
      (`node tap26/scripts/memory.mjs search ...`).
   2. Run only read-only commands and the test commands the lab itself prescribes. Before any Playwright
      run, warn: "running tests reseeds the database". Run a new test twice if the lab asks for a flake check.
   3. Delegate to `tutor` with the checkpoint list + collected evidence:
      > Assess each checkpoint as ✅ met / ⚠️ partially / ❌ not yet, citing the evidence. Be kind and
      > specific: one thing they did well, the most important gap with a hint (not the fix), and one
      > reflection question from the lab. If all are met, suggest one stretch goal and the next lab.
5. **Never do the lab for them.** If the student explicitly asks "just do it", confirm once, then route
   the work through the normal skill (e.g. `/tap-new-test`) and explain each step as it happens.

## Quality gates
- Every ✅ is backed by evidence produced in this run (command output count, file path, grep hit).
- No student files are modified by `show`, `hint` or `check`.
- Hints are graduated; the full solution is never volunteered.
- Database-reseeding commands are announced before they run.

## Output
- show: lab intro + prerequisites status + first steps + warm-up question.
- hint: one graduated hint + "ask again for a bigger hint".
- check: checkpoint table (checkpoint | status | evidence), feedback, next step / next lab.

## Memory
- Journal progress: `node tap26/scripts/memory.mjs journal "lab-NN check: <met>/<total> checkpoints" --by tutor`
  (use the words "all checkpoints passed" when complete — the lab list relies on it).
- A lab instruction that is wrong or unclear: `node tap26/scripts/memory.mjs add-learning "lab-NN: <issue>" --lesson "<fix>" --tags lab,docs --applies tutor,doc-writer --by tutor`, and suggest `/tap-evolve propose`.

## Learn more
- `tap26/labs/` (all labs), `tap26/docs/00-index.md`, `tap26/docs/01-getting-started-vscode.md`
- `/tap-explain <concept>` for any concept a lab uses
