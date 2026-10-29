import { test as base, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  isMobile,
  closeSideNavOnMobile,
  loginByXstate,
  stubApi,
  waitForFeed,
  feeds,
  feedNames,
  feedMatcher,
  feedTab,
  openFeed,
  fetchFeedPage,
  scrollFeedToBottom,
  pickDateRange,
  clearDateRange,
  setAmountRange,
  amountQuery,
  withoutFilters,
  transactionItems,
  type FeedName,
} from "@ui";
import { env } from "@config";
import { formatCents, dollarsToCents } from "@utils/money";
import { twoDayWindowFrom, isWithin, startOfDay, endOfDay, addDays } from "@utils/dates";
import { intersection } from "@utils/fp";
import type { Paginated, TransactionResponseItem, User } from "@models";
import type { Db } from "@api/testData";
import publicTransactionsFixture from "../../test-data/public-transactions.json";
import type { Page } from "@playwright/test";

type Ctx = { user: User; publicFeed: Promise<Paginated<TransactionResponseItem>> };

/**
 * Logged in as users[0]. `publicFeed` is the public feed the home page loads on login
 * (captured before login so the response is not missed).
 */
const test = base.extend<{ ctx: Ctx }>({
  ctx: [
    async ({ page, users }, use) => {
      const publicFeed = waitForFeed(page, "public").then((r) => r.body);
      await loginByXstate(page, users[0].username);
      await use({ user: users[0], publicFeed });
    },
    { auto: true },
  ],
});

const RED = "rgb(255, 0, 0)";
const GREEN = "rgb(76, 175, 80)";

const expectEmptyFeed = async (page: Page) => {
  await expect(transactionItems(page)).toHaveCount(0);
  await expect(bySel(page, "empty-list-header")).toContainText("No Transactions");
  const createButton = bySelLike(page, "empty-create-transaction-button");
  await expect(createButton).toHaveAttribute("href", "/transaction/new");
  await expect(createButton).toHaveText(/create a transaction/i);
  await expect(createButton).toHaveCSS("text-transform", "uppercase");
};

/**
 * Open a feed tab and return its first (unfiltered) page. The public feed is already
 * selected after login, and re-clicking a selected tab does not refetch, so reload instead.
 */
const openFeedAndRead = async (page: Page, feed: FeedName) => {
  const alreadyOpen = /Mui-selected/.test((await feedTab(page, feed).getAttribute("class")) ?? "");
  const first = waitForFeed(page, feed);
  if (alreadyOpen) await page.reload();
  else await openFeed(page, feed);
  await expect(feedTab(page, feed)).toHaveClass(/Mui-selected/);
  return (await first).body;
};

