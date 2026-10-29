import type { User } from "@models";
import { test as base } from "./index";

/** UI-suite fixtures: `users` are the seeded users in seed order (userA, userB, userC…). */
type UiFixtures = {
  users: User[];
};

export const test = base.extend<UiFixtures>({
  users: async ({ db }, use) => {
    await use(await db.filter("users"));
  },
});

export { expect } from "./index";
