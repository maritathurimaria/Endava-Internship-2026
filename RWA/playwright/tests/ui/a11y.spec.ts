import { test, expect } from "@fixtures/ui";
import type { Locator, Page } from "@playwright/test";
import { bySel, loginByXstate, newViolations, openSignUp, scanA11y, waitForListLoaded } from "@ui";

/**
 * Accessibility smoke (axe-core, WCAG 2.x A/AA rules) over the main screens.
 * Full axe results are attached to each test as `axe-<screen>.json` (open them in the HTML report).
 * A test fails only on NEW critical violations: rule ids already present in the app are listed
 * in KNOWN_CRITICAL below as a baseline.
 */

// Known critical violations, baseline of 2026-10-16 (desktop + mobile). Remove an id once the app is
// fixed so the rule guards the fix.
const KNOWN_CRITICAL: readonly string[] = [
  // known issue — see tap26/knowledge/known-issues.md
  // Home feed: the react-virtualized list renders role="grid" > role="rowgroup" without role="row" children.
  "aria-required-children",
];

interface Screen {
  readonly name: string;
  /** Log in as users[0] first. */
  readonly auth: boolean;
  readonly open: (page: Page) => Promise<unknown>;
  /** Visible once the screen has rendered its main content. */
  readonly ready: (page: Page) => Locator;
}

const screens: ReadonlyArray<Screen> = [
  { name: "sign-in", auth: false, open: (page) => page.goto("/signin"), ready: (page) => bySel(page, "signin-submit") },
  {
    name: "sign-up",
    auth: false,
    open: async (page) => {
      await page.goto("/signin");
      await openSignUp(page);
    },
    ready: (page) => bySel(page, "signup-title"),
  },
  { name: "home feed", auth: true, open: (page) => page.goto("/"), ready: (page) => bySel(page, "transaction-list") },
  {
    name: "new transaction",
    auth: true,
    open: (page) => page.goto("/transaction/new"),
    ready: (page) => bySel(page, "users-list"),
  },
  {
    name: "bank accounts",
    auth: true,
    open: (page) => page.goto("/bankaccounts"),
    ready: (page) => bySel(page, "bankaccount-list"),
  },
  {
    name: "notifications",
    auth: true,
    open: (page) => page.goto("/notifications"),
    ready: (page) => bySel(page, "notifications-list"),
  },
  {
    name: "user settings",
    auth: true,
    open: (page) => page.goto("/user/settings"),
    ready: (page) => bySel(page, "user-settings-form"),
  },
];

test.describe("Accessibility @a11y", () => {
  for (const screen of screens) {
    test(`${screen.name} has no new critical axe violations @a11y`, async ({ page, users }, testInfo) => {
      if (screen.auth) await loginByXstate(page, users[0].username);
      await screen.open(page);
      await expect(screen.ready(page)).toBeVisible();
      await waitForListLoaded(page);

      const results = await scanA11y(page, testInfo, screen.name.replace(/\s+/g, "-"));

      const fresh = newViolations(results, "critical", KNOWN_CRITICAL);
      expect(fresh, `New critical a11y violations on ${screen.name}:\n${fresh.join("\n")}`).toEqual([]);
    });
  }
});
