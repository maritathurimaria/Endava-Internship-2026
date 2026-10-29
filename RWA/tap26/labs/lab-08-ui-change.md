# Lab 08 — Change the UI: a 140-character note with a live counter

**Level:** ★★☆ · **Time:** 60–90 min · **Tracks:** Developer, Full
**Skills/agents practised:** `/tap-change-ui`, `/tap-ask ux`, `/tap-run-tests`, `/tap-review` · `ux-designer`, `fe-dev`, `test-impact-analyst`, `ui-automation`, `doc-writer`, `code-reviewer`

## Learning objectives

1. Run the UI change pipeline and steer it with a precise UX spec.
2. Add a new `data-test` selector without breaking the existing selector contract.
3. Verify a UI change on desktop **and** mobile, including a boundary test (140 vs 141 characters).
4. Notice where a UI-only rule leaves a gap (the API does not enforce it).

## Prerequisites

- [Lab 06](lab-06-first-ui-test.md). [Lab 07](lab-07-api-change.md) recommended (same pipeline idea).
- App running.

## Background

**The change request:** *On step 2 of the New Transaction flow, the note ("Add a note") may be at most
140 characters. Show a live counter `n/140` under the field. Above 140 the field shows an error and
Pay/Request are disabled.*

Relevant code: `src/components/TransactionCreateStepTwo.tsx` — a Formik form with a Yup
`validationSchema` (`description: string().required("Please enter a note")`), an MUI `TextField`
with `data-test="transaction-create-description-input"`, and buttons
`transaction-create-submit-payment` / `-request` that are disabled while the form is invalid.
The existing test *"displays new transaction errors"* reads the field's **helper text**
(`#transaction-create-description-input-helper-text`).

## Steps

### 0. Branch

```bash
git switch -c lab/08-ui-change
```

### 1. Get a UX spec first (optional but recommended)

```
/tap-ask ux propose the exact copy, placement and states (normal, at limit, over limit, mobile 375px) for a 140-character counter on the New Transaction note field. Keep the existing "Please enter a note" error.
```

### 2. Run the pipeline

```
/tap-change-ui on the New Transaction step 2 form (src/components/TransactionCreateStepTwo.tsx) limit the note/description to 140 characters: Yup max(140) with message "Note must be 140 characters or less", a live counter "n/140" under the field with data-test="transaction-create-description-counter" (separate from the error helper text), Pay/Request disabled when over the limit. Keep all existing data-test attributes. Test on desktop and mobile.
```

**Observe:** the `test-impact-analyst` hand-off should name *"displays new transaction errors"* in
`playwright/tests/ui/new-transaction.spec.ts` as impacted (it reads the helper text you are changing).

### 3. Try it yourself

Log in as `Heath93`/`s3cret`, click **New**, pick a contact, type an amount, then paste 141 characters
into the note. Check the counter, the error and the disabled buttons. Resize the window below 600 px
(MUI `xs`), where the app switches to its mobile layout. The tests' `isMobile()` treats < 414 px as mobile
and the `ui-mobile` project uses 375 px, so try 375 px too.

### 4. Check the boundary tests

Open the new/changed tests. You should see at least:

- exactly 140 characters → counter `140/140`, buttons enabled;
- 141 characters → error text, buttons disabled;
- the counter starts at `0/140`.

If a boundary is missing:

```
/tap-new-test ui in playwright/tests/ui/new-transaction.spec.ts add a boundary test for the note field — 140 chars allowed, 141 shows "Note must be 140 characters or less" and disables both submit buttons. Use the new transaction-create-description-counter selector.
```

### 5. Find the gap

```
/tap-ask security the UI now limits notes to 140 chars. Can a client still create a transaction with a 500-character description? Prove it with the existing API helpers, read-only reasoning first.
```

### 6. Review

```
/tap-review
```

## ✅ Checkpoints

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | New selector in source | `node -e "console.log(require('fs').readFileSync('src/components/TransactionCreateStepTwo.tsx','utf8').includes('transaction-create-description-counter'))"` | `true` |
| 2 | Old selectors kept | `git diff tap26-base -U0 -- src \| grep "^-.*data-test"` | no output (no removed `data-test` lines) |
| 3 | Types | `yarn types` | exit 0 |
| 4 | Desktop | in `playwright/`: `npx playwright test tests/ui/new-transaction.spec.ts --project=ui-desktop --repeat-each=2` | `0 failed` |
| 5 | Mobile | same with `--project=ui-mobile` | `0 failed` |
| 6 | Boundary test exists | `node -e "console.log(/141|repeat\(141\)/.test(require('fs').readFileSync('playwright/tests/ui/new-transaction.spec.ts','utf8')))"` | `true` |
| 7 | Ledger | `node tap26/scripts/memory.mjs search TransactionCreateStepTwo` | an entry in `changes.md` |

> PowerShell instead of Git Bash? Checkpoint 2 becomes
> `git diff tap26-base -U0 -- src | Select-String '^-.*data-test'`.

## Stretch goals

- Enforce the same rule in the API (`body("description").isLength({ max: 140 })` in
  `isTransactionPayloadValidator`) with `/tap-change-api`. Which tests and which OpenAPI schema change?
- Ask `a11y-auditor` whether the counter is announced to screen readers (`aria-live`, `aria-describedby`).
- Compare the counter on `ui-mobile` with a screenshot assertion (`expect(page).toHaveScreenshot()`).

## Reflection questions

1. Did you give the UX spec to `fe-dev`, or did `fe-dev` invent the details? Which result was better?
2. The XState helper `createTransactionViaApp` bypasses the form. Which tests therefore *cannot* catch
   a broken counter? What does that teach you about fast programmatic helpers?
3. Which hand-off told you the change was safe for the selector contract, and how did it know?
4. How would you prompt if you wanted the agent to change *only* the component and stop before tests?

## Reset

```bash
git restore data/database.json
git add -A && git commit -m "lab 08: 140-char note with counter"
git switch tap26-base
```

Vite hot-reloads `src/` after the switch; refresh the browser.

## Instructor notes

- Minimal solution: `description: string().max(140, "Note must be 140 characters or less").required("Please enter a note")`
  and a `<Typography variant="caption" data-test="transaction-create-description-counter">{value.length}/140</Typography>`
  (or a `FormHelperText`) rendered *outside* the `helperText` prop so the existing error test still finds
  only the error text.
- **Selector naming trap:** a counter named `transaction-create-description-input-counter` would also match
  `bySelLike(page, "description-input")` used by the `textbox()` helper. The name in the prompt avoids that.
- If `inputProps={{ maxLength: 140 }}` is added, typing stops at 140 and the 141 error can never show —
  discuss which UX is better; tests must match the chosen behaviour.
- The API has no length rule (`body("description").isString()`), so the rule is UI-only — step 5 should
  surface that; it's a good bridge to Lab 07's pipeline.
