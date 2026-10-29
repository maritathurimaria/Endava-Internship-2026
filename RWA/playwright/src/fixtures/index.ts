import { test as base, expect } from "@playwright/test";
import { env } from "@config";
import { dbFor, seedDatabase, type Db } from "@api/testData";
import type { Http } from "@api/http";
import { exposeAppServices } from "@ui/app";

/**
 * Shared fixtures. Fixtures are plain async functions (setup → use → teardown),
 * so tests receive ready-made values instead of building them in mutable hooks.
 *
 *  - `api`  a standalone API request context with its own cookie jar
 *  - `seed` (auto) resets the database before every test, like `cy.task("db:seed")`
 *  - `db`   test-data helpers (`filter`, `find`, `all`) bound to `api`
 *  - `page` the app page with its XState services exposed for programmatic steps
 */
type Fixtures = {
  api: Http;
  seed: void;
  db: Db;
};

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: env.apiURL });
    await use(context);
    await context.dispose();
  },

  seed: [
    async ({ api }, use) => {
      await seedDatabase(api);
      await use();
    },
    { auto: true },
  ],

  // Depends on `seed` so data is always read after the reset.
  db: async ({ api, seed }, use) => {
    void seed;
    await use(dbFor(api));
  },

  page: async ({ page }, use) => {
    await exposeAppServices(page);
    await use(page);
  },
});

export { expect };
