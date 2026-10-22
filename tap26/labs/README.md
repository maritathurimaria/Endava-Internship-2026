# TAP26-Junior labs

Fifteen hands-on exercises that teach **agentic development and testing** on the Cypress Real World
App. Each lab is done from the Claude Code panel in VS Code: you type the prompt or `/tap-*` command
shown, watch what the agents do, then **verify** the result with objective checkpoints.

New here? Read [`../README.md`](../README.md) first, then start with Lab 01. Stuck? Type
`/tap-lab NN hint`. Done? Type `/tap-lab NN check` and the tutor verifies your checkpoints with real
evidence.

## Overview

Level: ★☆☆ beginner · ★★☆ intermediate · ★★★ advanced. Times are for a first attempt.

| Lab | Level | Time | Skills / agents practised | You will be able to… |
|---|---|---|---|---|
| [01 Setup](lab-01-setup.md) | ★☆☆ | 30–45 min | `/tap-start` `/tap-setup` `/tap-doctor` · env-ops, tutor | create the `tap26-base` branch, install everything through an agent, read the doctor, name the 4 building blocks |
| [02 Run](lab-02-run.md) | ★☆☆ | 30–45 min | `/tap-run` `/tap-run-tests` `/tap-data` · env-ops, data-tester | start the app, reseed data, run api/ui-desktop/ui-mobile, read the report |
| [03 Explore](lab-03-explore.md) | ★☆☆ | 45–60 min | `/tap-scan` `/tap-explain` `/tap-test-cases` · knowledge-curator, tutor, manual-tester | build the app inventory, get cited answers with @-mentions, run a charter |
| [04 Ask the roles](lab-04-ask-roles.md) | ★☆☆ | 45 min | `/tap-ask` `/tap-test-plan` · BA, UX, security, data, a11y, be-dev, qa-lead | compare role perspectives and merge them into a risk-based plan |
| [05 First API test](lab-05-first-api-test.md) | ★★☆ | 45–60 min | `/tap-new-test` `/tap-review` `/tap-bug` · api-automation, code-reviewer | get a convention-following API test, prove it can fail, mark a defect with `test.fail` (D-005) |
| [06 First UI test](lab-06-first-ui-test.md) | ★★☆ | 60 min | `/tap-new-test` `/tap-run-tests` · ui-automation, tutor | write a data-driven UI test green on desktop + mobile, read a trace |
| [07 API change](lab-07-api-change.md) | ★★☆ | 60–90 min | `/tap-change-api` · be-dev → contract-guardian → test-impact-analyst → api-automation → doc-writer → code-reviewer | drive a gated multi-agent change: code + OpenAPI + tests + docs |
| [08 UI change](lab-08-ui-change.md) | ★★☆ | 60–90 min | `/tap-change-ui` `/tap-ask ux` · ux-designer → fe-dev → ui-automation → code-reviewer | add a UI rule + selector without breaking the contract; boundary tests |
| [09 Sync tests](lab-09-sync-tests.md) | ★★☆ | 45–60 min | `/tap-sync-tests` `/tap-scan` · test-impact-analyst, ui-automation | predict and repair the impact of a hand-made selector rename |
| [10 Swagger](lab-10-swagger.md) | ★★☆ | 45–60 min | `/tap-run swagger` `/tap-swagger` `/tap-new-test` · contract-guardian | call the API from Swagger UI, create + fix drift, extend the contract tests |
| [11 Mocks](lab-11-mocks.md) | ★★★ | 60–90 min | `/tap-mocks` `/tap-new-test` `/tap-bug` · mock-smith, ui-automation, ux-designer | render empty/error states with stubs, explore mock scenarios, find a vacuous assertion |
| [12 E2E journey](lab-12-e2e-journey.md) | ★★★ | 90 min | `/tap-e2e` `/tap-test-plan` · e2e-architect, ui-/api-automation | design and build a cross-layer journey in the `e2e` project (D-006) |
| [13 Debugging](lab-13-debugging.md) | ★★★ | 90–120 min | `/tap-debug` `/tap-change-api` `/tap-retro` · debugger, be-dev, knowledge-curator | root-cause an injected bug and a real defect (KI-01), add regression tests |
| [14 Docs](lab-14-docs.md) | ★★☆ | 60 min | `/tap-docs` · doc-writer, code-reviewer, knowledge-curator | generate docs from code and verify paths, links and claims mechanically |
| [15 Evolve](lab-15-evolve.md) | ★★★ | 90 min | `/tap-retro` `/tap-evolve` · knowledge-curator, code-reviewer | propose, approve, apply and verify a framework change (new skill or hook) |

## Suggested tracks

