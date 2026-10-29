import type { Page, Response, Route } from "@playwright/test";
import { env } from "@config";

/**
 * Network helpers: the Playwright counterpart of `cy.intercept(...).as()` + `cy.wait("@alias")`.
 * Start the wait *before* triggering the action, then await it:
 *
 *   const created = waitForApi(page, { method: "POST", path: "/transactions" });
 *   await submit.click();
 *   const res = await created;
 */

const apiOrigin = new URL(env.apiURL).origin;

export interface ApiMatcher {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Exact pathname (e.g. "/transactions") or a pattern tested against the pathname. */
  path: string | RegExp;
  /** For POST /graphql: the request's `operationName`. */
  graphqlOperation?: string;
  /** Extra condition on the query string. */
  query?: (params: URLSearchParams) => boolean;
}

const graphqlOperationOf = (postData: string | null): string | undefined => {
  try {
    return postData ? (JSON.parse(postData).operationName as string | undefined) : undefined;
  } catch {
    return undefined;
  }
};

/** Predicate over a request's method/url/body, shared by response waits and routes. */
export const matchesRequest =
  (matcher: ApiMatcher) =>
  (method: string, rawUrl: string, postData: string | null): boolean => {
    const url = new URL(rawUrl);
    if (url.origin !== apiOrigin) return false;
    if (matcher.method && matcher.method !== method) return false;
    const pathOk = typeof matcher.path === "string" ? url.pathname === matcher.path : matcher.path.test(url.pathname);
    if (!pathOk) return false;
    if (matcher.query && !matcher.query(url.searchParams)) return false;
    if (matcher.graphqlOperation && graphqlOperationOf(postData) !== matcher.graphqlOperation) return false;
    return true;
  };

export const isApiResponse =
  (matcher: ApiMatcher) =>
  (response: Response): boolean =>
    response.request().method() !== "OPTIONS" &&
    matchesRequest(matcher)(response.request().method(), response.url(), response.request().postData());

/** Resolve with the next API response that matches. */
export const waitForApi = (page: Page, matcher: ApiMatcher): Promise<Response> =>
  page.waitForResponse(isApiResponse(matcher));

/** Wait for a response and return its parsed JSON body. */
export const waitForApiJson = async <T = any>(page: Page, matcher: ApiMatcher): Promise<T> =>
  (await waitForApi(page, matcher)).json() as Promise<T>;

/** Collect every matching response from now on (call the returned function to read them). */
export const recordApi = (page: Page, matcher: ApiMatcher) => {
  const seen: Response[] = [];
  const listener = (res: Response) => {
    if (isApiResponse(matcher)(res)) seen.push(res);
  };
  page.on("response", listener);
  return Object.freeze({
    responses: () => [...seen],
    stop: () => page.off("response", listener),
  });
};

/** Replace a matching API response with a static JSON body (like `cy.intercept(..., { fixture })`). */
export const stubApi = (page: Page, matcher: ApiMatcher, body: unknown, status = 200) =>
  page.route(
    (url) => url.origin === apiOrigin,
    async (route: Route) => {
      const req = route.request();
      if (req.method() === "OPTIONS" || !matchesRequest(matcher)(req.method(), req.url(), req.postData())) {
        return route.fallback();
      }
      return route.fulfill({
        status,
        json: body,
        headers: {
          "access-control-allow-origin": env.baseURL,
          "access-control-allow-credentials": "true",
        },
      });
    },
  );

/** Let a matching request hit the server, then transform its JSON before the app sees it. */
export const transformApi = <T = any>(page: Page, matcher: ApiMatcher, transform: (body: T) => T) =>
  page.route(
    (url) => url.origin === apiOrigin,
    async (route: Route) => {
      const req = route.request();
      if (req.method() === "OPTIONS" || !matchesRequest(matcher)(req.method(), req.url(), req.postData())) {
        return route.fallback();
      }
      const response = await route.fetch();
      return route.fulfill({ response, json: transform((await response.json()) as T) });
    },
  );
