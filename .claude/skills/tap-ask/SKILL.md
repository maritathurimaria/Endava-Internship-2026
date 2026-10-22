---
name: tap-ask
description: "Ask one TAP26 specialist role a question and get the answer in that role's voice, grounded in the Real World App code with file-path citations, ending with 'What I'd do next' and 'How to test this'. Read-only unless the student explicitly asks for a change. Use when the student wants a role's perspective, e.g. '/tap-ask ba what are the acceptance criteria for requesting money?', '/tap-ask security can a user read another user's transaction?', '/tap-ask be where is the balance updated?'."
argument-hint: "<role> <question>   roles: ux be fe ba manual data ui-auto api-auto qa security perf a11y docs devops research"
---

# /tap-ask — ask a role

## Goal
Give the student a short, expert answer from ONE specialist role, grounded in the actual RWA code
(every claim backed by a file path, ideally `path:line`), so they learn how that role thinks about
this app. Inquiries never modify files unless the student explicitly asks for a change.

## Inputs
- `$ARGUMENTS` — `<role> <question>`. The role is the first word (`$0`); the question is everything after it.
- Role map (the first word is case-insensitive; aliases in brackets):

| role | agent | aliases |
|---|---|---|
| `ux` | `ux-designer` | design, designer |
| `be` | `be-dev` | backend, api-dev |
| `fe` | `fe-dev` | frontend, ui-dev |
| `ba` | `business-analyst` | analyst, po |
| `manual` | `manual-tester` | tester, exploratory |
| `data` | `data-tester` | db |
| `ui-auto` | `ui-automation` | ui |
| `api-auto` | `api-automation` | api |
| `qa` | `qa-lead` | lead |
| `security` | `security-tester` | sec, appsec |
| `perf` | `perf-tester` | performance |
| `a11y` | `a11y-auditor` | accessibility |
| `docs` | `doc-writer` | doc, writer |
| `devops` | `env-ops` | ops, env |
| `research` | `researcher` | — |

## Steps
1. **Parse.** Role = `$0` lower-cased and resolved through the map above. Question = `$ARGUMENTS`
   without its first word.
   - Role missing or unknown → print the role table (role, agent, one-line "ask me about…") and an
     example such as `/tap-ask data which seeded users have no bank account?`, then STOP. Do not guess a role.
   - Role known but question empty → ask the student for the question in one line, then STOP.
2. **Classify intent.** Producing content inside the answer (a user story, Gherkin, a list of boundary
   values, a heuristic review) is fine — that is still an inquiry. If the question asks for a file change ("add", "fix", "change", "write a test for")
   tell the student this skill is advisory, answer as the role, and suggest the right change skill
   (`/tap-change-api`, `/tap-change-ui`, `/tap-new-test`, `/tap-bug`, `/tap-data`). Only make the change
   if the student confirms explicitly in chat.
3. **Delegate** with the Agent tool to the mapped agent (`subagent_type` = agent name) with this brief:
   > You are answering an inquiry from a student, in your own role's voice. Question: "<question>".
   > Read `tap26/memory/MEMORY.md` first (and `tap26/knowledge/known-issues.md` for API behaviour questions). Ground every claim in this repository: cite file paths
   > (`backend/transaction-routes.ts:137`, `src/components/BankAccountForm.tsx`, `playwright/tests/api/...`,
   > `tap26/openapi/openapi.yaml`), not general knowledge. This is READ-ONLY: do not edit, create or
   > delete files, do not reseed the database, do not run tests that reseed. You may read files, grep,
   > and send GET requests to http://localhost:3001 (log in as a seeded user, password `s3cret`) if that
   > helps. Keep it under ~40 lines. End with two headings: "What I'd do next" (1–3 concrete actions,
   > naming a `/tap-*` skill or agent) and, where relevant, "How to test this" (test level + where the
   > test would live + key assertion). If you cannot answer with evidence, say exactly what is unknown.
4. **Check the answer** before showing it:
   - At least one real file path is cited, and spot-check one with Read/Grep (paths must exist).
   - Ends with "What I'd do next"; includes "How to test this" when the topic is testable.
   - No files were changed (`git status --short` unchanged apart from memory/journal files).
   If a check fails, send the agent ONE follow-up asking for the missing piece.
5. **Unanswered parts.** For anything the agent could not answer from the code (product intent,
   business rules not in code), log it:
   `node tap26/scripts/memory.mjs add-question "<question> (role: <role>)" --by <agent>`.

## Quality gates
- Answer is in the role's voice (a BA talks rules and acceptance criteria; a perf tester talks p95 and budgets).
- Claims are grounded in cited files; no invented endpoints, selectors or fields.
- Read-only: nothing modified unless the student explicitly asked and confirmed.
- Unknowns are logged as open questions, not guessed.

## Output
Show the student:
1. `**<role> (<agent>) says:**` followed by the agent's answer, trimmed to essentials.
2. The "What I'd do next" and "How to test this" sections verbatim.
3. A one-line footer: logged question ids (if any) and "Ask another role: `/tap-ask <role> …`".

## Memory
- Unknowns: `node tap26/scripts/memory.mjs add-question "<text>" --by <agent>`.
- If the answer revealed a stable, verified fact (e.g. "PATCH /users/:id ignores `balance`"), record it:
  `node tap26/scripts/memory.mjs add-fact <area> "<fact>" --by <agent>`.
- Journal: `node tap26/scripts/memory.mjs journal "tap-ask <role>: <question, 8 words max>" --by tap-orchestrator`.

## Learn more
- `tap26/docs/03-agents.md` (what each role does), `tap26/docs/12-prompting-guide.md` (asking good questions)
- Lab: `tap26/labs/lab-04-*` (ask the roles)
