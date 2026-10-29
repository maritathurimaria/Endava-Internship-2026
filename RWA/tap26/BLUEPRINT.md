# TAP26-Junior — Build Blueprint (internal contract for builders)

TAP26-Junior is a Claude Code multi-agent framework that lives inside the Cypress Real World App
repository and is used from the **Claude Code VS Code extension** by students learning agentic
development & testing. This file is the single source of truth every builder follows.

## 1. Repository facts (verified)

- App: React 18 + Vite + MUI + XState frontend (`src/`), Express + lowdb + GraphQL backend (`backend/`).
- Start: `yarn dev` → UI http://localhost:3000, API http://localhost:3001 (`start:api:watch` = nodemon + ts-node, auto-reloads `backend/`).
- Install: Node 22 (`.nvmrc`), Yarn 1 classic. `CYPRESS_INSTALL_BINARY=0 yarn install` skips the Cypress binary.
- DB: `data/database.json` (lowdb). Reset: `POST http://localhost:3001/testData/seed` or `yarn db:seed:dev`.
  Seed source: `data/database-seed.json` (5 users, password `s3cret`). Regenerate: `yarn db:seed`.
- `data-test` attributes are the selector contract between UI and tests.
- Existing tests: Cypress (`cypress/tests/{api,ui}`), Vitest unit (`src/__tests__`), and our **Playwright
  framework in `playwright/`** (functional style, no classes; see `playwright/README.md`).
- App services exposed on `window` when `window.Cypress` is truthy (Playwright sets it via `exposeAppServices`).
- Shell: Claude Code on Windows runs Bash-tool commands through Git Bash; hooks use exec form (`node` + args, no shell) → all scripts and hooks are **Node (.mjs), zero-dependency, cross-platform**.

## 2. Directory layout

```
CLAUDE.md                         project + framework instructions (always loaded)
.claude/
  settings.json                   permissions, hooks, env (committed)
  agents/<name>.md                24 agents: an orchestrator + 23 specialists (see §3)
  skills/<name>/SKILL.md          31 skills = slash commands (see §4) + supporting files
  hooks/*.mjs                     guardrails (guard-bash, guard-edit), session context, change ledger, journal
  rules/*.md                      path-scoped rules (`paths:` frontmatter): backend, frontend, playwright, openapi
  output-styles/tap26-mentor.md   optional teaching output style (/output-style)
  agent-memory/<agent>/           per-agent private memory (created by Claude Code for `memory: project`)
.vscode/                          tasks.json, launch.json, extensions.json, settings.json
tap26/
  README.md                       START HERE for students
  BLUEPRINT.md                    this file
  docs/                           student documentation (see §8)
  labs/                           guided exercises lab-01 … lab-15
  memory/                         SHARED memory (see §5)
  knowledge/                      curated knowledge base (app map, conventions)
  knowledge/generated/            produced by `scan-app.mjs` (do not hand-edit)
  openapi/openapi.yaml|json       API contract (source of truth: yaml)
  swagger/                        Swagger UI page (index.html)
  mocks/                          mock server, scenarios, fixtures
  templates/                      artefact templates (bug, test case, story, ADR, PR, test plan, report…)
  evolution/                      self-evolution: proposals/, CHANGELOG.md, metrics.md
  reports/                        generated outputs per D-007 (`reports/<type>/`); keeps a README.md; gitignored except README.md, retros/ and bugs/
  scripts/                        node scripts (see §6)
  package.json                    `npm run tap:*` script aliases (no dependencies)
```

## 3. Agent roster (.claude/agents) — 24 agents (an orchestrator + 23 specialists)

Naming: kebab-case, prefix-free. Every agent file has: frontmatter (name, description with
"Use when…" + 2 example triggers, tools, model, color, memory: project) and a body with these
sections in order:

1. `# <Title>` + one-paragraph mission
2. `## You are consulted for` (bullets)
3. `## Before you start` — read `tap26/memory/MEMORY.md` digest + the specific memory/knowledge files listed per agent
4. `## How you work` — numbered procedure
5. `## Standards` — concrete rules (code style, selectors, test conventions, FP rules…)
6. `## Outputs` — files/paths you produce, and the **hand-off report** format (see §7)
7. `## Memory duties` — what to append to shared memory and when (via `node tap26/scripts/memory.mjs …`)
8. `## Boundaries` — what you must NOT do; when to stop and hand back to the orchestrator
9. `## Teaching mode` — how to explain your work to a student (brief "why" notes, point to docs/labs)

