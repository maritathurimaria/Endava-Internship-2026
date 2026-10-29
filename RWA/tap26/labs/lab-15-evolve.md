# Lab 15 — Evolve the framework itself

**Level:** ★★★ · **Time:** 90 min · **Tracks:** Developer, Full (Tester track: optional capstone)
**Skills/agents practised:** `/tap-retro`, `/tap-evolve propose|review|apply`, `/tap-status` · `knowledge-curator`, `code-reviewer`, `doc-writer`

## Learning objectives

1. Turn evidence from your own sessions (learnings, retros, journal) into a written **evolution proposal**.
2. Run the controlled change loop: propose → review → explicit approval → apply → verify → CHANGELOG.
3. Build a new skill (or harden a hook) that follows the BLUEPRINT format, and prove it works.
4. Reason about guardrails: which changes *tighten* safety and which would *loosen* it.

## Prerequisites

- At least five earlier labs, ideally including [Lab 13](lab-13-debugging.md) (it produced learnings).

## Background

TAP26 is meant to get better with use. Its self-evolution loop is deliberately boring and auditable:

- `knowledge-curator` writes proposals `tap26/evolution/proposals/EP-###-<slug>.md` from
  `tap26/templates/evolution-proposal.md`, grounded in learnings (`L-###`), retros and metrics;
- nothing is applied without an explicit **"yes"** from you in the chat; loosening a guardrail needs a
  **separate** yes;
- applied changes bump the version (semver) everywhere it is recorded: `tap26/evolution/CHANGELOG.md`,
  `tap26/README.md`, `tap26/package.json` and `TAP26_VERSION` in `.claude/settings.json` (a protected
  file, so you get an approval prompt). They also add a decision to memory, and the framework check
  `node tap26/scripts/check-framework.mjs --strict` must pass afterwards;
- `/tap-retro` adds a row to `tap26/evolution/metrics.md` from the usage counters in
  `tap26/memory/.state/usage.json`, which is the evidence for the next proposal.

You'll do **one** of two evolutions (pick A or B; strong students do both):

- **A — new skill `/tap-smoke`:** a 2-minute confidence check — `doctor.mjs --quick`, then a handful of
  fast tests (API login, sign-in page, one payment) — that prints a one-screen verdict. Minor version bump.
