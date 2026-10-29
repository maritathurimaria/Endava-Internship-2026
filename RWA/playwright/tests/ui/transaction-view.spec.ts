import { test as base, expect } from "@fixtures/ui";
import { bySel, bySelLike, loginByXstate, openFeed, waitForApi, waitForFeed, transactionItems } from "@ui";
import type { Transaction, User } from "@models";

type Ctx = { user: User; pendingRequest: Transaction };

/** Logged in as users[0], on the personal ("Mine") feed, with a pending request addressed to them. */
const test = base.extend<{ ctx: Ctx }>({
  ctx: [
    async ({ page, db, users }, use) => {
      const user = users[0];
      const pendingRequest = await db.find("transactions", {
        receiverId: user.id,
        status: "pending",
        requestStatus: "pending",
        requestResolvedAt: "",
      });
      await loginByXstate(page, user.username);
      const personal = waitForFeed(page, "personal");
      await openFeed(page, "personal");
      await personal;
      await use({ user, pendingRequest });
    },
    { auto: true },
  ],
});

const getTransaction = { method: "GET", path: /^\/transactions\/[^/]+$/ } as const;
const updateTransaction = { method: "PATCH", path: /^\/transactions\/[^/]+$/ } as const;

test.describe("Transaction View", () => {
  test("transactions navigation tabs are hidden on a transaction view page", async ({ page }) => {
    await transactionItems(page).first().click();
    await expect(page).toHaveURL(/\/transaction\//);
    await expect(bySel(page, "nav-transaction-tabs")).toHaveCount(0);
    await expect(bySel(page, "transaction-detail-header")).toBeVisible();
  });

  test("likes a transaction", async ({ page }) => {
    const loaded = waitForApi(page, getTransaction);
    await transactionItems(page).first().click();
    await loaded;

    await bySelLike(page, "like-button").click();
    await expect(bySelLike(page, "like-count")).toContainText("2");
    await expect(bySelLike(page, "like-button")).toBeDisabled();
  });

  test("comments on a transaction", async ({ page }) => {
    const loaded = waitForApi(page, getTransaction);
    await transactionItems(page).first().click();
    await loaded;

    const comments = ["Thank you!", "Appreciate it."];
    const list = bySelLike(page, "comments-list");
    for (const [index, comment] of comments.entries()) {
      await bySelLike(page, "comment-input").fill(comment);
      await bySelLike(page, "comment-input").press("Enter");
      await expect(list.locator("> *").nth(index)).toContainText(comment);
    }
    await expect(list.locator("> *")).toHaveCount(comments.length);
  });

  test("accepts a transaction request", async ({ page, ctx }) => {
    const loaded = waitForApi(page, getTransaction);
    await page.goto(`/transaction/${ctx.pendingRequest.id}`);
    await loaded;

    const updated = waitForApi(page, updateTransaction);
    await bySelLike(page, "accept-request").click();
    expect((await updated).status()).toBe(204);
    await expect(bySelLike(page, "accept-request")).toHaveCount(0);
    await expect(bySel(page, "transaction-detail-header")).toBeVisible();
  });

  test("rejects a transaction request", async ({ page, ctx }) => {
    const loaded = waitForApi(page, getTransaction);
    await page.goto(`/transaction/${ctx.pendingRequest.id}`);
    await loaded;

    const updated = waitForApi(page, updateTransaction);
    await bySelLike(page, "reject-request").click();
    expect((await updated).status()).toBe(204);
    await expect(bySelLike(page, "reject-request")).toHaveCount(0);
    await expect(bySel(page, "transaction-detail-header")).toBeVisible();
  });

  test("does not display accept/reject buttons on completed request", async ({ page, db, ctx }) => {
    const completed = await db.find("transactions", {
      receiverId: ctx.user.id,
      status: "complete",
      requestStatus: "accepted",
    });
    await page.goto(`/transaction/${completed.id}`);

    await expect(bySel(page, "nav-top-notifications-count")).toBeVisible();
    await expect(bySel(page, "transaction-detail-header")).toBeVisible();
    await expect(bySel(page, "transaction-accept-request")).toHaveCount(0);
    await expect(bySel(page, "transaction-reject-request")).toHaveCount(0);
  });
});