| # | name | role | writes code? |
|---|------|------|--------------|
| 1 | `tap-orchestrator` | Lead/conductor. Main-thread agent. Classifies requests, plans, delegates to specialists, enforces quality gates (§7), consolidates hand-offs, updates memory, runs retros. | no (delegates) |
| 2 | `be-dev` | Backend developer: Express routes, validators, lowdb `database.ts`, GraphQL schema/resolvers, seed data. Updates OpenAPI with every API change. | yes (backend/) |
| 3 | `fe-dev` | Frontend developer: React/MUI components, XState machines, routing, forms (Formik/Yup). Preserves/adds `data-test`. | yes (src/) |
| 4 | `env-ops` | Environment & DevOps: install, Node/Yarn versions, ports, running app/tests, CI (GitHub Actions), doctor. | scripts/config |
| 5 | `debugger` | Root-cause analysis for broken app, failing/flaky tests: reproduce, isolate, trace, fix proposal. | minimal fixes |
| 6 | `api-automation` | Playwright API tests in `playwright/tests/api` using `src/api/*` functions. | yes (playwright/) |
| 7 | `ui-automation` | Playwright UI tests in `playwright/tests/ui` using `src/ui/*` helpers and fixtures. | yes (playwright/) |
| 8 | `e2e-architect` | Designs cross-layer end-to-end journeys (UI+API+data), suite structure, tagging, sharding. | yes (playwright/) |
| 9 | `test-impact-analyst` | Translates app changes (git diff / change ledger) into a test impact report and an update plan; drives test sync. | reports |
| 10 | `contract-guardian` | Owns `tap26/openapi/*`; detects spec ↔ implementation drift; contract tests; Swagger UI. | spec + contract tests |
| 11 | `mock-smith` | Mocks & stubs: mock server scenarios, Playwright stub builders, data factories, fixtures. | yes |
| 12 | `manual-tester` | Exploratory charters, test cases, bug reports, session notes; explores the running app via Playwright scripts/codegen. | test docs |
| 13 | `data-tester` | Test data design, DB integrity checks, seed analysis, boundary/equivalence data, data-driven tests. | data + checks |
| 14 | `qa-lead` | Test strategy, risk-based plans, coverage & traceability matrix, quality reports, release readiness. | plans/reports |
| 15 | `a11y-auditor` | Accessibility audits (axe-core + manual WCAG 2.2 checks), a11y tests. | tests/reports |
| 16 | `security-tester` | AppSec checks: authn/z, IDOR, validation, headers, dependency audit (OWASP Top 10 lens), safe-only. | reports/tests |
| 17 | `perf-tester` | Performance smoke: API latency baselines (zero-dep Node load script), Web Vitals via Playwright. | scripts/reports |
| 18 | `business-analyst` | Requirements, user stories, Gherkin acceptance criteria, process flows, traceability. | docs |
| 19 | `ux-designer` | UX reviews (Nielsen heuristics), flows, copy, wireframes (Mermaid/ASCII), design-change specs for fe-dev. | docs |
| 20 | `doc-writer` | Technical docs, READMEs, ADRs, release notes, API guides, keeps `tap26/docs` and knowledge fresh. | docs |
| 21 | `code-reviewer` | Independent review of app and test diffs against standards; read-only; verdict + findings. | no |
| 22 | `researcher` | Deep research & analysis: codebase investigations, web research, comparisons; cited reports. | reports |
| 23 | `tutor` | Teaching companion: explains concepts, Socratic hints, quizzes, reviews student work kindly; never just does the lab for them unless asked. | no |
| — | `knowledge-curator` (24) | Self-learning: curates memory, runs retros, distills learnings, proposes and (after approval) applies agent/skill evolutions. | memory/evolution |

(24 agents total; ≥20 functions required.)

