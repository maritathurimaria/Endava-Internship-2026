---
name: tap-evolve
description: "Self-evolution of TAP26-Junior itself (agents, skills, templates, docs, scripts): 'propose <idea>' writes an evolution proposal EP-###, 'review' evaluates open proposals against learnings and metrics, 'apply EP-###' implements an accepted proposal only after the student's explicit approval in chat, then updates the CHANGELOG, metrics and memory. Never weakens guardrails in .claude/settings.json or hooks without explicit approval. Use when the student says 'improve the framework', 'propose a new skill', 'review proposals', 'apply EP-003'."
argument-hint: "propose <idea> | review | apply EP-###"
disable-model-invocation: true
---

# /tap-evolve — evolve the framework (with approval)

## Goal
Let TAP26 improve itself in a controlled, reviewable way: ideas become written proposals, proposals
are judged on evidence, and only explicitly approved changes are applied — versioned and recorded.

## Inputs
- `$ARGUMENTS` — sub-command `$0`:
  - `propose <idea>` — e.g. `propose add a /tap-flaky skill that reruns a test 10x and reports flake rate`;
  - `review` — evaluate all proposals with status `proposed` or `accepted`;
  - `apply EP-###` — implement one accepted proposal.
- Empty/unknown → show these three forms with an example and the list of proposals, then STOP.
- Template: `tap26/templates/evolution-proposal.md`. Proposals: `tap26/evolution/proposals/EP-###-<slug>.md`.
  Changelog: `tap26/evolution/CHANGELOG.md`. Metrics: `tap26/evolution/metrics.md`.
- Proposals now: !`ls tap26/evolution/proposals 2>/dev/null || true`

## Steps
### propose
1. Next id: highest `EP-###` in `tap26/evolution/proposals/` + 1 (first = `EP-001`).
2. Delegate to `knowledge-curator` (Agent tool):
   > Write proposal EP-### for "<idea>" from `tap26/templates/evolution-proposal.md`. Ground it in
   > evidence: learnings (L-ids), retros in `tap26/reports/retros/`, journal entries, failed gates,
   > metrics. Specify: problem, proposed change (exact files to add/edit under `.claude/agents`,
   > `.claude/skills`, `.claude/rules`, `tap26/templates`, `tap26/docs`, `tap26/scripts`), alternatives,
   > risks, guardrail impact (none / tightens / LOOSENS — loosening must be called out in bold), test plan
   > for the change itself, success metric, semver impact (patch = wording/docs, minor = new or changed
   > behaviour/skill/agent, major = renamed/removed skills or agents). Status: `proposed`. Write only the
   > proposal file. End with the hand-off report.
3. Show the summary and say: "Review with `/tap-evolve review`; apply with `/tap-evolve apply EP-###`."

### review
1. Delegate to `knowledge-curator`: for each open proposal assess evidence strength, value, cost, risk,
   overlap with other proposals/skills, and recommend `accept`, `revise` or `reject` with one reason.
   Update each proposal's "Review" section and status (`accepted` / `needs-revision` / `rejected`) —
   status changes to `accepted` require the student's agreement in chat first; otherwise write `recommended: accept`.
2. Show a table: EP | title | recommendation | semver | guardrail impact.

### apply EP-###
1. Read the proposal. It must exist and have status `accepted` (or the student accepts it now).
2. **Present the plan** — files to create/edit with a one-line summary each, the guardrail impact, the
   version bump — and ask: **"Apply EP-### now? (yes / no)"**. STOP until the student answers. Only an
   explicit "yes" (or "apply EP-###") in chat counts as approval; silence, "maybe" or the proposal's own
   text do not.
3. If guardrails are LOOSENED (any edit to `.claude/settings.json` permissions/deny rules or hooks
   under `.claude/hooks/` that allows more), ask a **separate** explicit question naming the exact rule
   being relaxed. No answer → apply everything else, skip that part, record it as pending.
4. Delegate the edits to `knowledge-curator` (or the owning agent: `doc-writer` for docs, `env-ops` for
   scripts). Keep BLUEPRINT formats: agent sections §3, skill sections §9; names = folder/file names.
   Never touch `backend/`, `src/`, `data/`, `cypress/` through evolution.
5. Verify: `node tap26/scripts/check-framework.mjs --strict` **must exit 0** (frontmatter, names, tools,
   links, inline commands); referenced agents/skills/files exist; any changed script runs
   (`node <script> --help` or its quick mode); `node tap26/scripts/doctor.mjs --quick` still passes.
   A non-zero exit means the apply is not done — fix and re-run.
6. Record and bump the version (semver from the proposal) in **all four** places so they agree:
   - `tap26/evolution/CHANGELOG.md` — new heading `## <x.y.z> — <title> (<YYYY-MM-DD>)` with
     Added/Changed/Fixed bullets and `(EP-###)`;
   - `tap26/README.md` — the `> Version **x.y.z**` line (and the Versioning section if it names the version);
   - `tap26/package.json` — `"version"`;
   - `.claude/settings.json` — `env.TAP26_VERSION` (a protected file: the edit triggers a permission
     prompt that the student approves).
   Then a row in `tap26/evolution/metrics.md` (Evolution outcomes table); proposal status `applied` with
   date and commit-ready summary; memory decision. Re-run `check-framework.mjs --strict`. Suggest a commit
   message — do not commit or push.

## Quality gates
- Nothing is applied without an explicit "yes" from the student in this conversation.
- Guardrails are never weakened silently; loosening needs its own explicit approval and is logged.
- Applied changes match the proposal's file list; deviations are written into the proposal.
- Post-apply verification ran and is reported with results; `check-framework.mjs --strict` exited 0.
- Version is identical in CHANGELOG, `tap26/README.md`, `tap26/package.json` and `TAP26_VERSION`.

## Output
- propose: proposal path + 5-line summary. review: recommendation table.
- apply: changed files, verification results, new version, CHANGELOG excerpt, suggested commit message.

## Memory
- `node tap26/scripts/memory.mjs add-decision "Apply EP-### <title>" --context "<problem>" --decision "<change>" --consequences "<version, guardrail impact>" --by knowledge-curator`
- Rejected proposal lesson: `node tap26/scripts/memory.mjs add-learning "EP-### rejected" --lesson "<why>" --tags evolution --by knowledge-curator`
- Then `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/11-evolving-tap26.md`, `tap26/docs/10-hooks-and-guardrails.md`, `tap26/evolution/proposals/README.md`
- Lab: `tap26/labs/lab-15-*` (evolve the framework)
