# Change ledger

Application edits, appended automatically by the `change-ledger` hook and by `memory.mjs log-change`.
Format: `- YYYY-MM-DD HH:MM | file | tool (area) | agent`. Consumed by `/tap-sync-tests` and `impact.mjs`.

- 2026-10-20 15:24 | src/machines/createTransactionMachine.ts | Wait for POST /transactions before completion; return to the form on failure | fe-dev
- 2026-10-20 15:24 | src/components/TransactionCreateStepTwo.tsx | Show generic accessible error on failed transaction submission | fe-dev
- 2026-10-20 15:24 | src/containers/TransactionCreateContainer.tsx | Show success snackbar only after successful transaction completion | fe-dev
