import { expect, type Page } from "@playwright/test";
import { env } from "@config";
import { bySel, bySelLike } from "./selectors";

/**
 * The app attaches its XState services (authService, createTransactionService,
 * the feed services) to `window` when `window.Cypress` is truthy. Setting the flag
 * before the app boots gives Playwright the same programmatic hooks the Cypress
 * suite uses for fast login and data setup.
 */
export const exposeAppServices = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { Cypress: boolean }).Cypress = true;
  });

/** Send an event to one of the app's exposed XState services. */
export const sendToService = (page: Page, service: string, event: string, payload?: unknown) =>
  page.evaluate(
    ([svc, evt, data]) => {
      const target = (window as unknown as Record<string, { send: (e: string, p?: unknown) => void }>)[svc as string];
      if (!target) throw new Error(`window.${svc} is not exposed on this page`);
      target.send(evt as string, data);
    },
    [service, event, payload] as const,
  );

export const waitForService = (page: Page, service: string) =>
  page.waitForFunction((svc) => Boolean((window as unknown as Record<string, unknown>)[svc]), service);

export const isMobile = (page: Page): boolean =>
  (page.viewportSize()?.width ?? 1280) < env.mobileViewportWidthBreakpoint;

export const pathnameOf = (page: Page): string => new URL(page.url()).pathname;

/** Wait for list skeleton loaders to disappear. */
export const waitForListLoaded = (page: Page) => expect(bySel(page, "list-skeleton")).toHaveCount(0);

/** Visible success/error snackbar. */
export const alertBar = (page: Page, severity: "success" | "error" | "info" | "warning" = "success") =>
  bySel(page, `alert-bar-${severity}`);

/** Transaction rows in the current feed. */
export const transactionItems = (page: Page) => bySelLike(page, "transaction-item");
