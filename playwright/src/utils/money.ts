/** Money helpers. The API stores amounts in cents; the UI renders USD. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 12345 -> "$123.45" (same output as the app's dinero.js formatting). */
export const formatCents = (cents: number): string => usd.format(cents / 100);

export const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);

/** Random whole-dollar amount, as the Cypress suite uses `parseInt(faker.finance.amount())`. */
export const randomAmount = (min = 1, max = 1000): number => Math.floor(Math.random() * (max - min + 1)) + min;
