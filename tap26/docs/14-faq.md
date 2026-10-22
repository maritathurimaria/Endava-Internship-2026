# 14 · FAQ

Short answers, with links to the long ones.

## About TAP26

**What is TAP26-Junior, in one sentence?**
A team of 24 Claude Code agents, 31 slash commands, shared memory and guardrail hooks that develop, test,
document and explain the Cypress Real World App while you learn. → [README](../README.md)

**Do I need to know Playwright or Cypress first?**
No. Labs 05 and 06 teach the basics; the `tutor` agent explains anything (`/tap-explain …`). Knowing
JavaScript/TypeScript basics helps.

**Is TAP26 a separate tool I install?**
No. It is just files in this repo (`.claude/`, `tap26/`, `CLAUDE.md`) that Claude Code reads. If you
have the Claude Code extension and open this folder, you have TAP26.

**Does it work in the terminal too?**
Yes. Run `claude` (or `claude --agent tap-orchestrator`) in the integrated terminal; skills, agents,
hooks and memory behave the same. → [01 §5](01-getting-started-vscode.md#5-panel-mode-vs-terminal-mode)

**What does "Junior" mean?**
It is tuned for learners: teaching notes in every agent, a tutor, labs, extra guardrails and
explanations of *why* in hand-offs.

## Agents and skills

**Do I have to use slash commands?**
No. Plain English works — the orchestrator routes your request. Skills are faster and add quality gates.

**How do I know which agent did what?**
Read the hand-off reports and the orchestrator's "How this was done" summary. The journal
(`tap26/memory/journal/<date>.md`) also lists which agents finished.

**Why can't `be-dev` just write the tests too?**
Separation of concerns and an independent eye: the agent that wrote the code is the worst one to judge
whether it's tested well. Also, each agent keeps a smaller, focused context window.
→ [02 Architecture](02-architecture.md)

**Can an agent call another agent?**
Only `tap-orchestrator`, `qa-lead` and `e2e-architect`, and never deeper than three levels.

**The agent said "done" but something is wrong. What now?**
Reply with the specific problem and evidence. Ask for verification output. Run `/tap-review`. Agents
are fast, not infallible — you are the reviewer.

## Data, tests and the app

**Why did my data in the app disappear?**
Every Playwright test re-seeds the database (`POST /testData/seed`). So do `/tap-data reset` and
`yarn db:seed:dev`. That's by design: tests need a known starting state.

**What is the login?**
Any seeded user with password `s3cret`, e.g. `Heath93`, `Arvilla_Hegmann`, `Dina20`.

**Why do tests run one at a time?**
All tests share one JSON database file; running them in parallel would let them overwrite each other's data.

**Why no page objects?**
The framework is deliberately functional: small functions + fixtures are easier to compose, type and
read (decision D-001). → [07 Testing framework](07-testing-framework.md)

**I found a bug in the API. Is it already known?**
Check `tap26/knowledge/known-issues.md` (KI-01…KI-33 plus A11Y-01…A11Y-04 and test-suite issues TS-01/TS-02). If it's new, `/tap-bug <what you saw> verify`.

**Some tests are marked "expected to fail" — is that bad?**
No. They assert the correct behaviour for a known defect, marked `test.fail(true, "KI-xx: …")`
(decision D-005). When someone fixes the defect, they start passing and the marker is removed.

**Can I run the old Cypress tests?**
Yes, but you need the Cypress binary: `/tap-setup --with-cypress`. TAP26 uses Playwright.

## Swagger, mocks and contract

**Why does Swagger "Try it out" give 401?**
Log in first with `POST /login`, and make sure the selected server is **`/api`**. → [08](08-api-contract-and-swagger.md)

**Can I point the app UI at the mock server?**
No. The UI always calls the real API origin. Use `stubApi`/`transformApi` in Playwright for UI states;
use the mock server (:3101) to explore the API. → [09](09-mocks-and-stubs.md)

**Which file do I edit, `openapi.yaml` or `openapi.json`?**
Always the YAML. The JSON is generated.

## Memory, hooks and safety

**Is memory sent anywhere?**
Memory files are plain Markdown in the repo; they are read into Claude's context like any other file
and committed to git. Never put secrets in them.

**Can an agent delete my work?**
Destructive commands are blocked or need your approval (hooks + permission rules), and agents never
commit or push unless you ask. Still, review diffs and commit often on a branch.

**How do I turn the hooks off?**
`"disableAllHooks": true` in `.claude/settings.local.json`, then a new session. Turn them back on
afterwards. → [10](10-hooks-and-guardrails.md)

**What is the difference between `CLAUDE.md`, memory and knowledge?**
`CLAUDE.md` = rules and commands (always loaded). Memory = what happened and what we learned (facts,
decisions, learnings, ledger). Knowledge = a map of the app (routes, selectors, conventions, known issues).

## Costs and limits

**Does every request run all 24 agents?**
No. A question may run zero subagents; `/tap-change-api` runs about six. Bigger pipelines take longer and
use more of your plan's usage — ask for a plan first on large tasks.

**The conversation got long and the agent seems confused.**
Context windows fill up. Start a new session (`/clear`): the memory digest carries the important parts over.
Record anything important first with `memory.mjs` or `/tap-retro`.

## Contributing

**Can I change an agent?**
Yes — on a branch. Follow [11 Evolving TAP26](11-evolving-tap26.md), or let `/tap-evolve propose`
draft the change for you to approve.

**Where do I report a problem with TAP26 itself?**
Add an open question (`node tap26/scripts/memory.mjs add-question "…"`) and tell your instructor; the
`knowledge-curator` reviews them in retros.

More: [13 Troubleshooting](13-troubleshooting.md) · [Glossary](glossary.md).