Tool allocation (least privilege):
- read-only agents (`code-reviewer`, `tutor`): Read, Grep, Glob, Bash (git/test/read-only commands only). Enforced by hooks: edits outside `.claude/agent-memory/` are denied, and so are write-type shell commands. They never edit project files; the caller saves their reports.
- analysis agents (`ux-designer`, `business-analyst`, `researcher`, `qa-lead`): Read, Grep, Glob, Edit, Write, Bash (+ WebSearch/WebFetch for researcher) — they write only their own artefacts under `tap26/`.
- builders (`be-dev`, `fe-dev`, `api-automation`, `ui-automation`, `e2e-architect`, `mock-smith`, `contract-guardian`, `data-tester`, `debugger`, `env-ops`, `a11y-auditor`, `security-tester`, `perf-tester`, `doc-writer`, `knowledge-curator`, `test-impact-analyst`, `manual-tester`): Read, Grep, Glob, Edit, Write, Bash (+ WebFetch/WebSearch for researcher-ish roles).
- Model: `inherit` by default; `sonnet` for tutor/doc-writer/manual-tester is acceptable; `opus` for orchestrator/researcher/debugger/code-reviewer if supported.

## 4. Skills (.claude/skills/<name>/SKILL.md) — slash commands

All user-invocable, names prefixed `tap-`. Each SKILL.md: frontmatter (name, description, argument-hint)
and body sections: `## Goal`, `## Inputs` ($ARGUMENTS), `## Steps` (numbered, naming which agent to
delegate each step to), `## Quality gates`, `## Output` (where results go + hand-off summary),
`## Memory` (what to record), `## Learn more` (link to tap26/docs + labs).

| skill | purpose | lead agent(s) |
|---|---|---|
| `tap-start` | Onboarding: doctor, explain framework, suggest first lab | orchestrator, env-ops, tutor |
| `tap-setup` | Install all dependencies (app, playwright, browsers) | env-ops |
| `tap-run` | Start app (and optionally swagger/mock), verify health | env-ops |
| `tap-doctor` | Diagnose environment & app health | env-ops, debugger |
| `tap-debug` | Debug a symptom/failing test end-to-end | debugger |
| `tap-change-api` | Implement an API change + spec + tests + docs | be-dev → contract-guardian → test-impact-analyst → api-automation → doc-writer → code-reviewer |
| `tap-change-ui` | Implement a UI change + selectors + tests + docs | ux-designer(opt) → fe-dev → test-impact-analyst → ui-automation → doc-writer → code-reviewer |
| `tap-feature` | Full feature slice (story → API → UI → tests → docs) | business-analyst → be-dev → fe-dev → testers → doc-writer |
| `tap-sync-tests` | Translate app changes (diff) into test updates | test-impact-analyst → api/ui-automation |
| `tap-new-test` | Create a test (api / ui / e2e) from a description | api-automation / ui-automation / e2e-architect |
| `tap-run-tests` | Run suites/projects/grep, summarize, triage failures | env-ops, debugger |
| `tap-e2e` | Extend the suite with an end-to-end journey | e2e-architect |
| `tap-swagger` | Regenerate/validate OpenAPI, check drift, serve Swagger UI | contract-guardian |
| `tap-mocks` | Generate mocks/stubs/fixtures/scenarios | mock-smith |
| `tap-docs` | Generate/refresh documentation | doc-writer |
| `tap-ask` | Ask a role: `ux|be|fe|ba|manual|data|ui-auto|api-auto|qa|security|perf|a11y` | mapped agent |
| `tap-test-plan` | Risk-based test plan for a feature/change | qa-lead |
| `tap-test-cases` | Manual test cases / exploratory charters | manual-tester |
| `tap-bug` | Write a reproducible bug report (optionally verify) | manual-tester, debugger |
| `tap-data` | Test data ops: inspect, generate, reset, integrity checks | data-tester |
| `tap-review` | Independent code review of current diff | code-reviewer |
| `tap-a11y` | Accessibility audit | a11y-auditor |
| `tap-security` | Security assessment (safe, local only) | security-tester |
| `tap-perf` | Performance smoke + report | perf-tester |
| `tap-research` | Deep research/analysis report | researcher |
| `tap-explain` | Teach a concept or explain code | tutor |
| `tap-lab` | Start/check a lab exercise | tutor |
| `tap-retro` | Retrospective → learnings into memory | knowledge-curator |
| `tap-evolve` | Propose/apply framework improvements (self-evolution) | knowledge-curator |
| `tap-status` | Dashboard: app health, memory digest, recent changes, open questions | orchestrator |
| `tap-scan` | Refresh generated knowledge (routes, selectors, tests, coverage) | knowledge-curator, env-ops |

## 5. Shared memory model (tap26/memory)

