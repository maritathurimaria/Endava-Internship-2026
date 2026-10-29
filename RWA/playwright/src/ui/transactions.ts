import { expect, type Page } from "@playwright/test";
import { differenceInCalendarMonths, format, parse } from "date-fns";
import type { Paginated, TransactionResponseItem, TransactionType, User } from "@models";
import { bySel, bySelLike, textbox } from "./selectors";
import { waitForApi, type ApiMatcher } from "./network";
import { sendToService, waitForService } from "./app";

// ---- Feeds -------------------------------------------------------------------

export const feeds = {
  public: { tab: "public-tab", label: "everyone", path: "/transactions/public", service: "publicTransactionService" },
  contacts: {
    tab: "contacts-tab",
    label: "friends",
    path: "/transactions/contacts",
    service: "contactTransactionService",
  },
  personal: { tab: "personal-tab", label: "mine", path: "/transactions", service: "personalTransactionService" },
} as const;

export type FeedName = keyof typeof feeds;
export const feedNames = Object.keys(feeds) as FeedName[];
export type FeedResponse = Paginated<TransactionResponseItem>;

export const feedMatcher = (feed: FeedName, query?: ApiMatcher["query"]): ApiMatcher => ({
  method: "GET",
  path: feeds[feed].path,
  query,
});

/** Resolve with the next response for a feed, parsed. */
export const waitForFeed = async (page: Page, feed: FeedName, query?: ApiMatcher["query"]) => {
  const res = await waitForApi(page, feedMatcher(feed, query));
  return { url: new URL(res.url()), body: (await res.json()) as FeedResponse };
};

export const feedTab = (page: Page, feed: FeedName) => bySelLike(page, feeds[feed].tab);

export const openFeed = async (page: Page, feed: FeedName) => {
  await feedTab(page, feed).click();
  await expect(feedTab(page, feed)).toHaveClass(/Mui-selected/);
};

/** Ask the feed's XState service for a page directly (like `cy.nextTransactionFeedPage`). */
export const fetchFeedPage = async (page: Page, feed: FeedName, pageNumber: number) => {
  await waitForService(page, feeds[feed].service);
  await sendToService(page, feeds[feed].service, "FETCH", { page: pageNumber });
};

/** Scroll the virtualised transaction list to the bottom to trigger infinite loading. */
export const scrollFeedToBottom = (page: Page) =>
  bySel(page, "transaction-list").evaluate((list) => {
    [list, ...Array.from(list.querySelectorAll<HTMLElement>("*"))]
      .filter((el) => el.scrollHeight > el.clientHeight)
      .forEach((el) => el.scrollTo(0, el.scrollHeight));
  });

// ---- Creating transactions ------------------------------------------------------

export interface TransactionDraft {
  transactionType: TransactionType;
  amount: number;
  description: string;
  sender: User;
  receiver: User;
}

/**
 * Submit a transaction through the app's createTransactionService (like `cy.createTransaction`).
 * Must be called while on the New Transaction page.
 */
export const createTransactionViaApp = async (page: Page, draft: TransactionDraft) => {
  await waitForService(page, "createTransactionService");
  await sendToService(page, "createTransactionService", "SET_USERS", draft);
  await sendToService(page, "createTransactionService", "CREATE", {
    amount: draft.amount,
    description: draft.description,
    transactionType: draft.transactionType,
    senderId: draft.sender.id,
    receiverId: draft.receiver.id,
  });
};

export const startNewTransaction = async (page: Page) => {
  const users = waitForApi(page, { method: "GET", path: "/users" });
  await bySelLike(page, "new-transaction").first().click();
  await users;
};

export const searchUsersInput = (page: Page) => bySel(page, "user-list-search-input");

export const selectContact = async (page: Page, name: string) => {
  await bySelLike(page, "user-list-item").filter({ hasText: name }).first().click();
};

export const fillTransactionForm = async (page: Page, amount: string, description: string) => {
  await textbox(page, "amount-input").fill(amount);
  await textbox(page, "description-input").fill(description);
};

// ---- Filters ---------------------------------------------------------------------

const calendar = (page: Page) => page.locator(".react-calendar");

const showMonthOf = async (page: Page, target: Date) => {
  const label = (await page.locator(".react-calendar__navigation__label").first().textContent()) ?? "";
  const shown = parse(label.trim(), "MMMM yyyy", new Date());
  const diff = differenceInCalendarMonths(target, shown);
  const years = Math.trunc(diff / 12);
  const months = diff % 12;
  const clickTimes = async (selector: string, times: number) => {
    for (let i = 0; i < times; i++) await page.locator(selector).first().click();
  };
  await clickTimes(
    years < 0 ? ".react-calendar__navigation__prev2-button" : ".react-calendar__navigation__next2-button",
    Math.abs(years),
  );
  await clickTimes(
    months < 0 ? ".react-calendar__navigation__prev-button" : ".react-calendar__navigation__next-button",
    Math.abs(months),
  );
};

const clickDay = async (page: Page, date: Date) => {
  await showMonthOf(page, date);
  await page
    .locator(`.react-calendar__month-view__days__day abbr[aria-label="${format(date, "MMMM d, yyyy")}"]`)
    .first()
    .click();
};

/** Open the date filter and choose a start and end day (like `cy.pickDateRange`). */
export const pickDateRange = async (page: Page, start: Date, end: Date) => {
  await bySelLike(page, "filter-date-range-button").first().click({ force: true });
  await expect(calendar(page)).toBeVisible();
  await clickDay(page, start);
  await clickDay(page, end);
  await expect(calendar(page)).toHaveCount(0);
};

export const clearDateRange = async (page: Page) => {
  await bySelLike(page, "filter-date-clear-button").first().click({ force: true });
  await expect(bySelLike(page, "filter-date-range-button").first()).toContainText("ALL");
};

/** Drive one slider thumb to `target` (0–100) with the keyboard. */
const moveThumb = async (page: Page, index: number, target: number) => {
  const thumb = bySel(page, "transaction-list-filter-amount-range-slider").locator('input[type="range"]').nth(index);
  const current = Number(await thumb.getAttribute("aria-valuenow"));
  const key = target > current ? "ArrowRight" : "ArrowLeft";
  await thumb.focus();
  for (let i = 0; i < Math.abs(target - current); i++) await thumb.press(key);
};

/**
 * Open the amount filter and set a dollar range (like `cy.setTransactionAmountRange`).
 * The slider runs 0–100 and maps to $0–$1,000 in $10 steps.
 */
export const setAmountRange = async (page: Page, minDollars: number, maxDollars: number) => {
  await bySel(page, "transaction-list-filter-amount-range-button").scrollIntoViewIfNeeded();
  await bySel(page, "transaction-list-filter-amount-range-button").click({ force: true });
  await expect(bySel(page, "transaction-list-filter-amount-range-slider")).toBeVisible();
  await moveThumb(page, 1, maxDollars / 10);
  await moveThumb(page, 0, minDollars / 10);
};

/** Amount filter request whose query carries the given cent bounds. */
export const amountQuery = (minCents: number, maxCents: number) => (params: URLSearchParams) =>
  params.get("amountMin") === `${minCents}` && params.get("amountMax") === `${maxCents}`;

export const withoutFilters = (params: URLSearchParams) => !params.has("amountMin") && !params.has("dateRangeStart");
