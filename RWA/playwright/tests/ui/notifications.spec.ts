import { test, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  goToSideNav,
  loginByXstate,
  switchUser,
  stubApi,
  waitForApi,
  waitForApiJson,
  createTransactionViaApp,
} from "@ui";
import type { Notification } from "@models";
import type { Page } from "@playwright/test";

const notificationsCall = { method: "GET", path: "/notifications" } as const;
const likeCount = (page: Page) => bySelLike(page, "transaction-like-count");
const notificationItems = (page: Page) => bySelLike(page, "notification-list-item");

/** Like the transaction open on screen and check the count goes 0 → 1. */
const likeOpenTransaction = async (page: Page) => {
  await expect(likeCount(page)).toHaveText("0");
  await bySelLike(page, "like-button").click();
  await expect(bySelLike(page, "like-button")).toBeDisabled();
  await expect(likeCount(page)).toHaveText("1");
};

const commentOnOpenTransaction = async (page: Page, text: string) => {
  const posted = waitForApi(page, { method: "POST", path: /^\/comments\// });
  await bySelLike(page, "comment-input").fill(text);
  await bySelLike(page, "comment-input").press("Enter");
  await posted;
};

const openNotifications = async (page: Page) => {
  const loaded = waitForApi(page, notificationsCall);
  await bySelLike(page, "notifications-link").click();
  await loaded;
  await expect(page).toHaveURL(/\/notifications$/);
};

const expectLatestNotification = async (page: Page, who: string, action: string, count?: number) => {
  if (count !== undefined) await expect(notificationItems(page)).toHaveCount(count);
  await expect(notificationItems(page).first()).toContainText(who);
  await expect(notificationItems(page).first()).toContainText(action);
};

test.describe("Notifications", () => {
  test.describe("notifications from user interactions", () => {
    test("User A likes a transaction of User B; User B gets notification that User A liked transaction", async ({
      page,
      db,
      users: [userA, userB],
    }) => {
      await loginByXstate(page, userA.username);
      const transaction = await db.find("transactions", { senderId: userB.id });

      const notifications = waitForApiJson<{ results: Notification[] }>(page, notificationsCall);
      await page.goto(`/transaction/${transaction.id}`);
      const { results } = await notifications;
      await expect(bySel(page, "nav-top-notifications-count")).toHaveText(`${results.length}`);

      await likeOpenTransaction(page);

      const userBNotifications = waitForApiJson<{ results: Notification[] }>(page, notificationsCall);
      await switchUser(page, userB.username);
      const preDismissedCount = (await userBNotifications).results.length;

      await page.goto("/notifications");
      await expectLatestNotification(page, userA.firstName, "liked", 9);

      const markedRead = waitForApi(page, { method: "PATCH", path: /^\/notifications\// });
      await bySelLike(page, "notification-mark-read").first().click({ force: true });
      await markedRead;
      await expect.poll(() => notificationItems(page).count()).toBeLessThan(preDismissedCount);
    });

    test("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", async ({
      page,
      db,
      users: [userA, userB, userC],
    }) => {
      await loginByXstate(page, userC.username);
      const transaction = await db.find("transactions", { senderId: userB.id, receiverId: userA.id });
      await page.goto(`/transaction/${transaction.id}`);
      await likeOpenTransaction(page);

      await switchUser(page, userA.username);
      await openNotifications(page);
      await expectLatestNotification(page, userC.firstName, "liked", 9);

      await switchUser(page, userB.username);
      await openNotifications(page);
      await expectLatestNotification(page, userC.firstName, "liked", 9);
    });

    test("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", async ({
      page,
      db,
      users: [userA, userB],
    }) => {
      await loginByXstate(page, userA.username);
      const transaction = await db.find("transactions", { senderId: userB.id });
      await page.goto(`/transaction/${transaction.id}`);
      await commentOnOpenTransaction(page, "Thank You");

      await switchUser(page, userB.username);
      await openNotifications(page);
      await expectLatestNotification(page, userA.firstName, "commented", 9);
    });

    test("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", async ({
      page,
      db,
      users: [userA, userB, userC],
    }) => {
      await loginByXstate(page, userC.username);
      const transaction = await db.find("transactions", { senderId: userB.id, receiverId: userA.id });
      await page.goto(`/transaction/${transaction.id}`);
      await commentOnOpenTransaction(page, "Thank You");

      await switchUser(page, userA.username);
      await openNotifications(page);
      await expectLatestNotification(page, userC.firstName, "commented", 9);

      await switchUser(page, userB.username);
      await openNotifications(page);
      await expectLatestNotification(page, userC.firstName, "commented", 9);
    });

    test("User A sends a payment to User B", async ({ page, users: [userA, userB] }) => {
      await loginByXstate(page, userA.username);
      await bySelLike(page, "new-transaction").first().click();
      const created = waitForApi(page, { method: "POST", path: "/transactions" });
      await createTransactionViaApp(page, {
        transactionType: "payment",
        amount: 30,
        description: "🍕Pizza",
        sender: userA,
        receiver: userB,
      });
      await created;

      await switchUser(page, userB.username);
      await openNotifications(page);
      await expectLatestNotification(page, userB.firstName, "received payment");
    });

    test("User A sends a payment request to User C", async ({ page, users: [userA, , userC] }) => {
      await loginByXstate(page, userA.username);
      await bySelLike(page, "new-transaction").first().click();
      const created = waitForApi(page, { method: "POST", path: "/transactions" });
      await createTransactionViaApp(page, {
        transactionType: "request",
        amount: 300,
        description: "🛫🛬 Airfare",
        sender: userA,
        receiver: userC,
      });
      await created;

      await switchUser(page, userC.username);
      await openNotifications(page);
      const fromUserA = notificationItems(page)
        .filter({ hasText: userA.firstName })
        .filter({ hasText: "requested payment" });
      await expect(fromUserA.first()).toBeVisible();
    });
  });

  test("renders an empty notifications state", async ({ page, users: [userA] }) => {
    await stubApi(page, notificationsCall, []);
    await loginByXstate(page, userA.username);

    await goToSideNav(page, "notifications");
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(bySel(page, "notification-list")).toHaveCount(0);
    await expect(bySel(page, "empty-list-header")).toContainText("No Notifications");
  });
});
