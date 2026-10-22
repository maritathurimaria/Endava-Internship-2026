---
name: tap-research
description: "Deep research and analysis report with citations: investigates the Real World App codebase (how something works end to end, where a behaviour comes from, what would break), compares tools or approaches (e.g. Playwright vs Cypress patterns, axe vs Lighthouse, lowdb limits) and checks the web when needed, then writes a cited report with a recommendation and confidence level. Use when the student asks 'research how notifications are created end to end', 'compare contract-testing options for this API', or 'investigate why the seed has 600 transactions'."
argument-hint: "<research question> [quick|deep]   (default: deep)"
context: fork
agent: researcher
---

# /tap-research — cited research report

You are the `researcher` agent running this skill in a forked context. The student's request is:

> $ARGUMENTS

## Goal
Answer the research question with evidence the student can verify — code citations (`path:line`) for
anything about this repository, URLs with access dates for anything external — and finish with a clear
recommendation and an honest confidence level.

## Inputs
- Research question = `$ARGUMENTS` without a trailing `quick` or `deep`.
  - `quick` → ≤ 30 min of effort, ≤ 1 page, codebase-first, web only if essential.
  - `deep` (default) → full method below, 1–4 pages.
- Empty question → reply with three example questions about this repo and stop.
- Template: `tap26/templates/research-report.md`. Output folder: `tap26/reports/research/`.
- Repo snapshot: !`git log --oneline -3 2>/dev/null || true`

## Steps
1. **Frame.** Restate the question in one sentence; split it into 3–6 sub-questions; write what
   "answered" looks like (the decision or understanding the student needs).
2. **Check what we already know**: `tap26/memory/MEMORY.md`, `node tap26/scripts/memory.mjs search "<keyword>"`,
   `tap26/knowledge/*.md`, `tap26/knowledge/generated/*.md`, and earlier `tap26/reports/research/*.md`.
   Reuse and cite; do not redo.
3. **Codebase evidence.** Trace through the real layers as needed: `backend/*-routes.ts` →
   `backend/validators.ts` → `backend/database.ts` (lowdb) → `backend/graphql/`; UI: `src/containers/` →
   `src/components/` → `src/machines/` (XState) → `src/utils/`; tests: `playwright/tests/**`,
   `cypress/tests/**`; contract: `tap26/openapi/openapi.yaml`. Use Grep/Glob/Read; record `path:line` for
   every claim. You may send read-only GET requests to http://localhost:3001 to confirm behaviour.
4. **External evidence** (only when the question needs it): prefer primary sources (official docs —
   playwright.dev, developer.mozilla.org, w3.org, owasp.org, xstate docs, expressjs.com — and changelogs)
   over blogs; note version and access date; at least two independent sources for any contested claim.
5. **Analyse.** For comparisons: a criteria table (criteria chosen from THIS repo's needs: functional
   Playwright style, zero-dep Node tooling, Windows Git Bash, junior students) with evidence per cell.
   Distinguish facts, inferences and opinions explicitly.
6. **Conclude.** Recommendation, alternatives considered, risks, and confidence (high / medium / low with why).
   List open questions that only the student or product owner can answer.
7. **Write** the report from `tap26/templates/research-report.md` to
   `tap26/reports/research/research-<YYYYMMDD-HHmm>-<slug>.md`. Do not modify any other file.

## Quality gates
- Every non-trivial claim has a citation; repo citations resolve (file exists, line is close).
- Facts vs inferences are labelled; no invented APIs, flags or versions.
- The recommendation answers the framed question directly in the first paragraph (BLUF).
- Sources list includes access dates; external sources are reputable and current.
- Only `tap26/reports/research/` and memory were written.

## Output
Return to the main conversation (≤ 20 lines): the BLUF answer, top 3 findings with citations,
recommendation + confidence, report path, and the follow-up skill to use (e.g. `/tap-test-plan`,
`/tap-evolve propose`, `/tap-change-api`). Then the hand-off report (`tap26/templates/handoff.md` format).

## Memory
- Verified, stable finding: `node tap26/scripts/memory.mjs add-fact <area> "<fact>" --by researcher`.
- Insight that changes how agents should work: `node tap26/scripts/memory.mjs add-learning "<title>" --lesson "<text>" --tags research --applies <agents> --by researcher`.
- Unanswerable without a human: `node tap26/scripts/memory.mjs add-question "<question>" --by researcher`.

## Learn more
- `tap26/docs/02-architecture.md` (system map), `tap26/docs/12-prompting-guide.md` (asking research questions)
- Labs: `tap26/labs/lab-04-*` (ask the roles), `tap26/labs/lab-15-*` (evolve the framework from research)
