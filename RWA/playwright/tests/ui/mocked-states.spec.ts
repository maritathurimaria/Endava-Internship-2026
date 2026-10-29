import { test, expect } from "@fixtures/ui";
import { bySel, feedMatcher, loginByXstate, transactionItems, waitForApi, waitForListLoaded } from "@ui";
import {
  buildBankAccount,
  buildList,
  buildNotification,
  listBankAccountsMatcher,
  notificationsMatcher,
  stubBankAccounts,
  stubEmptyFeed,
  stubLatency,
  stubNotifications,
  stubServerError,
  withScenario,
  type NotificationKind,
} from "@mocks";

/**
 * UI states the seeded API cannot easily produce, driven by route stubs and factories (src/mocks).
 * Stubs are registered BEFORE the login/navigation that fires the request. Auth stays real.
 */

const emptyHeader = (page: Parameters<typeof bySel>[0]) => bySel(page, "empty-list-header");

test.describe("Mocked UI states", () => {
  test.describe("notifications", () => {
    test("shows the empty state when there are no notifications", async ({ page, users }) => {
      await stubNotifications(page, []);
      await loginByXstate(page, users[0].username);

      const listed = waitForApi(page, notificationsMatcher);
      await page.goto("/notifications");
      expect(await (await listed).json()).toEqual({ results: [] });

      await expect(emptyHeader(page)).toContainText("No Notifications");
      await expect(bySel(page, "notifications-list")).toHaveCount(0);
    });

    test("renders factory-built notifications with their counts and names", async ({ page, users }) => {
      const variants: ReadonlyArray<[NotificationKind, string, string]> = [
        ["like", "Ada Lovelace", "liked a transaction."],
        ["comment", "Grace Hopper", "commented on a transaction."],
        ["requested", "Alan Turing", "requested payment."],
        ["received", "Edsger Dijkstra", "received payment."],
      ];
      const items = variants.map(([kind, userFullName], i) =>
        buildNotification({ kind, userFullName, userId: users[0].id }, i + 1),
      );
      await stubNotifications(page, items);

      await loginByXstate(page, users[0].username);
      await expect(bySel(page, "nav-top-notifications-count")).toHaveText(String(items.length));

      await page.goto("/notifications");
      await expect(bySel(page, "notifications-list").locator('[data-test^="notification-list-item-"]')).toHaveCount(
        items.length,
      );
      for (const [i, [, name, action]] of variants.entries()) {
        await expect(bySel(page, `notification-list-item-${items[i].id}`)).toContainText(`${name} ${action}`);
      }
    });
  });

  test.describe("transaction feeds", () => {
    test('shows "No Transactions" for an empty public feed', async ({ page, users }) => {
      await stubEmptyFeed(page, "public");
      const feed = waitForApi(page, feedMatcher("public"));
      await loginByXstate(page, users[0].username);
      expect((await (await feed).json()).results).toEqual([]);

      await expect(emptyHeader(page)).toContainText("No Transactions");
      await expect(transactionItems(page)).toHaveCount(0);
    });

    // Reference example of decision D-005 (known defects):
    // the test asserts the CORRECT behaviour and is marked `test.fail` with the catalogue id.
    // Today the feed's data machine goes to `failure` and renders the same "No Transactions" empty
    // state as an empty feed — no error (KI-33 in tap26/knowledge/known-issues.md). Playwright counts
    // this test as passing while it fails; once the UI shows an error it reports an *unexpected pass* —
    // then delete the `test.fail` line and update KI-33 to ✅.
    test("tells the user when the public feed fails to load (KI-33)", async ({ page, users }) => {
      test.fail(true, "KI-33: a 500 on the public feed renders the empty state with no error message");
      await stubServerError(page, feedMatcher("public"));
      const feed = waitForApi(page, feedMatcher("public"));
      await loginByXstate(page, users[0].username);
      expect((await feed).status()).toBe(500);
      await expect(page).not.toHaveURL(/\/signin$/); // the session is untouched

      // Correct behaviour: an error is shown instead of the "you have no transactions" empty state.
      await expect(bySel(page, "alert-bar-error")).toBeVisible({ timeout: 3_000 });
      await expect(emptyHeader(page)).not.toContainText("No Transactions");
    });

    test("a slow public feed shows the list skeleton until the data arrives", async ({ page, users }) => {
      await loginByXstate(page, users[0].username);
      await stubLatency(page, feedMatcher("public"), 2_000);

      const feed = waitForApi(page, feedMatcher("public"));
      await page.reload();
      await expect(bySel(page, "list-skeleton")).toBeVisible();
      await expect(transactionItems(page)).toHaveCount(0);

      expect((await feed).status()).toBe(200);
      await waitForListLoaded(page);
      await expect(transactionItems(page).first()).toBeVisible();
    });
  });

  test.describe("bank accounts (GraphQL)", () => {
    test("shows the empty state and onboarding when ListBankAccount returns []", async ({ page, users }) => {
      await stubBankAccounts(page, []);
      await loginByXstate(page, users[0].username);

      const listed = waitForApi(page, listBankAccountsMatcher);
      await page.goto("/bankaccounts");
      await listed;

      await expect(emptyHeader(page)).toContainText("No Bank Accounts");
      await expect(bySel(page, "bankaccount-list")).toHaveCount(0);
      await expect(bySel(page, "user-onboarding-dialog")).toBeVisible();
    });

    test("lists factory-built bank accounts", async ({ page, users }) => {
      const names = ["Alpha Mock Bank", "Beta Mock Bank", "Gamma Mock Bank"];
      const accounts = buildList(buildBankAccount, names.length, (i) => ({ bankName: names[i], userId: users[0].id }));
      await stubBankAccounts(page, accounts);
      await loginByXstate(page, users[0].username);

      await page.goto("/bankaccounts");
      const items = bySel(page, "bankaccount-list").locator('[data-test^="bankaccount-list-item-"]');
      await expect(items).toHaveCount(names.length);
      for (const account of accounts) {
        await expect(bySel(page, `bankaccount-list-item-${account.id}`)).toContainText(account.bankName);
      }
    });
  });

  test.describe("mock-server scenarios as stubs", () => {
    test("new-user-onboarding (tap26/mocks/scenarios) opens the onboarding dialog", async ({ page, users }) => {
      const newUser = withScenario("new-user-onboarding");
      await newUser(page);
      await loginByXstate(page, users[0].username);

      await expect(bySel(page, "user-onboarding-dialog")).toBeVisible();
      await expect(bySel(page, "user-onboarding-dialog")).toContainText("Get Started with Real World App");
    });
  });

  test("factories are deterministic and unique per seq", () => {
    const [a, b] = buildList(buildBankAccount, 2);
    expect(buildBankAccount({}, 1)).toEqual(a);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^[A-Za-z0-9_-]{6,}$/);
    expect(Object.isFrozen(a)).toBe(true);
    expect(buildNotification({ kind: "like" })).not.toHaveProperty("status");
  });
});
