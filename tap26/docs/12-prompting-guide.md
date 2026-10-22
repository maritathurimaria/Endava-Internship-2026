# 12 · Prompting guide — how to ask agents well

Agents are capable but literal. They do not know what is in your head, which screen you looked at, or
what "done" means to you. A good prompt closes those gaps. This guide gives you a simple structure,
real good/bad examples from this app, and habits that keep you in control.

## The GCCA structure

| Part | Question it answers | Example |
|---|---|---|
| **G**oal | What outcome do you want? | "Users can give a bank account a nickname." |
| **C**ontext | Where, who, what exists? | "Bank accounts are created via GraphQL `CreateBankAccount`; see @backend/bankaccount-routes.ts" |
| **C**onstraints | What must not change / limits? | "Optional, max 40 chars. Don't touch the seed. No new dependencies." |
| **A**cceptance criteria | How will we know it's done? | "422 on 41 chars; shown on the list; API + UI tests green twice." |

You don't need all four for a question — but for any change, missing **acceptance criteria** is the #1
cause of disappointing results.

## Good vs bad prompts (this app)

| ❌ Vague | ✅ Specific | Why it's better |
|---|---|---|
| "Add tests for bank accounts." | "`/tap-new-test api` \"POST /bankAccounts without bankName returns 422 with an error for bankName; with all three fields it returns 200 and the account belongs to the caller\"" | names endpoint, data, expected results |
| "Fix the flaky test." | "`/tap-debug` `transaction-feeds.spec.ts` › 'paginates the public feed' fails ~1 in 5 on ui-mobile with a timeout on `transaction-list`. Find the root cause; no hard waits or retries." | symptom, frequency, project, forbidden fixes |
| "Make the login page better." | "`/tap-ask ux` Review the sign-in page against Nielsen's heuristics. Give the top 3 issues with severity and a proposed change for each. Don't edit code." | role, method, output size, no edits |
| "Change the API." | "`/tap-change-api` `GET /notifications` should accept `?unreadOnly=true` and return only unread items. Default unchanged. Document in OpenAPI." | backwards compatibility stated |
| "Is the app secure?" | "`/tap-security` Can user Dina20 read or change bank accounts of Heath93? Test locally only, report with reproduction steps (see KI-06)." | concrete threat, users, safety limit |
| "Write docs." | "`/tap-docs` Add a 'nickname' row to the bank accounts section of the API guide and a release note. Audience: junior testers." | scope and audience |

## Habits that work

### 1. Ask for a plan first

For anything touching more than one file:

> *"Plan only — don't edit yet. List the agents you'd use, the files you'd change and how you'd verify."*

Or switch to **Plan** permission mode (`/plan …`). Read the plan, correct it, then say *"Go"*.

### 2. Point, don't describe

Use `@` to attach files (`@src/components/BankAccountItem.tsx`), or select lines and press `Alt+K` /
`Option+K`. Paste the **exact** error text and the command you ran. Name seed users (`Heath93`,
`Arvilla_Hegmann`) instead of "a user".

### 3. One goal per prompt

"Add a field, refactor the auth module and write a test plan" becomes three requests. Pipelines are
already multi-step; your job is to keep each goal clear.

### 4. Say what *not* to do

"No new dependencies." "Don't change existing `data-test` values." "Don't weaken assertions." "Don't
run the full suite, just the bank-account specs." Constraints prevent the most expensive surprises.

### 5. Iterate on the result, not from scratch

Good follow-ups:

- *"The negative test only checks status. Also assert the error message mentions accountNumber."*
- *"Explain why you chose `transformApi` instead of `stubApi` here."*
- *"Redo step 3 only; keep everything else."*

### 6. Review the diff, always

Every change ends with a hand-off listing **Changed files**. Open Source Control, read each diff, and
ask about anything you don't understand. Run `/tap-review` before committing.

### 7. Ask for teaching when you want to learn

*"Explain each step as you go"*, *"give me a hint, not the answer"* (`/tap-lab 05 hint`), or turn on
the **TAP26 Mentor** output style via `/output-style`.

## Which entry point should I use?

| You want… | Use |
|---|---|
| A fixed, gated pipeline (change + tests + docs) | the matching skill: `/tap-change-api`, `/tap-change-ui`, `/tap-feature` |
| An opinion from one role | `/tap-ask <role> …` or "Use the ux-designer agent to…" |
| One specialist to do one thing | "Use the **api-automation** agent to…" |
| Something open-ended or multi-role | describe it — the orchestrator routes it |
| To understand, not to change | `/tap-explain`, or ask with "don't edit" |

See [04 Skills](04-skills.md) for the full list.

## Prompt templates

**Change**
```
/tap-change-<api|ui> <goal>.
Context: <files/endpoints/screens, @mentions>.
Constraints: <what must not change, limits>.
Done when: <observable acceptance criteria>.
```

**Bug / failure**
```
/tap-debug <test or endpoint>: expected <X>, got <Y>.
Command: <exact command>. Error: <exact message>. Frequency: <always / 1 in N>.
Don't: add hard waits, retries or weaken assertions.
```

**Analysis**
```
/tap-ask <role> <question>. Base it on <files/data>. Output: <top N items, table, severity>. Don't edit files.
```

## Red flags in an agent's answer

| You see… | Ask… |
|---|---|
| "Should work now" with no command output | "Show the verification command and the result counts." |
| A test assertion was loosened | "Why was this assertion changed? Is the app wrong or the test?" |
| `waitForTimeout(…)` or `retries` added | "Find the real cause instead of waiting." |
| Files changed you didn't expect | "Why did you touch <file>? Revert it if not needed." |
| Status `partial` | "What's left, and what's blocking it?" |

> **Try it** — Take a vague prompt of your own, rewrite it with GCCA, send both (on separate branches)
> and compare the hand-offs.

Related: [06 Workflows](06-workflows.md) · [03 Agents](03-agents.md) · [Lab 04 — Ask the roles](../labs/lab-04-ask-roles.md).
