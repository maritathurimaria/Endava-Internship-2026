import { expect, type Page } from "@playwright/test";
import { bySel } from "./selectors";
import { isMobile } from "./app";

export type SideNavItem = "home" | "user-settings" | "bankaccounts" | "notifications" | "signout";

const drawerOpen = (page: Page) => bySel(page, "sidenav-home").isVisible();

/** On mobile the side nav is a drawer that must be opened first. Idempotent; no-op on desktop. */
export const openSideNavOnMobile = async (page: Page) => {
  if (!isMobile(page) || (await drawerOpen(page))) return;
  await bySel(page, "sidenav-toggle").click();
  await expect(bySel(page, "sidenav-home")).toBeVisible();
};

/**
 * Close the mobile drawer by clicking its backdrop. Idempotent; no-op on desktop.
 * Clicks the backdrop's right edge: on a 375px viewport its centre sits under the drawer panel.
 */
export const closeSideNavOnMobile = async (page: Page) => {
  if (!isMobile(page) || !(await drawerOpen(page))) return;
  const backdrop = await page.locator(".MuiBackdrop-root").first().boundingBox();
  if (!backdrop) throw new Error("Mobile drawer backdrop not found");
  await page.mouse.click(backdrop.x + backdrop.width - 10, backdrop.y + backdrop.height / 2);
  await expect(bySel(page, "sidenav-home")).toBeHidden();
};

export const goToSideNav = async (page: Page, item: SideNavItem) => {
  await openSideNavOnMobile(page);
  await bySel(page, `sidenav-${item}`).click();
};

export const signOut = async (page: Page) => {
  await goToSideNav(page, "signout");
  await expect(page).toHaveURL(/\/signin$/);
};

/** Read something from the side nav (balance, name…) regardless of viewport. */
export const withSideNav = async <T>(page: Page, read: () => Promise<T>): Promise<T> => {
  await openSideNavOnMobile(page);
  const value = await read();
  await closeSideNavOnMobile(page);
  return value;
};
