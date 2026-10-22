---
name: tap-doctor
description: "Deep diagnosis of the TAP26 environment and Real World App health: Node/Yarn versions, dependencies, Playwright browsers, ports 3000/3001/3100/3101, API/UI reachability, database file, plus root-cause analysis by the debugger when the app is unhealthy. Gives a fix for every problem and records stable facts. Use when 'something is wrong with my setup', tests fail before they start, the app will not load, or after an OS/Node upgrade."
argument-hint: "[optional symptom, e.g. 'port 3001 in use' or 'chromium missing']"
allowed-tools: Bash(node tap26/scripts/*), Bash(tail *), Bash(git status *)
---

# /tap-doctor — diagnose environment & app health

## Goal
Find out exactly what is unhealthy in the student's environment or running app, explain why in
plain words, and give a concrete fix for each finding — fixing only what is safe and approved.

## Inputs
- `$ARGUMENTS` — optional symptom text from the student (e.g. "EADDRINUSE 3001", "browserType.launch
  failed"). When present, the diagnosis must explicitly confirm or rule it out.
- Empty → full check of everything.

Quick snapshot at invocation (read-only):
!`node tap26/scripts/doctor.mjs --quick 2>&1 | tail -25 || true`

## Steps
1. **Full doctor.** Delegate to the `env-ops` agent with: "Run `node tap26/scripts/doctor.mjs`
   (full mode) from the repo root. For each row return status, evidence and a fix. Additionally check:
   `node --version` vs `.nvmrc`; `yarn --version` is 1.x; `playwright/node_modules/@playwright/test`
   exists; `npx --prefix playwright playwright --version`; `data/database.json` parses as JSON
   (`node -e \"JSON.parse(require('fs').readFileSync('data/database.json','utf8'))\"`);
   `playwright/.env` vs `playwright/.env.example`; `PAGINATION_PAGE_SIZE` equal in `.env` and
   `playwright/.env`. Symptom to confirm or rule out: $ARGUMENTS. Do not install or kill anything —
   propose commands instead. End with the standard hand-off."
2. **App unhealthy?** If :3000 or :3001 is down while `yarn dev` should be running, or either URL
   returns non-200, delegate to the `debugger` agent with: "The RWA is unhealthy: <doctor rows>.
   Reproduce with `curl -i http://localhost:3001/testData/users` and `curl -i http://localhost:3000`,
   read the `yarn dev` output (nodemon/ts-node errors from `backend/`, Vite errors from `src/`),
   check `git status --short backend src data` for recent edits and `tap26/memory/changes.md` for the
   last ledger entries. Return the root cause with file:line evidence and the smallest fix. Do not
   edit app code; propose the patch." Run step 1 and 2 sequentially (2 needs 1's findings).
3. **Classify findings** yourself into: `blocker` (cannot run app/tests), `degraded` (some projects
   fail, e.g. no Chromium → UI tests only), `cosmetic` (warnings). Order fixes by dependency
   (Node → Yarn → deps → browsers → ports → DB → app code).
4. **Apply safe fixes only with consent.** Safe = installs (`/tap-setup`), starting the app (`/tap-run`),
   re-seeding (`yarn db:seed:dev`, wipes data — say so). Unsafe (killing foreign processes, editing
   `backend/`/`src/`, deleting files) → describe, do not do. Re-run `node tap26/scripts/doctor.mjs`
   after any fix.

## Quality gates
- Every FAIL/WARN has: evidence (command + output excerpt) → cause → fix command.
- If `$ARGUMENTS` named a symptom, the report states "confirmed" or "ruled out" with evidence.
- After fixes: doctor re-run shows no blockers, or the remaining ones are explicitly handed to the student.
- No app source changed by this skill (debugger proposes, `be-dev`/`fe-dev` would apply via `/tap-debug`).

## Output
Show the student:
```
Doctor — <date>   PASS n · WARN n · FAIL n
Blockers
  1. <finding> — because <cause> — fix: <command>
Degraded / Cosmetic
  …
Root cause (debugger): <one paragraph, file:line>   (only if app unhealthy)
Next: <one command, e.g. /tap-setup or /tap-run>
```
Include both hand-offs condensed to Status + Verification. Reports stay in the chat; if the student
asks for a file, write `tap26/reports/doctor/doctor-<YYYYMMDD-HHmm>-<slug>.md` (D-007).

## Memory
- Stable, verified environment facts (not transient states like "port down right now"):
  `node tap26/scripts/memory.mjs add-fact env "<fact>" --by env-ops`
- A non-obvious root cause → learning:
  `node tap26/scripts/memory.mjs add-learning "<title>" --what "<symptom>" --lesson "<fix>" --tags doctor,env --applies env-ops,debugger,tap-doctor --by debugger`
- Unresolved mystery → `node tap26/scripts/memory.mjs add-question "<question>" --by env-ops`
- Finish with `node tap26/scripts/memory.mjs digest`.

## Learn more
- `tap26/docs/13-troubleshooting.md`, `tap26/docs/14-faq.md`, `tap26/docs/01-getting-started-vscode.md`
- Labs: `tap26/labs/lab-01` (setup), `lab-02` (run), `lab-13` (debugging)
