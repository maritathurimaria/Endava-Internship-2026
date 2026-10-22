import { test, expect } from "@fixtures/api";
import { get, type Params } from "@api";
import { loadContract, validateResponse, type HttpMethod } from "@api/contract";
import type { Db } from "@api/testData";
import type { User } from "@models";

/**
 * Contract tests: call the real API as users[0] and validate each response against the
 * OpenAPI response schema (tap26/openapi/openapi.json). The spec documents the API's ACTUAL
 * behaviour (D-005), e.g. user objects include the password hash (KI-07), so the schemas are
 * used as-is. A failure means the API and the spec drifted: fix one of them (contract-guardian).
 */

interface ContractCase {
  readonly method: HttpMethod;
  /** Path template exactly as in the spec. */
  readonly template: string;
  /** Concrete request built from the logged-in user and seeded data. */
  readonly request: (ctx: { me: User; users: User[]; db: Db }) => Promise<{ path: string; params?: Params }>;
  readonly status?: number;
}

const firstOf = async <T>(items: Promise<T[]>, what: string): Promise<T> => {
  const [first] = await items;
  if (!first) throw new Error(`seed has no ${what}`);
  return first;
};

const cases: ReadonlyArray<ContractCase> = [
  { method: "GET", template: "/checkAuth", request: async () => ({ path: "/checkAuth" }) },
  { method: "GET", template: "/users", request: async () => ({ path: "/users" }) },
  { method: "GET", template: "/users/{userId}", request: async ({ me }) => ({ path: `/users/${me.id}` }) },
  {
    method: "GET",
    template: "/users/profile/{username}",
    request: async ({ me }) => ({ path: `/users/profile/${me.username}` }),
  },
  {
    method: "GET",
    template: "/users/search",
    request: async ({ users }) => ({ path: "/users/search", params: { q: users[1].username } }),
  },
  { method: "GET", template: "/transactions", request: async () => ({ path: "/transactions" }) },
  { method: "GET", template: "/transactions/public", request: async () => ({ path: "/transactions/public" }) },
  { method: "GET", template: "/transactions/contacts", request: async () => ({ path: "/transactions/contacts" }) },
  {
    method: "GET",
    template: "/transactions/{transactionId}",
    request: async ({ me, db }) => ({
      path: `/transactions/${(await firstOf(db.filter("transactions", { senderId: me.id }), "transaction")).id}`,
    }),
  },
  { method: "GET", template: "/bankAccounts", request: async () => ({ path: "/bankAccounts" }) },
  {
    method: "GET",
    template: "/bankAccounts/{bankAccountId}",
    request: async ({ me, db }) => ({
      path: `/bankAccounts/${(await firstOf(db.filter("bankaccounts", { userId: me.id }), "bank account")).id}`,
    }),
  },
  { method: "GET", template: "/bankTransfers", request: async () => ({ path: "/bankTransfers" }) },
  {
    method: "GET",
    template: "/contacts/{usernameOrContactId}",
    request: async ({ me }) => ({ path: `/contacts/${me.username}` }),
  },
  { method: "GET", template: "/notifications", request: async () => ({ path: "/notifications" }) },
  {
    method: "GET",
    template: "/likes/{transactionId}",
    request: async ({ db }) => ({ path: `/likes/${(await firstOf(db.all("likes"), "like")).transactionId}` }),
  },
  {
    method: "GET",
    template: "/comments/{transactionId}",
    request: async ({ db }) => ({ path: `/comments/${(await firstOf(db.all("comments"), "comment")).transactionId}` }),
  },
];

const contract = loadContract();

test.describe("API contract (OpenAPI response schemas)", () => {
  for (const { method, template, request, status = 200 } of cases) {
    test(`${method} ${template} → ${status} matches the schema`, async ({ api, me, users, db }) => {
      const { path, params } = await request({ me, users, db });
      const res = await get(api, path, params);

      expect(res.status, `${method} ${path}: ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(status);
      const verdict = validateResponse(contract, method, template, res.status, res.body);
      expect(verdict.errors, verdict.summary).toEqual([]);
    });
  }

  test("GET /checkAuth → 401 without a session matches the schema", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext();
    const res = await get(anonymous, "/checkAuth");
    await anonymous.dispose();

    expect(res.status).toBe(401);
    const verdict = validateResponse(contract, "GET", "/checkAuth", res.status, res.body);
    expect(verdict.errors, verdict.summary).toEqual([]);
  });

  // Negative control: proves the validator really rejects a body that breaks the contract.
  test("the validator reports readable violations for a broken body", () => {
    const broken = { results: [{ id: 42, username: "x", balance: "a lot" }] };
    const verdict = validateResponse(contract, "GET", "/users", 200, broken);

    expect(verdict.valid).toBe(false);
    expect(verdict.summary).toContain("/results/0/id must be string");
    expect(verdict.summary).toContain("/results/0/balance must be integer");
    expect(verdict.summary).toMatch(/must have required property 'firstName'/);
    expect(validateResponse(contract, "GET", "/users", 418, {}).errors[0]).toContain("status 418 is not documented");
  });
});
