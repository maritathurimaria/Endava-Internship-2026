<!--
  Evolution proposal — used by /tap-evolve (knowledge-curator).
  Save as tap26/evolution/proposals/EP-###-<slug>.md. Status flow:
  proposed → (recommended: accept | needs-revision | rejected) → accepted (student agrees) → applied.
  Nothing is applied without the student's explicit "yes" in chat.
-->
# EP-{{###}} — {{title}}

| Field | Value |
|---|---|
| Status | {{proposed / needs-revision / accepted / rejected / applied}} |
| Author / date | {{knowledge-curator / student}} / {{YYYY-MM-DD}} |
| Semver impact | {{patch (wording/docs) / minor (new or changed behaviour, skill, agent) / major (rename/remove)}} |
| Guardrail impact | {{none / tightens / **LOOSENS** — name the exact rule}} |
| Evidence | {{L-###, retro files, journal dates, failed gates, metrics}} |

## Problem
{{What hurts today, for whom, how often — with evidence.}}

## Proposed change
| File | Action | Summary |
|---|---|---|
| `{{.claude/skills/tap-xxx/SKILL.md}}` | {{add / edit / remove}} | {{…}} |
| `{{.claude/agents/xxx.md}}` | {{…}} | {{…}} |
| `{{tap26/docs/…}}` | {{…}} | {{…}} |

Out of bounds for evolution: `backend/`, `src/`, `data/`, `cypress/`.

## Alternatives considered
- {{alternative}} — {{why not}}

## Risks
- {{risk}} — mitigation: {{…}}

## How we will test the change
- {{e.g. frontmatter parses; skill invoked on example X produces Y; doctor --quick passes}}

## Success metric
- {{measurable, e.g. "flaky-test triage time down from ~20 to ~5 min over next 3 sessions" → tracked in metrics.md}}

## Review
<!-- Filled by /tap-evolve review -->
- Recommendation: {{accept / revise / reject}} — {{reason}}
- Overlaps: {{other EPs / skills}}

## Approval & application log
<!-- Filled by /tap-evolve apply -->
- Student approval: {{quote "yes, apply EP-###" + date}}
- Guardrail approval (if loosening): {{quote + date, or "n/a"}}
- Applied: {{YYYY-MM-DD}} · Version: {{x.y.z}} · Verification: {{commands + results}}
- Deviations from plan: {{…}}