test.describe("Transaction Feed", () => {
  test.describe("app layout and responsiveness", () => {
    test("toggles the navigation drawer", async ({ page }) => {
      const home = bySel(page, "sidenav-home");
      if (isMobile(page)) {
        await expect(home).toBeHidden();
        await bySel(page, "sidenav-toggle").click();
        await expect(home).toBeVisible();
        await closeSideNavOnMobile(page); // clicks the backdrop
        await expect(home).toBeHidden();
        await bySel(page, "sidenav-toggle").click();
        await home.click();
        await expect(home).toBeHidden();
      } else {
        await expect(home).toBeVisible();
        await bySel(page, "sidenav-toggle").click();
        await expect(home).not.toBeVisible();
      }
    });
  });

  test.describe("renders and paginates all transaction feeds", () => {
    test("renders transactions item variations in feed", async ({ page }) => {
      await stubApi(page, feedMatcher("public"), publicTransactionsFixture);
      const mocked = waitForFeed(page, "public");
      await page.goto("/");
      const { results } = (await mocked).body;

      const byId = (id: string) => results.find((t) => t.id === id)!;
      const itemContaining = (text: string) => transactionItems(page).filter({ hasText: text }).first();
      const transactionOf = async (text: string) => {
        const dataTest = (await itemContaining(text).getAttribute("data-test"))!;
        return byId(dataTest.replace("transaction-item-", ""));
      };

      // Paid payment
      const paid = await transactionOf("paid");
      expect(["pending", "complete"]).toContain(paid.status);
      expect(paid.requestStatus).toBeFalsy();
      const paidItem = itemContaining("paid");
      await expect(bySelLike(paidItem, "like-count")).toHaveText(`${paid.likes.length}`);
      await expect(bySelLike(paidItem, "comment-count")).toHaveText(`${paid.comments.length}`);
      await expect(bySelLike(paidItem, "sender")).toContainText(paid.senderName);
      await expect(bySelLike(paidItem, "receiver")).toContainText(paid.receiverName);
      await expect(bySelLike(paidItem, "amount")).toContainText(`-${formatCents(paid.amount)}`);
      await expect(bySelLike(paidItem, "amount")).toHaveCSS("color", RED);

      // Charged (accepted request)
      const charged = await transactionOf("charged");
      expect(charged.status).toBe("complete");
      expect(charged.requestStatus).toBe("accepted");
      await expect(bySelLike(itemContaining("charged"), "amount")).toContainText(`+${formatCents(charged.amount)}`);
      await expect(bySelLike(itemContaining("charged"), "amount")).toHaveCSS("color", GREEN);

      // Requested (pending or rejected request)
      const requested = await transactionOf("requested");
      expect(["pending", "complete"]).toContain(requested.status);
      expect(["pending", "rejected"]).toContain(requested.requestStatus);
      await expect(bySelLike(itemContaining("requested"), "amount")).toContainText(`+${formatCents(requested.amount)}`);
      await expect(bySelLike(itemContaining("requested"), "amount")).toHaveCSS("color", GREEN);
    });

    for (const feed of feedNames) {
      test(`paginates ${feed} transaction feed`, async ({ page }) => {
        const firstPage = await openFeedAndRead(page, feed);
        await expect(feedTab(page, feed)).toHaveText(new RegExp(feeds[feed].label, "i"));
        await expect(feedTab(page, feed)).toHaveCSS("text-transform", "uppercase");
        await expect(bySel(page, "list-skeleton")).toHaveCount(0);
        expect(firstPage.results).toHaveLength(env.paginationPageSize);

        // Infinite scroll loads page 2
        const secondPage = waitForFeed(page, feed, (q) => q.get("page") === "2");
        await scrollFeedToBottom(page);
        const { results, pageData } = (await secondPage).body;
        expect(results).toHaveLength(env.paginationPageSize);
        expect(pageData.page).toBe(2);

        // Jump to the last page through the feed's state machine
        const lastPage = waitForFeed(page, feed, (q) => q.get("page") === `${pageData.totalPages}`);
        await fetchFeedPage(page, feed, pageData.totalPages);
        const last = (await lastPage).body;
        expect(last.results.length).toBeGreaterThanOrEqual(1);
        expect(last.pageData.page).toBe(last.pageData.totalPages);
        expect(last.pageData.hasNextPages).toBe(false);
      });
    }
  });

  test.describe("filters transaction feeds by date range", () => {
    test("closes date range picker modal (mobile only)", async ({ page }) => {
      test.skip(!isMobile(page), "The date picker is a drawer only on mobile");
      await bySelLike(page, "filter-date-range-button").first().click({ force: true });
      await expect(page.locator(".react-calendar")).toBeVisible();
      await bySel(page, "date-range-filter-drawer-close").click();
      await expect(page.locator(".react-calendar")).toHaveCount(0);
    });

    for (const feed of feedNames) {
      test(`filters ${feed} transaction feed by date range`, async ({ page, db }) => {
        const transaction = await db.find("transactions");
        const window = twoDayWindowFrom(transaction.createdAt);

        const unfiltered = await openFeedAndRead(page, feed);

        const filtered = waitForFeed(page, feed, (q) => q.has("dateRangeStart"));
        await pickDateRange(page, window.start, window.end);
        const { body, url } = await filtered;

        expect(url.searchParams.get("dateRangeStart")).toBe(window.start.toISOString());
        await expect(transactionItems(page)).toHaveCount(body.results.length);
        for (const { createdAt } of body.results) {
          expect(isWithin(createdAt, window), `${createdAt} is within the picked range`).toBe(true);
        }

        const reverted = waitForFeed(page, feed, withoutFilters);
        await clearDateRange(page);
        expect((await reverted).body.results).toEqual(unfiltered.results);
      });

      test(`does not show ${feed} transactions for out of range date limits`, async ({ page }) => {
        // The seed data spans 2023–2024, so August 2025 is empty.
        const start = startOfDay(new Date(2025, 7, 1));
        const end = endOfDay(addDays(start, 1));

        await openFeedAndRead(page, feed);
        const filtered = waitForFeed(page, feed, (q) => q.has("dateRangeStart"));
        await pickDateRange(page, start, end);
        await filtered;

        await expectEmptyFeed(page);
      });
    }
  });

  test.describe("filters transaction feeds by amount range", () => {
    const range = { min: 200, max: 800 };

    for (const feed of feedNames) {
      test(`filters ${feed} transaction feed by amount range`, async ({ page }) => {
        const unfiltered = await openFeedAndRead(page, feed);
        const [minCents, maxCents] = [dollarsToCents(range.min), dollarsToCents(range.max)];

        const filtered = waitForFeed(page, feed, amountQuery(minCents, maxCents));
        await setAmountRange(page, range.min, range.max);
        await expect(bySelLike(page, "filter-amount-range-text")).toContainText(`$${range.min} - $${range.max}`);

        const { body, url } = await filtered;
        expect(url.searchParams.get("amountMin")).toBe(`${minCents}`);
        expect(url.searchParams.get("amountMax")).toBe(`${maxCents}`);
        for (const { amount } of body.results) {
          expect(amount).toBeGreaterThanOrEqual(minCents);
          expect(amount).toBeLessThanOrEqual(maxCents);
        }

        const reverted = waitForFeed(page, feed, withoutFilters);
        await bySelLike(page, "amount-clear-button").first().click();
        expect((await reverted).body.results).toEqual(unfiltered.results);

        if (isMobile(page)) {
          await bySelLike(page, "amount-range-filter-drawer-close").click();
          await expect(bySel(page, "amount-range-filter-drawer")).toHaveCount(0);
        } else {
          await page.keyboard.press("Escape");
          await expect(bySel(page, "transaction-list-filter-amount-range")).toHaveCount(0);
        }
      });

      test(`does not show ${feed} transactions for out of range amount limits`, async ({ page }) => {
        await openFeedAndRead(page, feed);
        const filtered = waitForFeed(page, feed, amountQuery(dollarsToCents(550), dollarsToCents(1000)));
        await setAmountRange(page, 550, 1000);
        await expect(bySelLike(page, "filter-amount-range-text")).toContainText("$550 - $1,000");
        await filtered;

        await expectEmptyFeed(page);
      });
    }
  });

  test.describe("Feed Item Visibility", () => {
    const contactIdsOf = async (db: Db, userId: string) =>
      (await db.filter("contacts", { userId })).map((c) => c.contactUserId);

    test("mine feed only shows personal transactions", async ({ page, ctx }) => {
      const { results } = await openFeedAndRead(page, "personal");
      for (const t of results) expect([t.senderId, t.receiverId]).toContain(ctx.user.id);
      await expect(bySel(page, "list-skeleton")).toHaveCount(0);
    });

    test("first five items belong to contacts in public feed", async ({ page, db, ctx }) => {
      const contactIds = await contactIdsOf(db, ctx.user.id);
      const { results } = await ctx.publicFeed;
      for (const t of results.slice(0, 5)) {
        expect(intersection([t.senderId, t.receiverId], contactIds), `${t.id} involves a contact`).not.toHaveLength(0);
      }
      await expect(bySel(page, "list-skeleton")).toHaveCount(0);
    });

    test("friends feed only shows contact transactions", async ({ page, db, ctx }) => {
      const contactIds = await contactIdsOf(db, ctx.user.id);
      const { results } = await openFeedAndRead(page, "contacts");
      for (const t of results) {
        expect(intersection(contactIds, [t.senderId, t.receiverId]), `${t.id} involves a contact`).not.toHaveLength(0);
      }
      await expect(bySel(page, "list-skeleton")).toHaveCount(0);
    });
  });
});
