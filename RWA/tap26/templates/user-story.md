<!--
  User story template — used by business-analyst (e.g. /tap-feature, /tap-ask ba).
  Save as tap26/reports/ba/ba-<YYYYMMDD-HHmm>-story-<slug>.md (D-007). INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable.
  Acceptance criteria are declarative Gherkin (business language — no clicks, no selectors).
-->
# STORY-{{###}} — {{short title}}

| Field | Value |
|---|---|
| Status | {{draft / ready / in progress / done}} |
| Author / date | {{business-analyst}} / {{YYYY-MM-DD}} |
| Persona | {{e.g. "Pay-app user who splits bills with friends"}} |
| Priority / size | {{MoSCoW}} / {{S, M, L}} |
| Affects | {{API routes, screens, machines, e.g. POST /bankAccounts, BankAccountForm.tsx}} |

## Story
**As a** {{role}}
**I want** {{capability}}
**So that** {{benefit / outcome}}

## Context & current behaviour
<!-- How the app behaves TODAY (cite files). Link known issues (KI-##) that are relevant. -->
{{…}}

## Business rules
1. {{rule — e.g. "A note is optional, max 100 characters"}}
2. {{rule}}

## Acceptance criteria
```gherkin
Feature: {{feature name}}

  Background:
    Given {{a logged-in user with …}}

  Scenario: {{happy path}}
    Given {{context}}
    When {{action}}
    Then {{observable outcome}}

  Scenario Outline: {{rule with partitions/boundaries}}
    When the user {{action}} with "<value>"
    Then {{outcome}} "<result>"
    Examples:
      | value | result |
      | {{v}} | {{r}}  |
```

## Out of scope
- {{explicitly excluded}}

## Non-functional notes
- Accessibility: {{labels, keyboard}} · Security: {{who may see/edit}} · Performance: {{if relevant}}

## UI / API notes
- New/changed `data-test` ids: {{ids}} · OpenAPI change: {{path/field}} · GraphQL: {{yes/no}}

## Open questions
- {{question}} → `node tap26/scripts/memory.mjs add-question "<text>" --by business-analyst`

## Traceability
| AC / rule | Test (file › title or TC id) | Status |
|---|---|---|
| {{AC1}} | {{…}} | {{planned / automated / manual}} |
