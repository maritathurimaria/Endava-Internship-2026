---
name: tap-retro
description: "Run a retrospective on a session, a day, a lab or a piece of work: gather evidence from the session journal, change ledger, git log, reports and hand-offs, then write a retro (what went well, what didn't, surprises, actions) and distil at most three durable learnings, decisions and answered questions into shared memory before regenerating the digest. Use when the student says 'let's do a retro', 'what did we learn today', 'wrap up the session', or after finishing a lab or a feature."
argument-hint: "[session|today|lab-NN|<topic or feature>]   (default: today)"
---

# /tap-retro — retrospective → memory

## Goal
Turn what just happened into improvement: an honest retro document, a few high-quality learnings the
agents will actually use next time, and a fresh memory digest — not a wall of notes nobody reads.

## Inputs
- `$ARGUMENTS` — scope:
  - `today` (default) — everything in today's journal;
  - `session` — this conversation only;
  - `lab-NN` — work done for that lab;
  - free text — a feature or topic (e.g. `bank account note field`).
- Template: `tap26/templates/retro.md`. Output: `tap26/reports/retros/retro-<YYYYMMDD-HHmm>-<slug>.md`.
- Evidence snapshot:
  - Recent commits: !`git log --oneline -10 2>/dev/null || true`
  - Recent app changes: !`tail -n 12 tap26/memory/changes.md 2>/dev/null || true`
  - Open questions: !`node tap26/scripts/memory.mjs show open-questions.md 2>/dev/null | tail -8 || true`
  - Skill/agent usage counters: !`cat tap26/memory/.state/usage.json 2>/dev/null || true`

## Steps
1. **Collect evidence** (main thread) and pass it to the curator: today's journal
   (`tap26/memory/journal/<YYYY-MM-DD>.md`), the snapshot above, reports created in scope
   (Glob `tap26/reports/**/*` modified today), failed/passed test runs mentioned in the conversation,
   and for `session` a 10-line summary of this conversation (requests, agents used, problems, outcomes).
2. **Delegate to `knowledge-curator`** (Agent tool) with this brief:
   > Run a retro for <scope> using the evidence below. Fill `tap26/templates/retro.md` and save it as
   > `tap26/reports/retros/retro-<YYYYMMDD-HHmm>-<slug>.md`. Sections: Context, Timeline (key events),
   > What went well, What didn't, Surprises, Metrics (tests added/green, gates passed/failed, bugs filed,
   > reviews and verdicts), Root causes (5-whys for the biggest problem), Actions (owner agent or student,
   > due, measurable).
   > Then distil memory — quality over quantity:
   > - At most 3 NEW learnings, each actionable, specific to this repo, not already in
   >   `tap26/memory/learnings.md` (search first; if similar exists, reference its L-id instead).
   > - Decisions made during the work → `add-decision`.
   > - Open questions now answered → `answer Q-###`.
   > - Facts verified during the work → `add-fact`.
   > - If the same problem appears in ≥ 2 learnings or retros, draft an evolution idea and list it under
   >   Actions as "`/tap-evolve propose <idea>`" — do not create the proposal yourself.
   > Append ONE row to the "Session / retro metrics" table in `tap26/evolution/metrics.md` (never rewrite
   > past rows), matching its columns `Date | Scope | Tasks | Gates ✅/❌ | Reviews ✅/✋ | Tests added |
   > Flake rate | Rework loops | Learnings | Notes`: date, scope, tasks done, gates passed/failed, review
   > verdicts, tests added, flaky tests (rate or names), rework loops, new L-ids, and in Notes the top 3
   > skills and agents from `tap26/memory/.state/usage.json` (counts; "n/a" if the file is absent).
   > Finally run `node tap26/scripts/memory.mjs digest` and confirm `MEMORY.md` ≤ 120 lines.
   > End with the hand-off report listing every memory id you created.
3. **Review** the retro: actions are concrete; learnings are not duplicates; nothing personal or secret
   recorded. Send one follow-up if needed.
4. **Close the loop** with the student: ask which action they want to take first, and offer
   `/tap-evolve propose …` for framework-level improvements.

## Quality gates
- Retro is evidence-based (cites commits, reports, ledger lines, journal entries), blameless in tone.
- ≤ 3 new learnings, each with "Applies to" agents/skills and a concrete lesson ("do X when Y"), not platitudes.
- Every action has an owner and a measurable done-criterion.
- Memory written only via `memory.mjs`; digest regenerated and within 120 lines.
- Exactly one new row appended to `tap26/evolution/metrics.md` (Session / retro metrics).

## Output
- `tap26/reports/retros/retro-<YYYYMMDD-HHmm>-<slug>.md`.
- Chat (≤ 15 lines): 3 bullets went-well, 3 bullets to-improve, actions table, memory ids created
  (L-###, D-###, Q-### answered), suggested evolution ideas.

## Memory
- `node tap26/scripts/memory.mjs add-learning "<title>" --what "<what happened>" --lesson "<do X when Y>" --tags <tags> --applies <agents,skills> --by knowledge-curator`
- `node tap26/scripts/memory.mjs add-decision "<title>" --context "<t>" --decision "<t>" --consequences "<t>" --by knowledge-curator`
- `node tap26/scripts/memory.mjs answer Q-### "<answer>" --by knowledge-curator`
- `node tap26/scripts/memory.mjs set-active "<next focus>"` then `node tap26/scripts/memory.mjs digest`

## Learn more
- `tap26/docs/05-memory-and-self-learning.md`, `tap26/docs/11-evolving-tap26.md`
- Lab: `tap26/labs/lab-15-*` (evolve the framework — retros feed proposals)
