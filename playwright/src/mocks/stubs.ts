import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page, Route } from "@playwright/test";
import type { BankAccount, NotificationResponseItem, PageData, TransactionResponseItem } from "@models";
import { env } from "@config";
import { matchesRequest, stubApi, transformApi, type ApiMatcher } from "@ui/network";
import { feedMatcher, type FeedName } from "@ui/transactions";
import { buildPage, emptyPage } from "./factories";

/**
 * Scenario stubs for UI tests, built on `stubApi` / `transformApi`.
 * Every helper takes `page` first and must be called BEFORE the navigation or action
 * that triggers the request. Stubs answer CORS for the app origin, like `stubApi`.
 *
 *   await stubEmptyFeed(page, "public");
 *   await loginByXstate(page, user.username);
 *   await expect(bySel(page, "empty-list-header")).toContainText("No Transactions");
 */

export const notificationsMatcher: ApiMatcher = Object.freeze({ method: "GET", path: "/notifications" });
export const listBankAccountsMatcher: ApiMatcher = Object.freeze({
  method: "POST",
  path: "/graphql",
  graphqlOperation: "ListBankAccount",
});

// ---- ready-made states ------------------------------------------------------------------------

/** A feed (`public` | `contacts` | `personal`) answers `{ pageData, results: [] }`. */
export const stubEmptyFeed = (page: Page, feed: FeedName) => stubApi(page, feedMatcher(feed), emptyPage());

/** A feed answers with the given items (e.g. from `buildList(buildTransactionResponseItem, 3)`). */
export const stubFeed = (
  page: Page,
  feed: FeedName,
  items: ReadonlyArray<TransactionResponseItem>,
  pageData: Partial<PageData> = {},
) => stubApi(page, feedMatcher(feed), buildPage(items, pageData));

/** Any matching request fails with `status` (default 500) and a JSON error body. */
export const stubServerError = (
  page: Page,
  matcher: ApiMatcher,
  status = 500,
  body: unknown = { error: "Internal Server Error" },
) => stubApi(page, matcher, body, status);

/** `GET /notifications` answers `{ results: items }` (use `[]` for the empty state). */
export const stubNotifications = (page: Page, items: ReadonlyArray<NotificationResponseItem>) =>
  stubApi(page, notificationsMatcher, { results: items });

/** GraphQL `ListBankAccount` returns `accounts`; the real request still runs (auth stays real). */
export const stubBankAccounts = (page: Page, accounts: ReadonlyArray<BankAccount>) =>
  transformApi<{ data: { listBankAccount: BankAccount[] } }>(page, listBankAccountsMatcher, (body) => ({
    ...body,
    data: { ...body.data, listBankAccount: [...accounts] },
  }));

/**
 * Delay matching requests by `ms`, then let them continue — to the network, or to a stub
 * registered earlier (Playwright runs the most recently registered route first).
 */
export const stubLatency = (page: Page, matcher: ApiMatcher, ms: number) =>
  routeMatching(page, matcher, async (route) => {
    await delay(ms);
    return route.fallback();
  });

// ---- scenarios (shared with the mock server) --------------------------------------------------

export interface StubSpec {
  readonly matcher: ApiMatcher;
  readonly status?: number;
  /** Omit to let the request through (after `delayMs`) instead of fulfilling it. */
  readonly body?: unknown;
  readonly delayMs?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface MockScenario {
  readonly name: string;
  readonly description?: string;
  readonly stubs: ReadonlyArray<StubSpec>;
}

/** Register one stub spec (fulfil with body/status, or delay-then-continue when there is no body). */
export const applyStub = (page: Page, spec: StubSpec) =>
  routeMatching(page, spec.matcher, async (route) => {
    if (spec.delayMs) await delay(spec.delayMs);
    if (spec.body === undefined) return route.fallback();
    return route.fulfill({
      status: spec.status ?? 200,
      json: spec.body,
      headers: { ...corsHeaders, ...spec.headers },
    });
  });

/** Register every stub of a scenario. */
export const applyScenario = async (page: Page, scenario: MockScenario) => {
  for (const spec of scenario.stubs) await applyStub(page, spec);
};

const SCENARIO_DIR = resolve(__dirname, "..", "..", "..", "tap26", "mocks", "scenarios");

interface ScenarioFileRoute {
  method?: string;
  path: string;
  status?: number;
  body?: unknown;
  delayMs?: number;
  headers?: Record<string, string>;
  operationName?: string;
}

/** "/users/{userId}" → /^\/users\/[^/]+\/?$/ (plain paths stay exact strings). */
const pathMatcher = (template: string): string | RegExp =>
  template.includes("{")
    ? new RegExp(`^${template.split(/\{[^}]+\}/).map((part) => part.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join("[^/]+")}/?$`)
    : template;

/**
 * Load a mock-server scenario (`tap26/mocks/scenarios/<name>.json`) as Playwright stubs, so the
 * same named state works against the mock server and in route-stubbed UI tests.
 * Routes without a `body` become latency-only stubs (the real API still answers).
 */
export const loadScenario = (name: string): MockScenario => {
  const file = resolve(SCENARIO_DIR, `${name}.json`);
  const raw = JSON.parse(readFileSync(file, "utf8")) as { name?: string; description?: string; routes: ScenarioFileRoute[] };
  return Object.freeze({
    name: raw.name ?? name,
    description: raw.description,
    stubs: raw.routes.map((r) =>
      Object.freeze({
        matcher: Object.freeze({
          method: r.method && r.method !== "*" ? (r.method.toUpperCase() as ApiMatcher["method"]) : undefined,
          path: pathMatcher(r.path),
          graphqlOperation: r.operationName,
        }),
        status: r.status,
        body: r.body,
        delayMs: r.delayMs,
        headers: r.headers,
      }),
    ),
  });
};

/** Partially applied: `const newUser = withScenario("new-user-onboarding"); await newUser(page);` */
export const withScenario = (name: string) => (page: Page) => applyScenario(page, loadScenario(name));

// ---- internals --------------------------------------------------------------------------------

const apiOrigin = new URL(env.apiURL).origin;
const corsHeaders = Object.freeze({
  "access-control-allow-origin": env.baseURL,
  "access-control-allow-credentials": "true",
});

const delay = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** `page.route` on the API origin that only handles requests the matcher accepts (and never preflights). */
const routeMatching = (page: Page, matcher: ApiMatcher, handle: (route: Route) => Promise<void>) =>
  page.route(
    (url) => url.origin === apiOrigin,
    async (route: Route) => {
      const req = route.request();
      if (req.method() === "OPTIONS" || !matchesRequest(matcher)(req.method(), req.url(), req.postData())) {
        return route.fallback();
      }
      return handle(route);
    },
  );
