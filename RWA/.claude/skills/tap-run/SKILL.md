---
name: tap-run
description: "Start the Real World App (yarn dev: UI on :3000, API on :3001) in the background, wait until both are healthy, and optionally start the Swagger UI server (:3100) and the mock API server (:3101). Prints the URLs and a seeded login. Use when a student says 'start the app', 'run the app', 'open swagger', 'start the mock server', or before running tests when the doctor shows ports 3000/3001 down."
argument-hint: "[app|swagger|mock|all]  (default: app)"
allowed-tools: Bash(node tap26/scripts/*), Bash(tail *), Bash(curl -s http://localhost:*)
---

# /tap-run — start the app (and friends)

## Goal
Have the app running and verified healthy, with the student knowing exactly where everything is and
how to log in — without starting duplicate servers on ports that are already in use.

## Inputs
The **target** is the first word of `$ARGUMENTS` (the whole input text); ignore any further words:
- empty or `app` — UI + API only (`yarn dev`).
- `swagger` — app + Swagger UI (`node tap26/scripts/swagger-server.mjs`, :3100).
- `mock` — app + spec-driven mock API (`node tap26/scripts/mock-server.mjs`, :3101).
- `all` — app + swagger + mock.

Quick health snapshot at invocation (read-only; empty if the doctor script is unavailable):
!`node tap26/scripts/doctor.mjs --quick 2>&1 | tail -15 || true`

## Steps
Delegate steps 1–4 to the `env-ops` agent with this brief:

1. **Pre-check.** Run `node tap26/scripts/doctor.mjs --quick`. If root `node_modules` is missing,
   stop and tell the student to run `/tap-setup` first.
2. **Start the app only if :3000 and :3001 are down.**
   - If both are up: do NOT start another copy (port clash) — just verify health in step 3.
   - If exactly one is up: a half-dead previous run is holding it; find the PID with
     `lsof -i :3001` (macOS/Linux) or `netstat -ano | findstr :3001` (Windows), report it and ask
     the student before stopping anything.
   - Otherwise start `yarn dev` from the repo root as a **background** Bash process
     (`run_in_background: true`). `predev` copies the seed into `data/database.json` first, so the DB
     starts fresh. Alternative for the student: VS Code → *Terminal → Run Task… → "TAP: Start app"*
     (defined in `.vscode/tasks.json`), which keeps the logs in a dedicated terminal.
3. **Wait for health** (timeout 120 s, cross-platform, `wait-on` is a root devDependency):
   `npx wait-on --timeout 120000 http-get://localhost:3000 http-get://localhost:3001/testData/users`
   On timeout: read the background process output, report the first error line, and hand over to
   `/tap-debug "app does not start"` (do not guess).
4. **Optional servers** per the target — start each as a separate background process only if its port is down:
   - swagger: `node tap26/scripts/swagger-server.mjs` → wait `http-get://localhost:3100`
   - mock: `node tap26/scripts/mock-server.mjs` → wait `http-get://localhost:3101`
5. **Seeded login** (yourself): fetch the first seeded username, read-only:
   `node -e "fetch('http://localhost:3001/testData/users').then(r=>r.json()).then(j=>console.log(j.results[0].username))"`
   Password for every seeded user is `s3cret` (`SEED_DEFAULT_USER_PASSWORD` in `.env`).

## Quality gates
- Gate 1 (app starts): `http://localhost:3000` and `http://localhost:3001/testData/users` both return 200.
- Each optional server requested by the target answers on its port.
- No duplicate processes were started on a port that was already serving.
- Nothing under `backend/`, `src/`, `cypress/` or `data/` was edited (the `predev` seed copy is expected).

## Output
Show the student:
```
App running
  UI        http://localhost:3000        login: <username> / s3cret
  API       http://localhost:3001        e.g. http://localhost:3001/testData/users
  Swagger   http://localhost:3100        (if started)  — POST /login first in Try it out
  Mock API  http://localhost:3101        (if started)  — scenarios via x-mock-scenario header
How to stop: close the "TAP: Start app" terminal, or ask me to stop the background task.
Reset data any time: POST http://localhost:3001/testData/seed  (wipes manual changes)
```
Then suggest the next step: `/tap-run-tests api` or lab-03 (explore the app).
Include the `env-ops` hand-off (Status / Verification lines only).

## Memory
- Only when something new was learned (e.g. port 3000 taken by another tool on this machine):
  `node tap26/scripts/memory.mjs add-fact env "<fact>" --by env-ops`
- Journal: `node tap26/scripts/memory.mjs journal "tap-run <target>: app healthy" --by env-ops`

## Learn more
- `tap26/docs/01-getting-started-vscode.md`, `tap26/docs/02-architecture.md`
- `tap26/docs/08-api-contract-and-swagger.md`, `tap26/docs/09-mocks-and-stubs.md`, `tap26/docs/13-troubleshooting.md`
- Labs: `tap26/labs/lab-02` (run the app), `lab-10` (swagger), `lab-11` (mocks)
