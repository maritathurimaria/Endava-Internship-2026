# Evolution proposals (EP-###)

TAP26-Junior improves itself through **proposals**: small, evidence-based, reviewable changes to its
agents, skills, rules, templates, docs or scripts. Nothing changes without the student's explicit approval.

## Lifecycle
```
/tap-evolve propose <idea>   →  EP-###-<slug>.md   status: proposed
/tap-evolve review           →  recommendation     status: needs-revision | rejected | (recommended: accept)
student agrees in chat       →                     status: accepted
/tap-evolve apply EP-###     →  plan shown, student says "yes"  →  changes applied, verified
                             →  CHANGELOG.md entry + metrics.md row + decision in memory   status: applied
```

## Rules
1. **One idea per proposal.** Name: `EP-###-<kebab-slug>.md`; next id = highest existing + 1.
2. **Evidence first.** Link learnings (L-###), retros, journal entries, failed gates or metrics.
3. **Explicit approval.** Only a clear "yes" / "apply EP-###" from the student in chat counts.
4. **Guardrails.** Any change that *loosens* `.claude/settings.json` permissions or hooks in
   `.claude/hooks/` must be flagged **LOOSENS** and needs its own, separate approval.
5. **Scope.** Evolution touches the framework only — never `backend/`, `src/`, `data/` or `cypress/`.
6. **Formats are contracts.** Keep BLUEPRINT formats (agent sections §3, skill format §9, hand-off §7);
   changing them is a **major** version.
7. **Measure.** Every proposal states a success metric; revisit it in `../metrics.md` after ~3 sessions
   and record keep/revert.

## Template
`tap26/templates/evolution-proposal.md`

## Index
<!-- Updated by the knowledge-curator when a proposal is created or changes status. -->
| EP | Title | Status | Version |
|---|---|---|---|
| EP-001 | Make Playwright test tasks PowerShell-safe | proposed | 1.0.0 |
