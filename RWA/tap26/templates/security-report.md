<!--
  Security assessment report — used by /tap-security (security-tester). LOCAL ONLY.
  Save as tap26/reports/security/security-<YYYYMMDD-HHmm>-<scope>.md (D-007).
  Every "vulnerable" claim needs a request/response proof. Severity: critical / high / medium / low / info.
-->
# Security assessment — {{scope}} ({{YYYY-MM-DD}})

| Field | Value |
|---|---|
| Scope | {{auth / idor / validation / headers / graphql / deps / all / endpoint}} |
| Build | `{{git sha}}` |
| Accounts used | {{user A (owner), user B (attacker) — seeded}} |
| Known issues re-verified | {{KI-## list from tap26/knowledge/known-issues.md}} |

## Rules of engagement (confirmed)
- Hosts: only http://localhost:3000 and http://localhost:3001 — {{confirmed}}
- Requests sent: {{n}} (limit 1 000; no fuzz loop > 50; ≤ 5 login attempts per user)
- No DoS, no third-party targets, no real credentials, no app code modified
- Database reseeded after state-changing probes: {{yes/no}}

## Summary
| Severity | Count |
|---|---|
| Critical | {{n}} |
| High | {{n}} |
| Medium | {{n}} |
| Low / Info | {{n}} |

{{2–3 sentences: biggest risk in plain language.}}

## Findings
### SEC-{{##}} [{{severity}}] {{title}}
- OWASP: {{A01:2021 Broken Access Control …}} · CWE: {{CWE-639 …}} · Known issue: {{KI-## / new}}
- Endpoint / location: `{{METHOD /path}}` · root cause `{{backend/file.ts:line}}`
- Reproduction:
```bash
{{curl or node fetch commands, cookies redacted}}
```
- Evidence: {{status + trimmed body}}
- Impact: {{what an attacker could do in this app}}
- Fix: {{recommendation}} · Regression test idea: {{playwright/tests/api/… assertion}}

## Verified safe
| Check | Result |
|---|---|
| {{e.g. GET /bankAccounts lists only own accounts}} | {{not vulnerable — evidence}} |

## Static observations
- Session secret / cookie flags: {{…}} · Security headers: {{…}} · CORS: {{…}} · Error verbosity: {{…}}

## Dependency audit
- Root: `yarn audit --groups dependencies` → {{counts by severity}} · Playwright: `npm --prefix playwright audit` → {{counts}}

## Recommendations (priority order)
1. {{…}}