- `MEMORY.md` — digest (≤ 120 lines) imported by `CLAUDE.md` (`@tap26/memory/MEMORY.md`), so every session loads it; the SessionStart hook adds app health + today's change ledger. Sections: Project facts, Conventions, Active work, Recent learnings (top 10), Open questions (top 5). Maintained by knowledge-curator; regenerated by `memory.mjs digest`.
- `facts.md` — stable verified facts (ports, commands, users, gotchas). Entry: `- [area] fact (verified YYYY-MM-DD by <agent>)`.
- `decisions.md` — ADR-lite log: `## D-### Title` / Context / Decision / Consequences / Date / By.
- `learnings.md` — lessons: `## L-### Title` / tags / What happened / Lesson / Applies to (agents/skills) / Date / Source.
- `changes.md` — **change ledger** of app modifications (auto-appended by PostToolUse hook for `backend/**`, `src/**`, `data/**` edits; agents add intent lines). Consumed by test-impact-analyst. Entry: `- YYYY-MM-DD HH:MM | <file> | <tool> | <agent/session>`.
- `open-questions.md` — `- [ ] Q-### question (asked by, date)` → checked with answer when resolved.
- `glossary.md` — domain + testing terms.
- `journal/YYYY-MM-DD.md` — session journal (auto by hooks: prompts, agents finished, guardrail decisions). **Gitignored**, local only (contains the student's prompts); `/tap-retro` summarises it into tracked files.
- `.state/` — local hook state, incl. `usage.json` skill/agent usage counters read by `/tap-retro` for `tap26/evolution/metrics.md`. Gitignored.
- Per-agent private notes: agent frontmatter `memory: project` (Claude Code stores under `.claude/agent-memory/<agent>/`) — use for agent-specific heuristics; promote general ones to `learnings.md`.

Writing rule: agents append via `node tap26/scripts/memory.mjs <add-fact|add-learning|add-decision|add-question|answer|log-change|digest> …` so format stays consistent; never delete others' entries; mark superseded entries instead.

## 6. Scripts (tap26/scripts, Node ≥ 18, zero deps)

| script | purpose |
|---|---|
| `doctor.mjs` | Env & health check (node/yarn versions, deps, playwright browsers, ports 3000/3001/3100/3101, API/UI reachability, DB file) → table + exit code |
| `memory.mjs` | Memory CLI (see §5) |
| `scan-app.mjs` | Generates `tap26/knowledge/generated/{api-routes,ui-selectors,ui-routes,tests-inventory,coverage-matrix}.md` |
| `impact.mjs` | Test impact analysis from `git diff` (or `--since <ref>`) + change ledger: impacted routes, selectors added/removed, tests referencing them |
| `spec-drift.mjs` | Compare OpenAPI paths/methods with scanned Express routes; report missing/extra |
| `swagger-server.mjs` | Serves Swagger UI on :3100 with same-origin proxy `/api/*` → API (cookies work) |
| `mock-server.mjs` | Spec-driven mock API on :3101 with scenarios (`x-mock-scenario` header / `__scenario` query) and optional seed-backed data |
| `perf-smoke.mjs` | Tiny concurrent latency probe for key endpoints (p50/p95) |
| `check-framework.mjs` | Framework self-check: agent/skill frontmatter, slash-command and agent references, paths, links, JSON, hook wiring (`--strict`: warnings fail). Run after any framework change; VS Code task *TAP: Framework check* |

Hooks live in `.claude/hooks/`: `session-start.mjs`, `guard-bash.mjs`, `guard-edit.mjs`, `change-ledger.mjs`, `journal.mjs` (shared helpers in `lib.mjs`).

`tap26/package.json` scripts: `tap:doctor`, `tap:scan`, `tap:impact`, `tap:drift`, `tap:swagger`, `tap:mock`, `tap:perf`, `tap:memory`.

## 7. Quality gates & hand-off protocol

Every delegated agent ends with a **Hand-off report**:
```
## Hand-off — <agent>
Status: done | partial | blocked
Changed files: …
Verification: commands run + results (paste counts, not walls of logs)
Risks / follow-ups: …
Memory updated: facts/learnings/decisions/changes ids
Next suggested agent: …
```
Decisions D-005 (known defects → `test.fail('KI-xx')`), D-006 (e2e in `playwright/tests/e2e`, project `e2e`) and
D-007 (reports in `tap26/reports/<type>/`) in `tap26/memory/decisions.md` are part of this contract.

Gates the orchestrator enforces before declaring done:
1. App change ⇒ app still starts; `yarn types` passes for touched TS.
2. API change ⇒ OpenAPI updated + `spec-drift` clean + api tests updated & green.
3. UI change ⇒ `data-test` contract preserved or tests updated; ui tests green (desktop; mobile when layout touched).
4. New/changed tests ⇒ pass 2× in a row (flake check), follow FP conventions, typecheck clean.
5. Docs updated for user-visible changes; change recorded in memory.
6. Independent `code-reviewer` pass for non-trivial changes.

## 8. Student documentation (tap26/docs)

00-index, 01-getting-started-vscode, 02-architecture (Mermaid diagrams), 03-agents (catalog), 04-skills
(reference), 05-memory-and-self-learning, 06-workflows (change→tests→docs; debugging; feature slice),
07-testing-framework, 08-api-contract-and-swagger, 09-mocks-and-stubs, 10-hooks-and-guardrails,
11-evolving-tap26, 12-prompting-guide, 13-troubleshooting, 14-faq, glossary. Labs: `tap26/labs/lab-01 … lab-15`
(setup → run → explore → ask roles → first API test → first UI test → API change → UI change → sync tests →
swagger → mocks → e2e journey → debugging → docs → evolve the framework). Each lab: goal, prerequisites,
steps with exact prompts/commands, checkpoints, stretch goals, reflection questions.


## 9. Claude Code format reference (verified 2026-10-16, code.claude.com/docs)

**Subagent frontmatter** (only name+description required; camelCase keys):
```yaml
---
name: be-dev
description: Backend developer for the RWA Express/lowdb/GraphQL API. Use when … Examples: "add a field to …", "why does POST /x return 422".
tools: Read, Grep, Glob, Edit, Write, Bash, Agent     # comma list; omit Agent to forbid delegation
model: inherit            # sonnet | opus | haiku | inherit
color: blue               # red|blue|green|yellow|purple|orange|pink|cyan
memory: project           # private notes in .claude/agent-memory/<name>/
effort: high              # optional: low|medium|high|xhigh|max
---
```
- Subagents CAN delegate (`Agent` tool) up to 3 levels deep. Only `tap-orchestrator`, `qa-lead` and `e2e-architect` get `Agent`; everyone else omits it (prevents runaway nesting).
- The main VS Code chat follows the orchestrator protocol defined in `CLAUDE.md`; the `tap-orchestrator` subagent handles multi-step requests. Terminal users can also run `claude --agent tap-orchestrator`.

**Skill frontmatter** (`.claude/skills/<name>/SKILL.md`, invoked as `/name args`):
```yaml
---
name: tap-change-api
description: Implement a change to the RWA API end-to-end (code, OpenAPI, tests, docs). Use when …
argument-hint: "<what to change>"
arguments: [request]          # optional named args → $request ; $ARGUMENTS = everything
disable-model-invocation: false
# for single-agent skills you may fork: context: fork + agent: code-reviewer
---
```
- Substitutions: `$ARGUMENTS`, `$0`, `$name`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`.
- Inline shell (runs at invocation, output inlined): !`git status --short` — use sparingly and only for safe read-only commands; a failing command aborts the skill.
- Keep SKILL.md < 500 lines; put long checklists in sibling files (e.g. `checklist.md`) and link them.

**Hooks** (`.claude/settings.json`): events used — SessionStart (matcher `startup|resume|clear|compact|fork`) → `session-start.mjs`, stdout/`additionalContext` injected; UserPromptSubmit → `journal.mjs`; PreToolUse `Bash` → `guard-bash.mjs` and `Edit|Write|MultiEdit|NotebookEdit` → `guard-edit.mjs`; PostToolUse `Edit|Write|MultiEdit` → `change-ledger.mjs`; SubagentStop → `journal.mjs`. No Stop hook.
Command form (exec, no shell): `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>.mjs"]`. Stdin JSON: session_id, cwd, hook_event_name, tool_name, tool_input, agent_type, prompt, source.
Block a tool: print `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}` (exit 0) or exit 2 with stderr.

**Rules** (`.claude/rules/*.md`): frontmatter `paths: ["backend/**"]`; load when matching files are read/edited.

**VS Code**: agents, skills (`/`), hooks, settings, CLAUDE.md, output styles all work in the extension. `.vscode/settings.json` may set `claudeCode.preferredLocation`, `claudeCode.respectGitIgnore`. Do not put `initialPermissionMode` in workspace settings.