- **B — harden a hook:** `.claude/hooks/guard-bash.mjs` already asks before `git branch -D` and
  `git stash drop`, but not before `git commit --no-verify` (`-n`), which silently skips the repo's
  git hooks (husky's pre-commit lint). Add an **ask** rule with a teaching reason. Tightens guardrails;
  patch or minor bump.

## Steps

### 0. Branch

```bash
git switch -c lab/15-evolve
```

### 1. Gather evidence

```
/tap-retro today
```

```
/tap-status full
```

**Observe:** which learnings and recurring frictions does the curator surface? Does any of them support A or B?

### 2. Propose

Option A:

```
/tap-evolve propose add a /tap-smoke skill: runs node tap26/scripts/doctor.mjs --quick, then a small fast subset of Playwright tests (tagged @smoke or listed explicitly: API login, sign-in page renders, one payment via API), finishes in under 2 minutes and prints a one-screen PASS/FAIL verdict with next steps. Must follow the BLUEPRINT skill format (Goal, Inputs, Steps, Quality gates, Output, Memory, Learn more).
```

Option B:

```
/tap-evolve propose add an "ask" rule to .claude/hooks/guard-bash.mjs for "git commit --no-verify" / "git commit -n", with a teaching reason (it skips the repo's pre-commit checks), plus a self-test command in the proposal's test plan
```

Open the new `tap26/evolution/proposals/EP-###-*.md`. Check: problem, evidence (L-ids), exact files,
guardrail impact, test plan, semver impact.

### 3. Review

```
/tap-evolve review
```

Agree or disagree with the recommendation in chat. If it says *revise*, ask for the revision before continuing.

### 4. Apply — with explicit approval

```
/tap-evolve apply EP-###
```

The skill shows the plan and asks **"Apply EP-### now? (yes / no)"**. Read the file list, then answer:

```
yes
```

**Observe** the post-apply verification: `check-framework.mjs --strict` passes (frontmatter, references,
counts), the doctor still passes, the version is bumped in CHANGELOG, `tap26/README.md`, `tap26/package.json`
and `.claude/settings.json` (expect an approval prompt for that protected file), a decision is in memory,
and there is a *suggested* commit message (it does not commit).

### 5. Prove it works

Option A — run your new skill (if `/tap-smoke` is not in the `/` menu yet, start a new conversation or
run *Developer: Reload Window*):

```
/tap-smoke
```

Option B — feed the hook a fake tool call (this is exactly what Claude Code sends it):

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git commit --no-verify -m wip"}}' | node .claude/hooks/guard-bash.mjs
```

**Expected:** a JSON line with `"permissionDecision":"ask"` and your reason. Also confirm a harmless
command is still allowed (no output):

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git commit -m wip"}}' | node .claude/hooks/guard-bash.mjs
```

### 6. Independent review and docs

```
/tap-review
```

```
Use the doc-writer agent to make sure tap26/docs/04-skills.md (option A) or tap26/docs/10-hooks-and-guardrails.md (option B) describes the change.
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Proposal exists | `node -e "console.log(require('fs').readdirSync('tap26/evolution/proposals').filter(f=>/^EP-\d{3}-/.test(f)))"` | your `EP-###-….md` |
| 2 | Status applied | open the proposal | `Status: applied` with today's date |
| 3 | CHANGELOG bumped | `node -e "const t=require('fs').readFileSync('tap26/evolution/CHANGELOG.md','utf8');console.log(t.match(/^## \d+\.\d+\.\d+.*$/m)[0])"` | a version **above** `1.0.0` mentioning your EP |
| 4A | Skill well-formed | `node -e "const t=require('fs').readFileSync('.claude/skills/tap-smoke/SKILL.md','utf8');console.log(/^---[\s\S]*?\bname: tap-smoke\s/.test(t),['## Goal','## Steps','## Quality gates','## Output'].every(h=>t.includes(h)))"` | `true true` |
| 5A | Skill runs | `/tap-smoke` | PASS/FAIL verdict in under ~2 minutes |
| 4B | Hook asks | step 5 first command | output contains `"permissionDecision":"ask"` |
| 5B | No false positives | step 5 second command | no output |
| 6 | Doctor still green | `node tap26/scripts/doctor.mjs --quick` | exit 0 (app running) |
| 6b | Framework consistent | `node tap26/scripts/check-framework.mjs --strict` (task **TAP: Framework check**) | 0 errors, 0 warnings |
| 7 | Decision recorded | `node tap26/scripts/memory.mjs search EP-` | a `D-###` "Apply EP-###…" entry |

## Stretch goals

- Do the other option too, as a second proposal. Does the curator notice the two proposals interact
  (e.g. `/tap-smoke` should never commit, with or without `--no-verify`)?
- Propose a **doc-lint** script from Lab 14's one-liners (`tap26/scripts/doc-lint.mjs`) and wire it into
  `/tap-docs` as a quality gate.
- Try to sneak a guardrail loosening into a proposal (e.g. auto-allow `git push`). Does `/tap-evolve apply`
  ask the separate explicit question? Answer **no**.

## Reflection questions

1. What evidence made your proposal convincing — or what was missing? Would a teammate accept it?
2. Why must the agent stop and wait for your "yes"? What could go wrong if a framework could rewrite
   its own guardrails unattended?
3. Which part of the change would you *not* trust an agent to write without review (hook regex, skill
   steps, docs)? Why?
4. How would you measure, a month from now, whether this evolution was worth it? (Look at `metrics.md`.)

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 15: EP-### <title>"     # use the suggested message
git switch tap26-base
```

To adopt the evolution for everyone, open a PR from `lab/15-evolve` — framework changes are reviewed
like code.

## Instructor notes

- Option B rule sketch (add before the generic rules):
  `[/\bgit\s+commit\b.*\s(--no-verify|-[a-zA-Z]*n[a-zA-Z]*)(\s|$)/, "ask", "--no-verify skips the repo's git hooks (lint, formatting). Fix what the hook reports instead of bypassing it."]`.
  Test `--no-verify`, `-n` and a combined flag like `-nm` (ask), and a normal `git commit -m "…"` (allowed). A message
  containing ` -n ` inside quotes is a known false positive. Good discussion of regex limits.
- After applying, the curator must run `node tap26/scripts/check-framework.mjs --strict` (task **TAP: Framework check**).
- Option A: the skill should *reuse* `/tap-run-tests` conventions and existing tests (`--grep` on titles
  such as "logs in as a user" in `users.api.spec.ts`) rather than duplicate specs; adding `@smoke` tags
  touches several spec files — a fair discussion point about blast radius.
- New skills are picked up from `.claude/skills/` automatically; if not, a new conversation or window
  reload fixes it.
- If the curator edits `.claude/settings.json` for option A (e.g. new permission allow rules), that is
  a **loosening** — it must have asked separately. Check the transcript with the student.
- Semver: new skill = minor (1.1.0); a tightened guard with no new behaviour can be patch (1.0.1) —
  accept either with a sensible justification.
