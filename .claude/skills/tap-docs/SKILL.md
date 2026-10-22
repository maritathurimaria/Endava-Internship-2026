---
name: tap-docs
description: "Generate or refresh documentation with the doc-writer: a topic page, the API guide, a changes summary from the change ledger, release notes, or a full refresh of tap26/docs and READMEs. Follows Diátaxis (tutorial / how-to / reference / explanation), uses Mermaid diagrams, and regenerates the knowledge base with scan-app.mjs. Use when a student says 'document this', 'update the docs', 'write release notes', 'what changed this week' or after a user-visible change."
argument-hint: "<topic> | all | api | changes [--since <ref>] | release-notes [version]"
allowed-tools: Bash(ls *), Bash(node tap26/scripts/*)
---

# /tap-docs — documentation that matches the code

## Goal
Docs a junior can trust: accurate against the current code and knowledge base, in the right Diátaxis
form, with diagrams where they help, linked from the index — and nothing invented.

## Inputs
Parse `$ARGUMENTS` (the whole input text) yourself: if its first word is `api`, `changes`,
`release-notes` or `all`, that word is the **mode** and the rest are its options (`--since <ref>`,
a version); otherwise the **whole** `$ARGUMENTS` text is a `<topic>`. Empty → mode `changes`.
| mode | what is produced / refreshed |
|---|---|
| `<topic>` (free text, e.g. `"how mocks work"`, `bank accounts`) | one page in the right Diátaxis type, placed in `tap26/docs/` or as a section of an existing page |
| `api` | `tap26/docs/08-api-contract-and-swagger.md` + endpoint reference generated from `tap26/openapi/openapi.yaml` |
| `changes` | summary of app changes from `tap26/memory/changes.md` + `git log` (`--since <ref>` supported, default last 7 days) |
| `release-notes` | `tap26/docs/release-notes.md` entry (version = 2nd word or date), Keep-a-Changelog sections |
| `all` | audit + refresh of every page listed in `tap26/docs/00-index.md`, `tap26/README.md`, `playwright/README.md` |

Docs present now (read-only): !`ls tap26/docs 2>/dev/null || true`

## Steps
1. **Refresh knowledge first** — delegate to `env-ops` (or run yourself; read-only on app code):
   `node tap26/scripts/scan-app.mjs` → regenerates `tap26/knowledge/generated/{api-routes,ui-selectors,ui-routes,tests-inventory,coverage-matrix}.md`.
   For `api` also run `node tap26/scripts/spec-drift.mjs`; if drift is not clean, tell the student and
   suggest `/tap-swagger` first (docs must not describe a drifting contract as truth).
2. **Gather facts** — for `changes` / `release-notes`, delegate to `test-impact-analyst`:
   "Summarise app changes since <ref> from `tap26/memory/changes.md`, `git log --oneline <ref>..HEAD`
   and `node tap26/scripts/impact.mjs --since <ref>`: user-visible changes, API changes, selector changes,
   test changes." Skip for other modes.
3. **Write** — delegate to `doc-writer` with: "Mode: <mode>. Full request: $ARGUMENTS. Sources of truth:
   code (`backend/`, `src/`, `playwright/`), `tap26/knowledge/generated/*`, `tap26/openapi/openapi.yaml`,
   `tap26/memory/{facts,decisions,changes}.md`, step-2 summary if any. Rules:
   - **Diátaxis**: decide the type first — tutorial (labs, learning by doing), how-to (goal-oriented
     steps), reference (tables, exact commands, endpoints), explanation (why/architecture). One type per page/section.
   - **Mermaid** for flows and architecture (`flowchart`, `sequenceDiagram`); keep ≤ 15 nodes; no images.
   - Every command is copy-pasteable and verified (run read-only ones; mark others as not run).
   - Relative links only; update `tap26/docs/00-index.md` when adding a page; never edit
     `tap26/knowledge/generated/*` by hand.
   - Audience: junior testers; short sentences; define terms in `tap26/memory/glossary.md`.
   - For `all`: list stale statements (claim → evidence → fix) before editing; fix them; keep each
     page's existing structure unless it is wrong."
4. **Verify links and commands** — `doc-writer` checks every relative link target exists
   (`node -e` one-liner or grep) and that Mermaid blocks are fenced with ```mermaid.
5. **Review (for `all`, `api`, `release-notes`)** — delegate to `code-reviewer`: "Review `git diff -- tap26/docs '*.md'`
   for accuracy against the code, broken links, Diátaxis consistency and tone." Fix findings once.
   Optionally ask `tutor` whether a page is understandable for a beginner.

## Quality gates
- Gate 5: user-visible changes in the ledger since the last release-notes entry are documented.
- No claim without a source: each new reference fact is traceable to code, spec, generated knowledge or memory.
- All relative links resolve; Mermaid blocks are fenced and ≤ 15 nodes; commands are copy-pasteable.
- `tap26/knowledge/generated/` regenerated in this run (timestamp updated), not hand-edited.
- No edits to `backend/`, `src/`, `cypress/`, `data/`.

## Output
```
Mode       <mode>
Updated    <files> (+n new, ~n changed)       index ✓
Diátaxis   <page → type>
Diagrams   <n Mermaid>
Knowledge  scan-app ✓  drift: clean | n issues
Review     approve | n findings fixed | skipped (topic mode)
```
Then the 3 most important things a student should read next.

## Memory
- `node tap26/scripts/memory.mjs journal "tap-docs <mode>: updated <n> pages" --by doc-writer`
- Stale doc found that misled someone → `memory.mjs add-learning "<title>" --lesson "<t>" --tags docs --applies doc-writer --by doc-writer`
- New terms → glossary (via `doc-writer`); documentation structure decisions → `memory.mjs add-decision …`; finish with `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/00-index.md`, `tap26/docs/04-skills.md`, `tap26/docs/11-evolving-tap26.md`, `tap26/docs/glossary.md`
- Diátaxis: https://diataxis.fr · Mermaid: https://mermaid.js.org
- Lab: `tap26/labs/lab-14` (docs)
