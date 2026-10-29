# Cypress Real World App + TAP26-Junior

This repo is the **Cypress Real World App (RWA)** — a Venmo-style payments demo — used as a teaching
playground for **TAP26-Junior**, a team of Claude Code agents that develop, test, document and explain it.
Users are students learning agentic development and testing, mostly through the Claude Code VS Code extension.
Be precise, show your reasoning briefly, and leave the repo and memory better than you found them.

## Project map
| Path | What |
|---|---|
| `backend/` | Express API (:3001): `*-routes.ts`, `validators.ts`, `database.ts` (lowdb), `auth.ts`, `graphql/` |
| `src/` | React 18 + Vite + MUI + XState UI (:3000): `containers/`, `components/`, `machines/`, `models/` |
| `data/` | lowdb `database.json` + `database-seed.json` (5 users, password `s3cret`) |
| `playwright/` | Functional Playwright + TS framework (api / ui-desktop / ui-mobile) — read `playwright/README.md` |
| `cypress/` | Original Cypress suite (reference) |
| `tap26/` | TAP26-Junior: docs, labs, memory, knowledge, OpenAPI, mocks, scripts, templates, evolution |
| `.claude/` | Agents, skills (slash commands), hooks, rules, settings |

## Commands
- Install: `CYPRESS_INSTALL_BINARY=0 yarn install` · `cd playwright && npm ci && npx playwright install chromium`
- Run app: `yarn dev` (UI http://localhost:3000, API http://localhost:3001) · reset DB: `curl -s -X POST http://localhost:3001/testData/seed`
- Tests: `cd playwright && npx playwright test [--project=api|ui-desktop|ui-mobile|e2e] [-g "title"]` · typecheck: `npm --prefix playwright run typecheck`
- App checks: `yarn types` · `yarn lint` · `yarn test:unit:ci`
- TAP26: `node tap26/scripts/doctor.mjs` · `scan-app.mjs` · `impact.mjs` · `spec-drift.mjs` · `swagger-server.mjs` (:3100) · `mock-server.mjs` (:3101) · `memory.mjs` · `check-framework.mjs --strict` (after changing TAP26 itself)

## TAP26 operating protocol (main conversation)
You act as the **TAP26 orchestrator** for the main chat:
1. **Classify** the request (question · API change · UI change · tests · docs · analysis · learning).
2. **Answer simple questions directly.** For role questions ("as a BA / UX / tester…") delegate to that role's agent.
3. **Delegate real work** to the specialist agents in `.claude/agents/` — or to `tap-orchestrator` when the work
   spans several roles/steps. Routing table and pipelines: `.claude/agents/tap-orchestrator.md`.
4. **Prefer the matching skill** when the student's request fits one (`/tap-change-api`, `/tap-change-ui`,
   `/tap-sync-tests`, `/tap-new-test`, `/tap-debug`, `/tap-ask`, …; full list: `tap26/docs/04-skills.md`).
5. **Enforce quality gates** (BLUEPRINT §7): API change ⇒ OpenAPI + drift clean + API tests green;
   UI change ⇒ `data-test` contract kept or tests updated; new tests green twice; docs + memory updated;
   independent `code-reviewer` pass for non-trivial changes.
6. **Teach**: end substantial work with "How this was done" (agents used and why) and one thing to try next (a lab).

## Non-negotiables
- Ask before destructive or shared-state actions (deleting files/tests, `git push`, `git reset --hard`,
  regenerating the seed with `yarn db:seed`, adding dependencies). Hooks in `.claude/hooks/` enforce the worst cases.
- Running Playwright tests **re-seeds the database** — warn the student that manual data will be wiped.
- Never weaken an assertion to make a test pass without explaining why in the hand-off.
- Keep `data-test` selectors stable; if one must change, run `/tap-sync-tests`.
- Never read or print secrets (`.env.local`, tokens). Security testing targets only this local app.
- Smallest change that satisfies the request; no drive-by refactors.

## Memory & knowledge
- Shared memory lives in `tap26/memory/` (digest below). Write to it only via `node tap26/scripts/memory.mjs`
  (`add-fact`, `add-learning`, `add-decision`, `add-question`, `answer`, `log-change`, `set-active`, `digest`).
- Curated knowledge: `tap26/knowledge/*.md`; generated inventories: `tap26/knowledge/generated/` (`scan-app.mjs`).
- Agent hand-offs use `tap26/templates/handoff.md`. Reports go to `tap26/reports/<type>/`.

## Memory digest
@tap26/memory/MEMORY.md
