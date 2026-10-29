# Lab 04 — Ask the roles: one feature, many perspectives

**Level:** ★☆☆ · **Time:** 45 min · **Tracks:** Tester, Developer, Full
**Skills/agents practised:** `/tap-ask`, `/tap-test-plan` · `business-analyst`, `ux-designer`, `security-tester`, `data-tester`, `a11y-auditor`, `be-dev`, `qa-lead`

## Learning objectives

1. Ask specialist agents role-specific questions and compare how each role "thinks".
2. Turn several role answers into one risk-based test plan.
3. Judge answer quality: grounded in code vs. generic textbook advice.
4. Explain when to ask a single role and when to ask the orchestrator.

## Prerequisites

- [Lab 03](lab-03-explore.md).

## Background

A real team looks at the same feature through different lenses. In TAP26 every lens is an agent with
its own system prompt, tools and memory. `/tap-ask <role> <question>` routes your question to exactly
one agent, which answers **read-only** with `file:line` citations and ends with *What I'd do next* and
*How to test this*. The feature under the microscope today: **requesting money** (a "Request" on the
New Transaction form → `POST /transactions` with `transactionType: "request"` → receiver accepts or
rejects via `PATCH /transactions/:transactionId`).

## Steps

### 0. Branch

```bash
git switch -c lab/04-ask-roles
```

### 1. Business analyst — what should it do?

```
/tap-ask ba write the user story and 4 Gherkin acceptance criteria for "request money from a contact", based on how the app behaves today
```

**Observe:** does it describe *current* behaviour (from code) or invent requirements? Look for
references to `TransactionCreateStepTwo.tsx` and `transaction-routes.ts`.

### 2. UX designer — is it usable?

```
/tap-ask ux review the request-money flow (3 steps: pick contact, amount+note, confirmation) against Nielsen's heuristics; top 3 issues only
```

### 3. Security tester — can it be abused?

```
/tap-ask security can a user accept a payment request that was sent to someone else, or request a negative amount? Check the validators and the PATCH handler.
```

**Observe:** the agent may only *reason* about the code or may propose a safe local probe. Which did it do?

### 4. Data tester — what data do we need?

```
/tap-ask data list boundary and equivalence values for the request amount and description fields, derived from the Yup schema and express-validator rules
```

### 5. Accessibility — can everyone use it?

```
/tap-ask a11y what WCAG 2.2 issues are likely on the New Transaction amount field and the Request/Pay buttons? Name the success criteria.
```

### 6. Backend developer — where is the logic?

```
/tap-ask be when a request is accepted, which function moves the money and where are the notifications created?
```

**Expected:** points at `updateTransactionById` in `backend/database.ts` (`isRequestTransaction` →
`debitPayAppBalance` / `creditPayAppBalance` → `createPaymentNotification`).

### 7. Bring it together — QA lead

```
/tap-test-plan request money — use the BA, UX, security, data and a11y findings from this conversation; risk-based, max 1 page
```

**Observe:** the plan is written to `tap26/reports/test-plans/` — the hand-off gives the exact file.

## ✅ Checkpoints

| # | Check | How | Expected |
|---|---|---|---|
| 1 | No code changed | `git status --short -- backend src playwright` | empty output |
| 2 | Grounded answers | step 6 answer | mentions `backend/database.ts` and `updateTransactionById` |
| 3 | Test plan exists | a new file under `tap26/reports/test-plans/` (path in the step 7 hand-off) | contains a risk table and at least 5 test ideas |
| 4 | Plan traceability | open the plan | each risk is linked to a role answer (BA/UX/security/data/a11y) |

## Stretch goals

- Ask the same question to two roles, e.g. `/tap-ask manual …` and `/tap-ask ui-auto …`:
  *"How would you test that a rejected request does not change balances?"* Compare their approaches.
- Ask the orchestrator in plain English *without* naming a role: *"What could go wrong with requesting
  money?"* Which agents did it involve? Was that better or worse than picking roles yourself?
- Turn one Gherkin scenario into an automation candidate and keep it for Lab 06.

## Reflection questions

1. Which role gave the most *specific* answer for this app, and which the most generic? What made the difference?
2. Did any two roles contradict each other? How would the orchestrator resolve that (hint: decisions in memory)?
3. What context did the security agent need that it could not get by reading code alone?
4. If you could only ask one role before a release, which would it be for this feature, and why?

## Reset

```bash
git add tap26 && git commit -m "lab 04: role answers and test plan"   # optional
git switch tap26-base
```

## Instructor notes

- `/tap-ask` is read-only by design. If an agent offers to change code, that's a cue to discuss
  *inquiry vs. change* boundaries (see `.claude/skills/tap-ask/SKILL.md`).
- Interesting findings for steps 3–4 (let students verify in `backend/validators.ts` and
  `backend/transaction-routes.ts`): `isTransactionPayloadValidator` only checks `amount` with
  `isNumeric().toInt()` (negatives pass; decimals are truncated by `toInt`), and the PATCH handler has
  **no ownership check** — any logged-in user can set `requestStatus` on any transaction id. Good
  agents find both (catalogued as **KI-18** and **KI-05** in `tap26/knowledge/known-issues.md`); weak ones answer from general knowledge. Do not "fix" these here — Lab 13/15 material.
- Encourage students to copy role answers into the test plan prompt if the conversation got long —
  context windows are finite, and compacted conversations lose detail.
- Typical weak answer: the a11y agent lists generic WCAG items without checking the actual MUI markup.
  Ask students to push back: *"Show me the JSX you based that on."*
