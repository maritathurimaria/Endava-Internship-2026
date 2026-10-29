import { test as base, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  textbox,
  helperText,
  alertBar,
  isMobile,
  loginByXstate,
  switchUser,
  openSideNavOnMobile,
  closeSideNavOnMobile,
  openFeed,
  waitForApi,
  waitForApiJson,
  waitForFeed,
  startNewTransaction,
  searchUsersInput,
  selectContact,
  fillTransactionForm,
  createTransactionViaApp,
  transactionItems,
  typeThenClear,
} from "@ui";
import { formatCents, dollarsToCents } from "@utils/money";
import type { User } from "@models";
import { stubServerError } from "@mocks";

type Ctx = { user: User; contact: User; allUsers: User[] };

/** Logged in as users[0]; users[1] is the counterparty. */
const test = base.extend<{ ctx: Ctx }>({
  ctx: [
    async ({ page, users }, use) => {
      await loginByXstate(page, users[0].username);
      await use({ user: users[0], contact: users[1], allUsers: users });
    },
    { auto: true },
  ],
});

const createTransaction = { method: "POST", path: "/transactions" } as const;
const updateTransaction = { method: "PATCH", path: /^\/transactions\/[^/]+$/ } as const;

test.describe("New Transaction", () => {
  test("navigates to the new transaction form, selects a user and submits a transaction payment", async ({
    page,
    ctx,
    db,
  }) => {
    const payment = { amount: "35", description: "Sushi dinner 🍣" };

    await startNewTransaction(page);

    const searched = waitForApi(page, { method: "GET", path: "/users/search" });
    await searchUsersInput(page).fill(ctx.contact.firstName);
    await searched;
    await selectContact(page, ctx.contact.firstName);

    await fillTransactionForm(page, payment.amount, payment.description);
    const created = waitForApi(page, createTransaction);
    const profileRefreshed = waitForApi(page, { method: "GET", path: "/checkAuth" });
    await bySelLike(page, "submit-payment").click();
    await Promise.all([created, profileRefreshed]);

    await expect(alertBar(page)).toBeVisible();
    await expect(alertBar(page)).toHaveText("Transaction Submitted!");

    await openSideNavOnMobile(page);
    await expect(bySelLike(page, "user-balance")).toContainText(
      formatCents(ctx.user.balance - dollarsToCents(Number(payment.amount))),
    );
    await closeSideNavOnMobile(page);

    await bySelLike(page, "create-another-transaction").click();
    await bySel(page, "app-name-logo").locator("a").click();
    const personal = waitForFeed(page, "personal");
    await openFeed(page, "personal");
    await personal;

    await expect(bySel(page, "transaction-list").first()).toContainText(payment.description);

    const contactAfter = await db.find("users", { id: ctx.contact.id });
    expect(contactAfter.balance).toBe(ctx.contact.balance + dollarsToCents(Number(payment.amount)));
    await expect(alertBar(page)).toHaveCount(0);
  });

  test("shows an accessible error when a payment fails (KI-31)", async ({ page, ctx }) => {
    await stubServerError(page, createTransaction, 500, { error: "Sensitive server details" });
    await startNewTransaction(page);
    await selectContact(page, ctx.contact.firstName);
    await fillTransactionForm(page, "35", "Failed payment check");

    let submissionCount = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/transactions") {
        submissionCount += 1;
      }
    });

    const failed = waitForApi(page, createTransaction);
    await bySelLike(page, "submit-payment").click();
    expect((await failed).status()).toBe(500);

    const error = bySel(page, "transaction-create-error");
    await expect(error).toHaveRole("alert");
    await expect(error).toHaveText("Transaction could not be completed. Please try again.");
    await expect(alertBar(page, "success")).toHaveCount(0);
    await expect(bySel(page, "new-transaction-create-another-transaction")).toHaveCount(0);
    await expect(bySelLike(page, "submit-payment")).toBeEnabled();
    expect(submissionCount).toBe(1);
  });

  test("navigates to the new transaction form, selects a user and submits a transaction request", async ({
    page,
    ctx,
  }) => {
    const request = { amount: "95", description: "Fancy Hotel 🏨" };

    await startNewTransaction(page);
    await selectContact(page, ctx.contact.firstName);
    await fillTransactionForm(page, request.amount, request.description);

    const created = waitForApi(page, createTransaction);
    await bySelLike(page, "submit-request").click();
    await created;
    await expect(alertBar(page)).toHaveText("Transaction Submitted!");

    await bySelLike(page, "return-to-transactions").click();
    await openFeed(page, "personal");
    await expect(transactionItems(page).filter({ hasText: request.description }).first()).toBeVisible();
  });

  test("displays new transaction errors", async ({ page, ctx }) => {
    await startNewTransaction(page);
    await selectContact(page, ctx.contact.firstName);

    await typeThenClear(textbox(page, "amount-input"), "43");
    await expect(helperText(page, "transaction-create-amount-input")).toContainText("Please enter a valid amount");

    await typeThenClear(textbox(page, "description-input"), "Fun");
    await expect(helperText(page, "transaction-create-description-input")).toContainText("Please enter a note");

    await expect(bySelLike(page, "submit-request")).toBeDisabled();
    await expect(bySelLike(page, "submit-payment")).toBeDisabled();
  });

  test("submits a transaction payment and verifies the deposit for the receiver", async ({ page, ctx }) => {
    await bySel(page, "nav-top-new-transaction").click();
    const draft = {
      transactionType: "payment" as const,
      amount: 25,
      description: "Indian Food",
      sender: ctx.user,
      receiver: ctx.contact,
    };

    // The balance is only shown in the desktop layout.
    const balance = bySel(page, "sidenav-user-balance");
    const startBalance = isMobile(page) ? "" : await balance.innerText();
    if (!isMobile(page)) expect(startBalance).toMatch(/\$\d/);

    const created = waitForApi(page, createTransaction);
    await createTransactionViaApp(page, draft);
    await created;
    await expect(bySel(page, "new-transaction-create-another-transaction")).toBeVisible();
    if (!isMobile(page)) await expect(balance).not.toHaveText(startBalance);

    await switchUser(page, ctx.contact.username);
    await openSideNavOnMobile(page);
    await expect(bySelLike(page, "user-balance")).toContainText(
      formatCents(ctx.contact.balance + dollarsToCents(draft.amount)),
    );
  });

  test("submits a transaction request and accepts the request for the receiver", async ({ page, ctx }) => {
    const draft = {
      transactionType: "request" as const,
      amount: 100,
      description: "Fancy Hotel",
      sender: ctx.user,
      receiver: ctx.contact,
    };

    await bySelLike(page, "new-transaction").first().click();
    const created = waitForApi(page, createTransaction);
    await createTransactionViaApp(page, draft);
    await created;
    await expect(bySel(page, "new-transaction-create-another-transaction")).toBeVisible();

    await switchUser(page, ctx.contact.username);
    const personal = waitForFeed(page, "personal");
    await openFeed(page, "personal");
    await personal;

    const first = transactionItems(page).first();
    await expect(first).toContainText(draft.description);
    await first.click();
    await expect(bySel(page, "transaction-detail-header")).toBeAttached();

    const updated = waitForApi(page, updateTransaction);
    await bySelLike(page, "accept-request").click();
    expect((await updated).status()).toBe(204);
    for (const part of [
      "transaction-detail-header",
      "transaction-amount",
      "sender-avatar",
      "receiver-avatar",
      "transaction-description",
    ]) {
      await expect(bySelLike(page, part).first()).toBeVisible();
    }

    await switchUser(page, ctx.user.username);
    await openSideNavOnMobile(page);
    await expect(bySelLike(page, "user-balance")).toContainText(
      formatCents(ctx.user.balance + dollarsToCents(draft.amount)),
    );
  });

  test.describe("searches for a user by attribute", () => {
    const searchAttrs = ["firstName", "lastName", "username", "email", "phoneNumber"] as const;

    for (const attr of searchAttrs) {
      test(attr, async ({ page, ctx }) => {
        const target = ctx.allUsers[2];
        await startNewTransaction(page);

        const searched = waitForApiJson<{ results: User[] }>(page, { method: "GET", path: "/users/search" });
        await searchUsersInput(page).fill(target[attr]);
        const { results } = await searched;
        expect(results.length).toBeGreaterThan(0);

        const items = bySelLike(page, "user-list-item");
        await expect(items).toHaveCount(results.length);
        await expect(items.first()).toContainText(target[attr]);

        await searchUsersInput(page).fill("");
        await expect(bySel(page, "users-list")).toBeEmpty();
      });
    }
  });
});
