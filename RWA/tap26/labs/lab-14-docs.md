# Lab 14 — Documentation that agents and humans can trust

**Level:** ★★☆ · **Time:** 60 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-docs`, `/tap-review`, `/tap-explain` · `doc-writer`, `code-reviewer`, `knowledge-curator`, `tutor`

## Learning objectives

1. Generate a technical guide with diagrams from the code, not from the model's general knowledge.
2. **Verify** documentation mechanically: every file path exists, every link resolves, every claim has a source.
3. Write release notes from git history and an ADR-lite decision into shared memory.
4. Explain why docs in `tap26/knowledge/` also make *agents* better.

## Prerequisites

- [Lab 03](lab-03-explore.md). Labs 07/08 are useful (something to write release notes about) but optional.

## Background

In an agentic team, documentation has two audiences: people, and the agents that read
`tap26/knowledge/*.md` before they work. Wrong docs are worse than no docs — an agent will follow them
confidently. `doc-writer` is instructed to cite code (`file:line`), prefer Mermaid diagrams (rendered by
the Markdown Mermaid extension in VS Code's preview) and keep `tap26/docs` and `tap26/knowledge` fresh.
Decisions go into `tap26/memory/decisions.md` via `memory.mjs add-decision` (ADR-lite).

## Steps

### 0. Branch

```bash
git switch -c lab/14-docs
```

### 1. Generate a guide from code

```
/tap-docs write tap26/knowledge/payments-flow.md: how a payment and a payment request move through the app — UI component, XState machine, HTTP call, Express route, validator, database.ts functions, balance changes, notifications. One Mermaid sequence diagram per flow, a table of the data-test selectors involved, and a "Known issues" section linking KI ids from tap26/knowledge/known-issues.md. Cite file:line for every step.
```

Open the file and the Markdown preview side by side (`Ctrl+K V`). The diagrams should render.

### 2. Verify it mechanically

Every backticked path that looks like a repo file must exist:

```bash
node -e "const fs=require('fs');const t=fs.readFileSync('tap26/knowledge/payments-flow.md','utf8');const ps=[...new Set([...t.matchAll(/\x60((?:backend|src|playwright|tap26|data)\/[\w.\/-]+?)(?::\d+(?:-\d+)?)?\x60/g)].map(m=>m[1]))];const bad=ps.filter(p=>!fs.existsSync(p));console.log('paths',ps.length,'missing',bad)"
```

**Expected:** `missing []`. Relative Markdown links must resolve too:

```bash
node -e "const fs=require('fs'),path=require('path');const f='tap26/knowledge/payments-flow.md';const t=fs.readFileSync(f,'utf8');const ls=[...t.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map(m=>m[1]).filter(l=>!/^https?:/.test(l));const bad=ls.filter(l=>!fs.existsSync(path.join(path.dirname(f),l)));console.log('links',ls.length,'broken',bad)"
```

### 3. Verify the claims, not just the paths

```
Use the code-reviewer agent to check 5 random claims in tap26/knowledge/payments-flow.md against the code they cite. Report line numbers that are off and statements that are wrong. Do not edit.
```

Fix what it finds (ask `doc-writer`, or edit by hand).

### 4. Release notes from history

```
/tap-docs release-notes — cover everything on my lab branches compared to tap26-base (git log tap26-base..lab/07-api-change, tap26-base..lab/08-ui-change and so on; skip branches that don't exist). Audience: testers. Use tap26/templates/release-notes.md and add it as a new "Lab work (unreleased)" entry at the top of tap26/docs/release-notes.md
```

### 5. Record a decision

Pick a real decision from the course so far (e.g. *"UI-only validation must be mirrored in the API"* from Lab 08):

```bash
node tap26/scripts/memory.mjs add-decision "Mirror UI validation rules in the API" --context "Lab 08 limited notes to 140 chars in the UI only; the API still accepts longer notes" --decision "Every new UI validation rule gets a matching express-validator rule and OpenAPI constraint" --consequences "Changes go through /tap-change-api as well as /tap-change-ui" --by student
node tap26/scripts/memory.mjs digest
```

### 6. Make it discoverable

```
Add payments-flow.md to tap26/knowledge/README.md (one line, what it is for) and tell me which agents' "Before you start" sections should mention it. Propose, don't edit the agent files.
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Guide exists with diagrams | `node -e "const t=require('fs').readFileSync('tap26/knowledge/payments-flow.md','utf8');console.log((t.match(/\x60\x60\x60mermaid/g)\|\|[]).length)"` | `2` or more |
| 2 | No missing paths | step 2, first command | `missing []` |
| 3 | No broken links | step 2, second command | `broken []` |
| 4 | Known issues linked | `node -e "console.log(/KI-\d+/.test(require('fs').readFileSync('tap26/knowledge/payments-flow.md','utf8')))"` | `true` |
| 5 | Release notes | `git diff --stat tap26-base -- tap26/docs/release-notes.md` | `1 file changed` (your new entry; it stays on this lab branch) |
| 6 | Decision stored | `node tap26/scripts/memory.mjs search "Mirror UI validation"` | finds a `D-###` entry |
| 7 | Indexed | `node -e "console.log(require('fs').readFileSync('tap26/knowledge/README.md','utf8').includes('payments-flow'))"` | `true` |

## Stretch goals

- Turn step 2's two one-liners into a doc-lint script proposal for Lab 15 (`tap26/scripts/doc-lint.mjs`).
- Ask the tutor to generate a 5-question quiz from your guide (`/tap-explain quiz me on payments-flow.md`)
  and answer it without looking.
- Ask `ux-designer` to turn the payment flow into a user-journey diagram (Mermaid `journey`).

## Reflection questions

1. How many cited line numbers were off in step 3? What does that say about trusting generated docs?
2. Which parts of the guide could the agent only write *because* it read the code, and which came from
   general knowledge?
3. If an agent reads your guide tomorrow, which sentence is most likely to mislead it as the code evolves?
   How would you make that sentence age better (link vs. copy)?
4. How would you prompt `doc-writer` differently for a beginner audience vs. a developer audience?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 14: payments flow guide + decision"
git switch tap26-base
```

Note: memory entries you added on this branch (decision) stay on this branch. To keep them on
`tap26-base`, merge the lab branch or re-run the `add-decision` command there.

## Instructor notes

- Line numbers drift quickly; encourage `file` + function name (`backend/database.ts` `createTransaction`)
  as the primary reference and `:line` as a hint.
- The path checker only checks paths starting with `backend/`, `src/`, `playwright/`, `tap26/`, `data/`
  inside backticks; that is enough to catch most hallucinated files (e.g. a non-existent
  `backend/payment-routes.ts`).
- Typical doc-writer errors: inventing a `PaymentService`, mixing dollars and cents, claiming requests
  move money on creation (they move on acceptance, `updateTransactionById`).
- Release notes go to `tap26/docs/release-notes.md` (the `/tap-docs release-notes` default), not `tap26/reports/`:
  `docs` is not a report type (decision D-007). The entry lives on the lab branch, so `tap26-base` stays clean.
- On Windows PowerShell, the one-liners work in Git Bash; in PowerShell replace the outer `"` quoting
  or run them from the VS Code Git Bash terminal.
