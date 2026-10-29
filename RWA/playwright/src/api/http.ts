import type { APIRequestContext, APIResponse } from "@playwright/test";
import { env } from "@config";

/**
 * Thin functional HTTP layer over Playwright's APIRequestContext.
 * Every call resolves to a plain, immutable snapshot of the response so tests
 * assert on data (`res.status`, `res.body`) instead of driving a client object.
 * Works with any context: the standalone `api` fixture or a page's `page.request`
 * (which shares the browser session cookie).
 */

export type Http = APIRequestContext;
export type Params = Record<string, string | number | boolean>;
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiResult<T> {
  readonly status: number;
  readonly ok: boolean;
  readonly body: T;
  readonly headers: Readonly<Record<string, string>>;
  readonly url: string;
}

export const apiUrl = (path: string): string => `${env.apiURL}${path.startsWith("/") ? path : `/${path}`}`;

const parseBody = async (res: APIResponse): Promise<unknown> => {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const toResult = async <T>(res: APIResponse): Promise<ApiResult<T>> =>
  Object.freeze({
    status: res.status(),
    ok: res.ok(),
    body: (await parseBody(res)) as T,
    headers: res.headers(),
    url: res.url(),
  });

/** Core request function. Never throws on HTTP status: assertions belong in the test. */
export const send = async <T = unknown>(
  http: Http,
  method: Method,
  path: string,
  options: { params?: Params; data?: unknown } = {},
): Promise<ApiResult<T>> =>
  toResult<T>(
    await http.fetch(apiUrl(path), {
      method,
      params: options.params,
      data: options.data,
      failOnStatusCode: false,
    }),
  );

export const get = <T = unknown>(http: Http, path: string, params?: Params) => send<T>(http, "GET", path, { params });
export const post = <T = unknown>(http: Http, path: string, data?: unknown) => send<T>(http, "POST", path, { data });
export const patch = <T = unknown>(http: Http, path: string, data?: unknown) => send<T>(http, "PATCH", path, { data });
export const del = <T = unknown>(http: Http, path: string) => send<T>(http, "DELETE", path);

/** Unwrap a body or fail loudly with the response details. Handy in fixtures and setup code. */
export const bodyOrThrow = <T>(result: ApiResult<T>): T => {
  if (!result.ok) {
    throw new Error(`${result.url} responded ${result.status}: ${JSON.stringify(result.body)}`);
  }
  return result.body;
};

/** Validation errors returned by the API (422 responses carry `{ errors: [...] }`). */
export const errorsOf = (result: ApiResult<unknown>): unknown[] =>
  ((result.body ?? {}) as { errors?: unknown[] }).errors ?? [];
