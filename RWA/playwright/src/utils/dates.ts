import { addDays, endOfDay, isWithinInterval, startOfDay } from "date-fns";

/**
 * Date helpers. playwright.config.ts pins both Node and the browser to UTC, so
 * "local" date maths here matches what the app (which formats in UTC) sends to the API.
 */

/** The two-day window the Cypress suite uses: [day of `iso` 00:00, next day 23:59:59.999]. */
export const twoDayWindowFrom = (iso: string) => {
  const start = startOfDay(new Date(iso));
  return { start, end: endOfDay(addDays(start, 1)) };
};

export const isWithin = (iso: string, window: { start: Date; end: Date }): boolean =>
  isWithinInterval(new Date(iso), window);

export { addDays, endOfDay, startOfDay };
