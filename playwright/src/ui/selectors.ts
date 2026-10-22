import type { Locator, Page } from "@playwright/test";

/**
 * Selector helpers built on the app's `data-test` attributes,
 * equivalent to the Cypress `getBySel` / `getBySelLike` commands.
 */

export type Scope = Page | Locator;

/** Exact `data-test` match. */
export const bySel = (scope: Scope, id: string): Locator => scope.locator(`[data-test="${id}"]`);

/** Partial `data-test` match, e.g. `transaction-item` matches `transaction-item-<id>`. */
export const bySelLike = (scope: Scope, fragment: string): Locator => scope.locator(`[data-test*="${fragment}"]`);

/**
 * The `<input>` of a MUI text field. Some fields put `data-test` on the wrapper,
 * others on the input itself (via `inputProps`); this resolves either case.
 */
export const textbox = (scope: Scope, fragment: string): Locator =>
  bySelLike(scope, fragment)
    .locator("input")
    .or(scope.locator(`input[data-test*="${fragment}"]`))
    .first();

/** MUI helper text rendered under a field, by the field's input id. */
export const helperText = (page: Page, inputId: string): Locator => page.locator(`#${inputId}-helper-text`);
