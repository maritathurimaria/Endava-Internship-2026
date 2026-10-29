---
paths:
  - tap26/memory/**
---

# Shared-memory rules

Applies when reading or editing anything under `tap26/memory/`.
Everyone writes here; `knowledge-curator` curates. Consistency and history matter more than speed.

## Do
- **Write through the CLI**, never by hand-editing the files, so the format stays uniform:
  `node tap26/scripts/memory.mjs <add-fact|add-learning|add-decision|add-question|answer|log-change|set-active|digest>`.
  Read its usage header before first use.
- Use the right file for the right thing:
  - `facts.md` — stable verified facts: `- [area] fact (verified YYYY-MM-DD by <agent>)`.
  - `learnings.md` — lessons: `## L-### Title` / tags / What happened / Lesson / Applies to / Date / Source.
  - `decisions.md` — ADR-lite: `## D-### Title` / Context / Decision / Consequences / Date / By.
  - `changes.md` — app-change ledger (hook auto-appends file edits; add the intent line).
  - `open-questions.md` — `- [ ] Q-### question (by, date)`; close with `answer <Q-id>`.
  - `glossary.md` — domain + testing terms.
  - `journal/YYYY-MM-DD.md` — session journal (mostly hook-written).
- Tag `--by <agent>` (or set `TAP26_AGENT`) so authorship is clear.
- Regenerate the digest after a batch of writes: `memory.mjs digest` (keeps `MEMORY.md` ≤ 120 lines).
- Keep entries short, specific and verifiable; prefer counts and dates over adjectives.

## Don't
- **Never delete or overwrite another agent's entry.** To retire one, mark it superseded
  (append `(superseded by <id> on <date>)`) — history stays intact.
- Don't hand-edit `MEMORY.md` (it is generated) or files under `tap26/knowledge/generated/`.
- Don't duplicate a fact that already exists; search first: `memory.mjs search "<text>"`.
- Don't record secrets, tokens, or anything from `.env*`.
- Don't invent ids; the CLI assigns the next F-/L-/D-/Q- number.

## Verify before hand-off
- The entry appears correctly: `memory.mjs show <file>` or `memory.mjs search "<text>"`.
- `MEMORY.md` regenerated and still within the line budget.
- Your hand-off lists the ids you added/updated (and any you superseded).
