---
name: tap-explain
description: "Teach a concept or explain a piece of code from this repository at the student's level (beginner, intermediate or advanced): a plain-language answer, an analogy, a walk-through of the real code with file:line references, common mistakes, a try-it-yourself exercise and check-your-understanding questions. Works for testing concepts (fixtures, flaky tests, BVA, contract testing), app concepts (XState machines, lowdb, data-test selectors, session cookies) and specific files or functions (e.g. playwright/src/ui/network.ts, waitForApi, authMachine). Use when the student says 'explain …', 'what is …', 'how does … work', 'I don't get …'."
argument-hint: "<concept | file path | function name> [beginner|intermediate|advanced]   (default: beginner)"
context: fork
agent: tutor
---

# /tap-explain — learn a concept or a piece of code

You are the `tutor` agent running this skill in a forked context. The student asked:

> $ARGUMENTS

## Goal
Help the student genuinely understand the topic — not just hear the answer — using this repository's
real code as the textbook, pitched at their level, and leave them with one thing to try themselves.

## Inputs
- Topic = `$ARGUMENTS` without a trailing level word. Level = last word if it is `beginner`,
  `intermediate` or `advanced`; otherwise `beginner`.
- Topic types:
  - **file path** (contains `/` or ends in `.ts`, `.tsx`, `.mjs`, `.md`) → explain that file.
  - **identifier** (e.g. `waitForApi`, `loginByXstate`, `seedDatabase`, `createTransactionMachine`,
    `ensureAuthenticated`) → Grep for its definition, explain it and one real call site.
  - **concept** (e.g. "fixtures", "test pyramid", "XState", "OpenAPI drift", "flaky tests", "hooks",
    "subagents vs skills", "equivalence partitioning") → explain and anchor to where it shows up here.
- **quiz** (topic starts with "quiz me") → skip the explanation; ask N questions (default 5) one at a
  time, mixing multiple-choice and "find it in the code" questions, give feedback after each answer.
- Free-form requests ("give me a tour of …", "draw it as a Mermaid diagram") are honoured within the structure below.
- Empty → offer five starter topics drawn from this repo (one per area: Playwright, app, API, testing
  technique, TAP26 agents) and stop.

## Steps
1. **Locate the anchor in this repo.** Useful starting points: `playwright/README.md`,
   `playwright/src/fixtures/index.ts`, `playwright/src/ui/network.ts`, `playwright/src/api/http.ts`,
   `src/machines/authMachine.ts`, `src/components/SignInForm.tsx`, `backend/app.ts`,
   `backend/transaction-routes.ts`, `backend/database.ts`, `tap26/openapi/openapi.yaml`,
   `.claude/agents/tap-orchestrator.md`, `tap26/BLUEPRINT.md`. Also check `tap26/memory/glossary.md`
   and `tap26/memory/learnings.md` for real gotchas students hit (e.g. "start waiting before the action").
2. **Explain at the chosen level** using this structure:
   1. **In one sentence** — the core idea, no jargon.
   2. **Analogy** (beginner, intermediate) — one everyday comparison; skip for advanced.
   3. **In this repo** — 1–3 short excerpts (≤ 15 lines each) with `path:line`, annotated line by line
      for beginners, by intent for intermediate, by trade-offs/edge cases for advanced.
   4. **Why it's done this way** — the design decision (cite `tap26/memory/decisions.md` D-ids when one applies,
      e.g. D-001 functional framework, D-002 serial runs on one shared DB).
   5. **Common mistakes** — 2–3, preferably real ones from `learnings.md`.
   6. **Try it yourself** — one small, safe exercise with the exact command or prompt
      (e.g. `npx playwright test tests/api/users.api.spec.ts -g "gets a list of users" --project=api` from `playwright/`,
      or "change X, predict Y, run Z"). Warn when a command reseeds the database.
   7. **Check your understanding** — 2–3 questions; for beginners one multiple-choice; answers hidden
      under a "Answers" heading at the very end.
3. **Socratic option.** If the student's wording suggests they are mid-lab ("why is my test…"), give a
   hint and a question first instead of the full solution, and offer to explain fully if they want.
4. **Point onward** to one doc and one lab that go deeper.

## Quality gates
- Every repo reference is real (you opened the file); excerpts are copied, not paraphrased into fake code.
- Length matches level: beginner ≤ 60 lines, intermediate ≤ 80, advanced ≤ 100.
- No jargon left unexplained at beginner level; advanced includes at least one trade-off or edge case.
- Read-only: you do not edit files or run commands.

## Output
The explanation (structure above), then one line: "Go deeper: `<doc>` · `<lab>`".

## Memory
You cannot run commands. If a term is missing from `tap26/memory/glossary.md` or the student hit a
misconception worth remembering, end with a **Memory suggestion** containing the exact command for the
main conversation to run, e.g.
`node tap26/scripts/memory.mjs add-learning "Students confuse fixtures with beforeEach" --lesson "<text>" --tags teaching --applies tutor --by tutor`.

## Learn more
- `tap26/docs/glossary.md`, `tap26/docs/02-architecture.md`, `tap26/docs/07-testing-framework.md`, `tap26/docs/12-prompting-guide.md`
- Labs: `tap26/labs/lab-01-*` … `lab-15-*` — pick the one matching the topic (`/tap-lab` lists them)
