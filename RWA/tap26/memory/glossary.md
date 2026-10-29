# Glossary

## Domain (Real World App)
| Term | Meaning |
|---|---|
| Payment | Sender pays receiver; completes immediately and moves balance (cents). |
| Request | Sender asks receiver for money; pending until the receiver accepts or rejects it. |
| Contact | A user in your friends list; drives the "Friends" feed. |
| Feed | Transaction list: Everyone (public), Friends (contacts), Mine (personal). |
| Privacy level | public · contacts · private — who can see a transaction in feeds. |
| Bank account | Funding source; soft-deleted (`isDeleted`) rather than removed. |
| Notification | Payment / like / comment event shown to a user; can be marked read. |
| Seed | The reference dataset loaded by `POST /testData/seed`. |

## Testing
| Term | Meaning |
|---|---|
| Fixture | Playwright setup/teardown function that provides a value to tests (e.g. `db`, `users`). |
| Stub / mock | A fake response or service used instead of the real one (`stubApi`, mock server). |
| Contract test | Checks the API's responses match the OpenAPI schema. |
| Test impact analysis | Working out which tests a code change can affect. |
| Flaky test | A test that passes and fails without code changes. |
| Data-test selector | `[data-test="…"]` attribute used as a stable UI hook for tests. |

## Agentic development
| Term | Meaning |
|---|---|
| Agent / subagent | A Claude instance with its own system prompt, tools and context window (`.claude/agents/*.md`). |
| Orchestrator | The agent that plans, delegates and verifies instead of doing all the work itself. |
| Skill | A reusable playbook invoked as a slash command (`.claude/skills/*/SKILL.md`). |
| Hook | A script Claude Code runs on an event (session start, before/after a tool) — guardrails & automation. |
| Context window | The working memory of one agent; delegation keeps each one focused and small. |
| Shared memory | Files every agent reads/writes (`tap26/memory`) so knowledge survives sessions. |
| Hand-off report | The structured summary an agent returns when it finishes delegated work. |
| Least privilege | Each agent gets only the tools it needs. |
