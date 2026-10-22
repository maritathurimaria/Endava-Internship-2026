# Glossary

Terms you will meet in TAP26, grouped by area. Domain terms for the shared memory live in
`tap26/memory/glossary.md`; this page is the student-facing version.

## Agentic development

| Term | Meaning |
|---|---|
| **Agent / subagent** | A Markdown-defined specialist (`.claude/agents/*.md`) with its own instructions, tools and context window. |
| **Orchestrator** | The lead agent (`tap-orchestrator`, and the main chat via `CLAUDE.md`) that classifies, plans, delegates and checks. |
| **Delegation** | Handing a task to another agent with the `Agent` tool. TAP26 caps depth at 3. |
| **Hand-off report** | The fixed-format summary every agent returns: Status, Changed files, Verification, Risks, Memory updated, Next agent. |
| **Skill** | A reusable, named procedure in `.claude/skills/<name>/SKILL.md`, invoked as a slash command (`/tap-…`). |
| **Slash command** | Typing `/name args` in the prompt box to run a skill or built-in command. |
| **`$ARGUMENTS`** | Placeholder in a skill replaced by whatever you typed after the command. |
| **Context window** | The amount of text a model can consider at once. Fills up; older parts get compacted. |
| **Compaction** | Summarising earlier conversation to free context space; detail is lost. |
| **`CLAUDE.md`** | Project instructions loaded into every session. |
| **Rule** | A path-scoped instruction file (`.claude/rules/*.md`, `paths:` frontmatter) loaded only for matching files. |
| **Hook** | A command run automatically on an event (SessionStart, PreToolUse, PostToolUse…). Deterministic. |
| **Guardrail** | A hook or permission rule that blocks or questions risky actions. |
| **Permission mode** | How much Claude asks before acting: Manual, Plan, Edit automatically, Auto. |
| **Least privilege** | Give each agent only the tools it needs. |
| **Tool** | A capability an agent can use: Read, Grep, Glob, Edit, Write, Bash, WebSearch, WebFetch, Agent. |
| **Frontmatter** | The YAML block between `---` lines at the top of an agent/skill/rule file. |
| **Output style** | A system-prompt variant changing how Claude responds (e.g. *TAP26 Mentor*, via `/output-style`). |
| **Shared memory** | `tap26/memory/*.md`: facts, decisions, learnings, change ledger, open questions, journal. |
| **Digest** | `MEMORY.md`, the ≤ ~120-line summary of shared memory loaded at session start. |
| **Change ledger** | `changes.md`: automatic log of app-file edits, used for test-impact analysis. |
| **Learning loop** | journal → retro → learnings → evolution proposal → approval → change → CHANGELOG. |
| **Evolution proposal** | A concrete, evidence-based suggested change to TAP26 (`tap26/evolution/proposals/`). |
| **Quality gate** | A condition that must hold before work is "done" (BLUEPRINT §7). |
| **Plan mode** | Claude describes the plan and waits for approval before changing anything. |
| **@-mention** | `@path/to/file` in a prompt to attach a file (optionally with a line range). |
| **Prompt** | What you type to the agent. Good prompts state goal, context, constraints, acceptance criteria. |

## Testing

| Term | Meaning |
|---|---|
| **Playwright** | Microsoft's browser and API test framework used in `playwright/`. |
| **Project (Playwright)** | A named configuration: `api`, `ui-desktop`, `ui-mobile`, `e2e`. |
| **Fixture** | A Playwright function that prepares a value for a test (`api`, `seed`, `db`, `users`, `me`) and cleans up. |
| **Auto fixture** | A fixture that runs for every test without being requested (`seed`, `me`). |
| **Locator** | Playwright's lazy handle to elements; here built with `bySel(page, "<data-test>")`. |
| **`data-test` attribute** | The selector contract between UI and tests; must stay stable. |
| **Web-first assertion** | `expect(locator).toBeVisible()` etc. — retries until true or timeout; replaces hard waits. |
| **Hard wait** | `waitForTimeout(ms)` — forbidden: slow and flaky. |
| **Flaky test** | Passes and fails without code changes. Gate 4 runs new tests twice to catch it. |
| **Trace** | A Playwright recording of actions, DOM snapshots, network and console; opened with `show-trace`. |
| **Seed** | The known starting data (`data/database-seed.json`) restored before every test. |
| **Test double** | Anything replacing a real dependency: stub, mock, fake, fixture data. |
| **Stub** | A canned response (`stubApi`). |
| **Mock server** | `mock-server.mjs` on :3101 serving responses from the OpenAPI spec and scenarios. |
| **Factory** | A pure function building test data with overrides (`buildTransaction({...})`). |
| **Contract test** | Checks a real response matches the OpenAPI schema (shape, not behaviour). |
| **Spec drift** | Differences between the OpenAPI spec and the implemented routes. |
| **Test impact analysis** | Deciding which tests a change affects (`impact.mjs`, `test-impact-analyst`). |
| **Regression test** | A test protecting behaviour that used to work (or a fixed bug) from breaking again. |
| **E2E journey** | A test following a real user goal across UI, API and data. |
| **Exploratory testing** | Simultaneous learning, test design and execution, guided by a charter. |
| **Charter** | A short mission for an exploratory session: explore *target* with *resources* to discover *information*. |
| **Gherkin** | `Given / When / Then` format for acceptance criteria. |
| **Traceability** | Linking requirements ↔ tests ↔ defects. |
| **Risk-based testing** | Spending test effort in proportion to likelihood × impact of failure. |
| **Boundary value** | A value at the edge of a valid range (e.g. 40 and 41 characters). |
| **Equivalence partition** | A group of inputs expected to behave the same; test one per group. |
| **`test.fail()`** | Marks a test as expected to fail (used for known defects with a KI id). |
| **WCAG / axe-core** | Accessibility guidelines / automated accessibility checker. |
| **IDOR** | Insecure Direct Object Reference: accessing another user's object by changing an id. |
| **p50 / p95** | Median / 95th-percentile latency. |

## API and app domain

| Term | Meaning |
|---|---|
| **RWA** | Cypress Real World App: a Venmo-style payments demo (React UI :3000, Express API :3001). |
| **lowdb** | A tiny JSON-file database; the app's data is `data/database.json`. |
| **OpenAPI / Swagger** | A machine-readable API description (`openapi.yaml`) / the UI that renders it (:3100). |
| **GraphQL** | A query language; the RWA uses it for bank accounts (`POST /graphql`). |
| **XState** | A state-machine library; the UI's auth and transaction flows are machines in `src/machines/`. |
| **Session cookie (`connect.sid`)** | How the API remembers you after `POST /login`. |
| **CORS** | Browser rule limiting cross-origin requests; the API allows only `http://localhost:3000`. |
| **422** | "Unprocessable Entity" — validation failed; body `{ errors: [...] }`. |
| **Transaction** | A payment or a request between two users; amounts in cents. |
| **Payment / Request** | Sending money vs asking for money (request status pending/accepted/rejected). |
| **Bank account** | A user's linked account used to fund payments. |
| **Bank transfer** | Moving money between the app balance and a bank account. |
| **Contact** | A user you are connected to; drives the "Friends" feed. |
| **Feeds** | Public (everyone), Contacts (friends), Personal (mine) transaction lists. |
| **Notification** | Created on likes, comments and payment events. |
| **Onboarding** | The first-login dialog asking a new user to add a bank account. |
| **KI-NN** | A known API defect in `tap26/knowledge/known-issues.md`. |
