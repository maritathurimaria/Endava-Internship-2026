<!--
  Architecture Decision Record (Michael Nygard style) — used by doc-writer and any agent recording
  a significant, hard-to-reverse decision. Save as tap26/docs/adr/ADR-###-<slug>.md (or attach to a report).
  Small decisions go to memory instead: `node tap26/scripts/memory.mjs add-decision …` (D-###).
-->
# ADR-{{###}}: {{decision title in imperative form, e.g. "Use a functional Playwright framework without page objects"}}

| Field | Value |
|---|---|
| Status | {{proposed / accepted / superseded by ADR-### / deprecated}} |
| Date | {{YYYY-MM-DD}} |
| Deciders | {{student, agents involved}} |
| Related | {{D-### in tap26/memory/decisions.md, EP-###, story, issue}} |

## Context
<!-- The forces at play: problem, constraints (Windows Git Bash, zero-dep tooling, junior students,
     shared JSON DB, …), what happens if we do nothing. Facts, not opinions; cite files. -->
{{…}}

## Decision drivers
- {{driver 1 — e.g. readability for juniors}}
- {{driver 2}}

## Options considered
| Option | Pros | Cons |
|---|---|---|
| {{A}} | {{…}} | {{…}} |
| {{B}} | {{…}} | {{…}} |
| {{C — do nothing}} | {{…}} | {{…}} |

## Decision
We will {{chosen option}}, because {{main reasons tied to the drivers}}.

## Consequences
- Positive: {{…}}
- Negative / trade-offs: {{…}}
- Follow-up work: {{tasks, owners}}

## Verification
<!-- How we will know the decision is working (metric, review date). -->
{{…}}