| Track | For | Labs | Total time (approx.) |
|---|---|---|---|
| **Tester track** | QA engineers, test automation learners | 01 → 02 → 03 → 04 → 05 → 06 → 09 → 10 → 11 → 12 → 13 → 14 | ~12 h |
| **Developer track** | developers who want test-aware agentic workflows | 01 → 02 → 03 → 05 → 06 → 07 → 08 → 09 → 10 → 13 → 15 | ~11 h |
| **Full track** | bootcamp / course (2–3 days) | 01 → 15 in order | ~15 h |

Dependencies between labs: 05 → 07 (Lab 07 extends your Lab 05 spec), 06 → 09 (Lab 09 includes your
Lab 06 spec). Every other lab works from `tap26-base` (created in [Lab 01](lab-01-setup.md), step 0).

## How every lab is built

1. **Header** — level, time, tracks, skills/agents practised.
2. **Learning objectives** and **Prerequisites**.
3. **Background** — the concept in a few paragraphs, with the real files involved.
4. **Steps** — numbered. Text in a code block without a language is a **prompt or slash command** to
   paste into the Claude Code panel; `bash` blocks run in the VS Code terminal.
5. **✅ Checkpoints** — objective checks (a command and its expected output, a file that must exist, a
   test that must pass). `/tap-lab NN check` runs them for you.
6. **Stretch goals**, **Reflection questions** (about the agentic workflow itself), **Reset**, and
   **Instructor notes** (pitfalls and brief solution hints).

## Branching and reset conventions

Every lab runs on its own branch so experiments never touch **`tap26-base`** — the baseline commit of
the project as you received it. You create `tap26-base` once, in [Lab 01](lab-01-setup.md) step 0
(`git init -b tap26-base` for a zip download, `git switch -c tap26-base` in an existing clone).
Checkpoints that say `git diff tap26-base -- …` compare your lab work with that baseline.

```bash
git switch tap26-base
git switch -c lab/NN-<name>            # e.g. lab/07-api-change
```

At the end of a lab:

```bash
git restore data/database.json         # runtime DB file: never commit it
git add -A && git commit -m "lab NN: <what you did>"   # keep your attempt on the lab branch
git switch tap26-base
node -e "fetch('http://localhost:3001/testData/seed',{method:'POST'}).then(r=>console.log('reseed',r.status))"
```

- Throw an attempt away instead: `git stash -u -m lab-NN && git switch tap26-base` (recoverable with `git stash list`).
- Delete a finished branch: `git branch -D lab/NN-<name>` (only when you no longer need it). If you ask
  Claude to do it, the TAP26 guard asks you to confirm first — `-D` discards commits that are not merged anywhere.
- Memory written during a lab (learnings, decisions, ledger) lives on that lab branch. Merge the branch,
  or re-run the `memory.mjs` command on `tap26-base`, to keep it.
- The API (nodemon) and UI (Vite) reload automatically after `git switch`; refresh the browser.
- The commands above are for *you* in the terminal. When an agent wants to run something destructive
  (`git reset --hard`, `git clean -f`, `git branch -D`, `git stash drop`, `git switch --force`, deleting
  tests), the TAP26 hooks make it ask you first.
- `git add -A` is safe here: runtime and private files (`tap26/memory/journal/`, `tap26/memory/.state/`,
  `node_modules/`, test results) are gitignored, so only real work is committed.

## Useful VS Code tasks

*Terminal → Run Task…* (defined in `.vscode/tasks.json`):

| Task | Does |
|---|---|
| TAP: Doctor | `node tap26/scripts/doctor.mjs` |
| TAP: Install all | app deps (no Cypress binary) → Playwright deps → Chromium |
| TAP: Start app | `yarn dev` as a background task |
| TAP: Swagger UI / TAP: Mock server | :3100 / :3101 |
| TAP: Test API / UI (desktop) / UI (mobile) / all | the Playwright projects |
| TAP: Playwright report | opens the last HTML report |
| TAP: Scan app / Impact analysis / Spec drift / Memory digest | the TAP26 scripts |
| TAP: Framework check | `node tap26/scripts/check-framework.mjs --strict` — run after any change to agents, skills, hooks or docs |
| TAP: Reset DB | `POST /testData/seed` |

Debug configurations (*Run and Debug* view): **TAP: Debug API**, **TAP: Debug Playwright current spec**,
**TAP: Chrome (frontend)**.

## For instructors

- Labs 01–04 need no coding; they build the habit *delegate → observe → verify*.
- Each lab's **Instructor notes** list the most common failure and a short solution hint. Resist giving
  full solutions — the reflection questions are where most of the learning happens.
- Known defects (`tap26/knowledge/known-issues.md`: KI-01…KI-33 plus A11Y-01…A11Y-04 and test-suite
  issues TS-01/TS-02) are a ready pool of extra
  exercises: one KI per student, `/tap-bug KI-xx`, then a fix via `/tap-change-api`.
- Running Playwright tests reseeds the shared database. In a classroom where students share one app
  instance, give each student their own checkout and app.
