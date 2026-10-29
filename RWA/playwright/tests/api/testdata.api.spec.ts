import { test, expect } from "@fixtures/api";
import { get, endpoints, auth } from "@api";
import type { Entity } from "@models";

const entities: Entity[] = [
  "users",
  "contacts",
  "bankaccounts",
  "notifications",
  "transactions",
  "likes",
  "comments",
  "banktransfers",
];

test.describe("Test Data API", () => {
  for (const entity of entities) {
    test(`GET /testData/${entity} returns seeded data`, async ({ api }) => {
      const res = await get<{ results: unknown[] }>(api, endpoints.testData(entity));
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(1);
    });
  }

  test("GET /testData/:entity rejects an unknown entity", async ({ api }) => {
    const res = await get(api, endpoints.testData("not-an-entity"));
    expect(res.status).toBe(422);
  });
});

test.describe("Auth API", () => {
  test("GET /checkAuth returns the logged-in user", async ({ api, me }) => {
    const res = await auth.checkAuth(api);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(me.id);
  });

  test("POST /logout ends the session", async ({ api }) => {
    expect((await auth.logout(api)).status).toBeLessThan(400);
    expect((await auth.checkAuth(api)).status).toBe(401);
  });
});
