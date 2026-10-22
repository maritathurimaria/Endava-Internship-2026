<!--
  Research report — used by /tap-research (researcher).
  Save as tap26/reports/research/research-<YYYYMMDD-HHmm>-<slug>.md (D-007).
  BLUF: bottom line up front. Every claim cited: repo `path:line`, or URL + access date.
  Label claims: [F] fact (verified), [I] inference, [O] opinion.
-->
# Research — {{question as a title}}

| Field | Value |
|---|---|
| Requested by / date | {{student}} / {{YYYY-MM-DD}} |
| Depth | {{quick / deep}} |
| Build | `{{git sha}}` |
| Confidence | {{high / medium / low}} — {{why}} |

## Bottom line
{{2–4 sentences answering the question directly, with the recommendation.}}

## Question & framing
- Question: {{restated precisely}}
- Decision it supports: {{…}}
- Sub-questions:
  1. {{…}}
  2. {{…}}

## What we already knew
- {{memory/knowledge entries reused: L-###, D-###, tap26/knowledge/…}}

## Findings
### 1. {{sub-question 1}}
- [F] {{finding}} — `{{path:line}}`
- [I] {{inference}} — based on {{…}}

### 2. {{sub-question 2}}
- [F] {{finding}} — {{URL}} (accessed {{YYYY-MM-DD}})

## Comparison
<!-- For "compare X vs Y" questions. Criteria derived from THIS repo's needs. -->
| Criterion | {{Option A}} | {{Option B}} | Evidence |
|---|---|---|---|
| {{criterion}} | {{…}} | {{…}} | {{cite}} |

## Recommendation
- Do: {{…}}
- Alternatives considered and why not: {{…}}
- Risks / unknowns: {{…}}

## Next steps
- {{skill or agent, e.g. `/tap-test-plan …`, `/tap-evolve propose …`}}

## Open questions (for a human)
- {{…}}

## Sources
1. `{{repo path:line}}`
2. {{Title}} — {{URL}} (accessed {{YYYY-MM-DD}})
