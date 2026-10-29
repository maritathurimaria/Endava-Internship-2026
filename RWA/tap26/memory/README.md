# TAP26 shared memory

Long-lived memory shared by every agent and every student session. Plain Markdown, committed to git,
so you can read, diff and review what the agents "know".

| File | What it holds | Who writes |
|---|---|---|
| `MEMORY.md` | Digest (≤ ~120 lines) — imported by `CLAUDE.md`, so every session starts with it | `memory.mjs digest` (knowledge-curator, orchestrator) |
| `facts.md` | Stable, verified facts (ports, commands, users, behaviours) | any agent, via `memory.mjs add-fact` |
| `decisions.md` | ADR-lite decisions `D-###` | orchestrator, leads, via `memory.mjs add-decision` |
| `learnings.md` | Lessons learned `L-###` (what happened → lesson → applies to) | any agent / retros, via `memory.mjs add-learning` |
| `changes.md` | Change ledger of application edits | the `change-ledger` hook (automatic) + `memory.mjs log-change` |
| `open-questions.md` | Questions nobody could answer yet `Q-###` | any agent, via `memory.mjs add-question` / `answer` |
| `glossary.md` | Domain, testing and agentic terms | doc-writer, business-analyst |
| `journal/YYYY-MM-DD.md` | One-line session trail (prompts, agents finished, guardrail decisions) | hooks (automatic; disable with `TAP26_JOURNAL=0`) |
| `.state/` | Hook state & usage counters (gitignored) | hooks |

Per-agent private notes live in `.claude/agent-memory/<agent>/` (Claude Code `memory: project`).
General lessons found there should be promoted to `learnings.md` by the knowledge-curator.

Rules: append through `node tap26/scripts/memory.mjs …`; never delete someone else's entry — mark it
`(superseded by D-###)` instead; keep entries short and verifiable; no secrets or personal data.
