/** Small functional helpers used across the framework. Pure, dependency-free. */

/** Left-to-right function composition. */
export const pipe =
  <T>(...fns: Array<(value: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

/** Lodash-style `matches`: true when `item` has every key/value in `partial`. */
export const matches =
  <T extends object>(partial: Partial<T> = {}) =>
  (item: T): boolean =>
    Object.entries(partial).every(([key, value]) => (item as Record<string, unknown>)[key] === value);

/** Pick a subset of keys into a new object. */
export const pick = <T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> =>
  keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>);

/** Set intersection preserving the order of `a`. */
export const intersection = <T>(a: readonly T[], b: readonly T[]): T[] => a.filter((x) => b.includes(x));

/** Integer range [start, end). */
export const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(end - start, 0) }, (_, i) => start + i);

/** Run async steps one after another (no parallelism), returning all results. */
export const sequence = async <T>(steps: ReadonlyArray<() => Promise<T>>): Promise<T[]> =>
  steps.reduce<Promise<T[]>>(async (acc, step) => [...(await acc), await step()], Promise.resolve([]));
