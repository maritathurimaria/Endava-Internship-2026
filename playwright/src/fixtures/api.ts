import type { User } from "@models";
import { login } from "@api/auth";
import { bodyOrThrow } from "@api/http";
import { test as base } from "./index";

/**
 * API-suite fixtures: `users` (seeded users, in seed order) and `me`
 * (users[0], logged in on the `api` context before every test), mirroring the
 * `beforeEach` of every Cypress API spec.
 */
type ApiFixtures = {
  users: User[];
  me: User;
};

export const test = base.extend<ApiFixtures>({
  users: async ({ db }, use) => {
    await use(await db.filter("users"));
  },

  // Auto: every API test starts authenticated as users[0], as in the Cypress specs.
  me: [
    async ({ api, users }, use) => {
      const [first] = users;
      bodyOrThrow(await login(api, first.username));
      await use(first);
    },
    { auto: true },
  ],
});

export { expect } from "./index";
