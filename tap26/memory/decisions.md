# Decisions (ADR-lite)

Format: `## D-### Title` · Context · Decision · Consequences · Date · By. Supersede, never delete.

## D-001 Functional Playwright framework instead of page objects
- Context: The course teaches modern TypeScript testing; the Cypress suite relies on custom commands and mutable `ctx` objects.
- Decision: Plain functions taking `page`/`http` as first argument, frozen API results, Playwright fixtures for setup; no classes or page objects.
- Consequences: Helpers compose freely and are easy to test; contributors must follow the conventions in playwright/README.md.
- Date: 2026-10-16 · By: tap26-setup

## D-002 Tests run serially against one shared database
- Context: The app uses a single lowdb JSON file; every test re-seeds it.
- Decision: `workers: 1`, `fullyParallel: false`; reseed before each test.
- Consequences: Deterministic but slower runs (~10 min for all projects); parallelism would need one app instance per worker.
- Date: 2026-10-16 · By: tap26-setup

## D-003 TAP26 orchestration model
- Context: Students use the Claude Code VS Code extension, where running the main thread as a named agent is not documented.
- Decision: The main chat follows the orchestrator protocol in CLAUDE.md and delegates to specialists; the `tap-orchestrator` subagent handles multi-step requests; only orchestrator, qa-lead and e2e-architect may delegate further (depth ≤ 3).
- Consequences: Works identically in the panel and the CLI (`claude --agent tap-orchestrator` is optional).
- Date: 2026-10-16 · By: tap26-setup

## D-004 Node-only, zero-dependency tooling for scripts and hooks
- Context: Students use Windows, macOS and Linux; hooks run through Git Bash on Windows.
- Decision: All TAP26 scripts and hooks are dependency-free Node ESM (.mjs); Swagger UI assets load from a pinned CDN.
- Consequences: No extra installs beyond Node; Swagger UI needs internet access for its assets.
- Date: 2026-10-16 · By: tap26-setup

## D-005 Known API defects in tests
- Context: Some tests would fail because the app has verified defects (tap26/knowledge/known-issues.md). L-006 said 'document actual behaviour'; skills used test.fail().
- Decision: OpenAPI documents ACTUAL behaviour. Tests assert the CORRECT behaviour and are marked test.fail(true, 'KI-xx: <summary>') (new defects: 'BUG-###'), so the suite stays green and the test flips to an unexpected pass when the defect is fixed — then remove test.fail and update the KI row.
- Consequences: One rule for all agents; fixing a KI is visible in test output.
- Date: 2026-10-16 · By: tap-orchestrator

## D-006 End-to-end journeys location
- Context: Agent and skill disagreed (tests/ui/journeys vs tests/e2e).
- Decision: Journeys live in playwright/tests/e2e/*.e2e.spec.ts and run in a dedicated 'e2e' Playwright project (desktop viewport); tag with { tag: ['@e2e'] } and one test.step per journey step.
- Consequences: n/a
- Date: 2026-10-16 · By: tap-orchestrator

## D-007 Report locations
- Context: Agents/skills used mixed report paths.
- Decision: All generated reports go to tap26/reports/<type>/ (impact, bugs, manual, reviews, research, a11y, security, perf, test-plans, ux, ba, debug, data, doctor, e2e, retros). File names: <type>-<YYYYMMDD-HHmm>-<slug>.md or BUG-###-<slug>.md.
- Consequences: n/a
- Date: 2026-10-16 · By: tap-orchestrator
