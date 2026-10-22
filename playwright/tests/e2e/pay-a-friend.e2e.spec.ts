import { test, expect } from "@fixtures/ui";
import {
  alertBar,
  bySel,
  bySelLike,
  createTransactionViaApp,
  exposeAppServices,
  fillTransactionForm,
  loginViaForm,
  openFeed,
  openSideNavOnMobile,
  searchUsersInput,
  selectContact,
  startNewTransaction,
  switchUser,
  transactionItems,
  waitForApi,
  waitForFeed,
} from "@ui";
import { env } from "@config";
import { dollarsToCents, formatCents } from "@utils/money";
import type { Page, ViewportSize } from "@playwright/test";

/**
 * Reference end-to-end journey (decision D-006): one user story told across UI, API and data.
 *
 *   Alice pays Bob → both balances move → Bob is notified → Bob likes and comments →
 *   Alice is notified of both.
 *
 * Journeys use `test.step` for readable reports and verify state through the API (`db`) as well as the UI.
 * Students build their own journey in tap26/labs/lab-12-e2e-journey.md.
 */

const openNotifications = async (page: Page) => {
  const loaded = waitForApi(page, { method: "GET", path: "/notifications" });
  await bySelLike(page, "notifications-link").click();
  await loaded;
  await expect(page).toHaveURL(/\/notifications$/);
};

test.describe("Journey: pay a friend", { tag: ["@e2e"] }, () => {
  test("Bob sees Alice's $42 payment after reloading in an independent session", async (
    { browser, db, users: [alice, bob] },
    testInfo,
  ) => {
    const viewport = testInfo.project.use.viewport as ViewportSize;
    const contextOptions = { baseURL: env.baseURL, viewport };
    const [aliceContext, bobContext] = await Promise.all([
      browser.newContext(contextOptions),
      browser.newContext(contextOptions),
    ]);

    try {
      const [alicePage, bobPage] = await Promise.all([aliceContext.newPage(), bobContext.newPage()]);
      await Promise.all([exposeAppServices(alicePage), exposeAppServices(bobPage)]);
      await Promise.all([loginByXstate(alicePage, alice.username), loginByXstate(bobPage, bob.username)]);

      const payment = { amount: 42, description: `E2E payment ${Date.now()}` };
      const expectedBobBalance = formatCents(bob.balance + dollarsToCents(payment.amount));

      await test.step("Alice pays Bob $42", async () => {
        await expect(bySelLike(bobPage, "user-balance")).toContainText(formatCents(bob.balance));
        await startNewTransaction(alicePage);

        const created = waitForApi(alicePage, { method: "POST", path: "/transactions" });
        await createTransactionViaApp(alicePage, {
          transactionType: "payment",
          amount: payment.amount,
          description: payment.description,
          sender: alice,
          receiver: bob,
        });
        expect((await created).status()).toBe(200);
      });

      await test.step("Bob reloads and sees his updated balance", async () => {
        const profileRefreshed = waitForApi(bobPage, { method: "GET", path: "/checkAuth" });
        const feedLoaded = waitForApi(bobPage, { method: "GET", path: "/transactions" });
        await bobPage.reload();
        expect((await profileRefreshed).status()).toBe(200);
        expect((await feedLoaded).status()).toBe(200);

        await expect(bySelLike(bobPage, "user-balance")).toContainText(expectedBobBalance);
        const bobAfter = await db.find("users", { id: bob.id });
        expect(bobAfter.balance).toBe(bob.balance + dollarsToCents(payment.amount));
      });
    } finally {
      await Promise.all([aliceContext.close(), bobContext.close()]);
    }
  });

  test("Alice pays Bob, Bob reacts, Alice is notified", async ({ page, db, users: [alice, bob] }) => {
    const payment = { amount: 42, note: `E2E dinner ${Date.now()}` };
    let transactionId = "";

    await test.step("Alice signs in through the form", async () => {
      await loginViaForm(page, alice.username, env.defaultPassword);
      await expect(page).toHaveURL(new RegExp(`^${env.baseURL}/?$`));
    });

    await test.step("Alice sends Bob a payment", async () => {
      await startNewTransaction(page);
      const searched = waitForApi(page, { method: "GET", path: "/users/search" });
      await searchUsersInput(page).fill(bob.firstName);
      await searched;
      await selectContact(page, bob.firstName);
      await fillTransactionForm(page, String(payment.amount), payment.note);

      const created = waitForApi(page, { method: "POST", path: "/transactions" });
      await bySelLike(page, "submit-payment").click();
      const response = await created;
      expect(response.status()).toBe(200);
      transactionId = ((await response.json()) as { transaction: { id: string } }).transaction.id;
      await expect(alertBar(page)).toHaveText("Transaction Submitted!");
    });

    await test.step("Balances moved in the data layer", async () => {
      const [aliceAfter, bobAfter] = await Promise.all([
        db.find("users", { id: alice.id }),
        db.find("users", { id: bob.id }),
      ]);
      expect(aliceAfter.balance).toBe(alice.balance - dollarsToCents(payment.amount));
      expect(bobAfter.balance).toBe(bob.balance + dollarsToCents(payment.amount));
    });

    await test.step("Alice sees the payment in her personal feed and her new balance", async () => {
      await bySel(page, "app-name-logo").locator("a").click();
      const personal = waitForFeed(page, "personal");
      await openFeed(page, "personal");
      await personal;
      await expect(transactionItems(page).filter({ hasText: payment.note }).first()).toBeVisible();
      await openSideNavOnMobile(page);
      await expect(bySelLike(page, "user-balance")).toContainText(
        formatCents(alice.balance - dollarsToCents(payment.amount)),
      );
    });

    await test.step("Bob is notified and sees his new balance", async () => {
      await switchUser(page, bob.username);
      await expect(bySelLike(page, "user-balance")).toContainText(
        formatCents(bob.balance + dollarsToCents(payment.amount)),
      );
      await openNotifications(page);
      const items = bySelLike(page, "notification-list-item");
      await expect(items.first()).toContainText("received payment");
    });

    await test.step("Bob likes and comments on the payment", async () => {
      await page.goto(`/transaction/${transactionId}`);
      await expect(bySel(page, "transaction-detail-header")).toBeVisible();

      const liked = waitForApi(page, { method: "POST", path: /^\/likes\// });
      await bySelLike(page, "like-button").click();
      await liked;
      await expect(bySelLike(page, "like-count")).toHaveText("1");

      const commented = waitForApi(page, { method: "POST", path: /^\/comments\// });
      await bySelLike(page, "comment-input").fill("Thanks Alice!");
      await bySelLike(page, "comment-input").press("Enter");
      await commented;
      await expect(bySelLike(page, "comments-list")).toContainText("Thanks Alice!");
    });

    await test.step("Alice is notified of the like and the comment", async () => {
      await switchUser(page, alice.username);
      await openNotifications(page);
      const fromBob = bySelLike(page, "notification-list-item").filter({ hasText: bob.firstName });
      await expect(fromBob.filter({ hasText: "liked" }).first()).toBeVisible();
      await expect(fromBob.filter({ hasText: "commented" }).first()).toBeVisible();
    });
  });
});
