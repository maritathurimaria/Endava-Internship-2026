import type { DbSchema, Entity } from "@models";
import { matches } from "@utils/fp";
import { bodyOrThrow, get, post, type Http } from "./http";
import { endpoints } from "./endpoints";

/**
 * Test-data access, equivalent to the Cypress `db:seed` task and
 * `cy.database("filter" | "find", entity, query)` command.
 */

export const seedDatabase = async (http: Http): Promise<void> => {
  bodyOrThrow(await post(http, endpoints.testDataSeed));
};

export const getAll = async <E extends Entity>(http: Http, entity: E): Promise<DbSchema[E][]> =>
  bodyOrThrow(await get<{ results: DbSchema[E][] }>(http, endpoints.testData(entity))).results;

export const filterEntity = async <E extends Entity>(
  http: Http,
  entity: E,
  query: Partial<DbSchema[E]> = {},
): Promise<DbSchema[E][]> => (await getAll(http, entity)).filter(matches(query));

export const findEntity = async <E extends Entity>(
  http: Http,
  entity: E,
  query: Partial<DbSchema[E]> = {},
): Promise<DbSchema[E]> => {
  const found = (await getAll(http, entity)).find(matches(query));
  if (!found) throw new Error(`No ${entity} matching ${JSON.stringify(query)}`);
  return found;
};

/** Partially apply the data helpers to one request context, for use as a fixture. */
export const dbFor = (http: Http) =>
  Object.freeze({
    seed: () => seedDatabase(http),
    all: <E extends Entity>(entity: E) => getAll(http, entity),
    filter: <E extends Entity>(entity: E, query?: Partial<DbSchema[E]>) => filterEntity(http, entity, query),
    find: <E extends Entity>(entity: E, query?: Partial<DbSchema[E]>) => findEntity(http, entity, query),
  });

export type Db = ReturnType<typeof dbFor>;
