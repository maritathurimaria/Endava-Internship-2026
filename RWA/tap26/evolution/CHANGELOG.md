# TAP26-Junior — changelog

All notable changes to the TAP26-Junior framework (agents, skills, hooks, rules, templates, docs,
scripts). Application changes to the Real World App are NOT recorded here — see
`tap26/memory/changes.md`. Format: [Keep a Changelog](https://keepachangelog.com/), versions follow
semver: **patch** = wording/docs, **minor** = new or changed behaviour, skill, agent or template,
**major** = renamed/removed skills or agents, or changed contracts (hand-off format, memory format).

New entries are added at the top by `/tap-evolve apply EP-###` (after the student's approval), as:
`## <x.y.z> — <title> (<YYYY-MM-DD>)` with `### Added / Changed / Fixed / Removed` bullets ending in `(EP-###)`.

## 1.0.0 — TAP26-Junior initial release (2026-10-16)

### Added
- 24 agents in `.claude/agents/` led by `tap-orchestrator` (dev, testing, analysis, docs, teaching, knowledge curation).
- Slash-command skills in `.claude/skills/` (`/tap-*`), including role inquiries (`/tap-ask`), test design
  (`/tap-test-plan`, `/tap-test-cases`, `/tap-bug`, `/tap-data`), audits (`/tap-review`, `/tap-a11y`,
  `/tap-security`, `/tap-perf`), learning (`/tap-explain`, `/tap-lab`, `/tap-research`) and
  self-improvement (`/tap-retro`, `/tap-evolve`, `/tap-status`, `/tap-scan`).
- Shared memory in `tap26/memory/` with the `memory.mjs` CLI and a session-start digest.
- Hooks and guardrails in `.claude/hooks/`, path-scoped rules in `.claude/rules/`.
- Artefact templates in `tap26/templates/` (bug report, test case, charter, story, test plan, ADR, PR,
  research, review, retro, evolution proposal, a11y/security/perf reports, release notes, impact, hand-off).
- OpenAPI contract, Swagger UI and mock server under `tap26/`.
- Student docs `tap26/docs/` and labs `tap26/labs/lab-01 … lab-15`.
- Self-evolution workflow: `tap26/evolution/` (proposals, this changelog, metrics).

### Decisions in force
- D-001 functional Playwright framework · D-002 serial runs on one shared DB · D-003 orchestration model ·
  D-004 zero-dependency Node tooling · D-005 known defects → `test.fail(true, 'KI-xx: …')` ·
  D-006 e2e journeys in `playwright/tests/e2e` · D-007 report locations and naming
  (see `tap26/memory/decisions.md`).
