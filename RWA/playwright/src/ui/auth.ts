import { expect, type Page, type Response } from "@playwright/test";
import { env } from "@config";
import { bySel, bySelLike, textbox } from "./selectors";
import { waitForApi } from "./network";
import { pathnameOf, sendToService, waitForListLoaded, waitForService } from "./app";
import { openSideNavOnMobile, closeSideNavOnMobile } from "./navigation";

export interface SignUpInfo {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

const loginResponse = (page: Page) => waitForApi(page, { method: "POST", path: "/login" });

/** Log in through the sign-in form (like `cy.login`). Resolves with the POST /login response. */
export const loginViaForm = async (
  page: Page,
  username: string,
  password: string,
  { rememberUser = false }: { rememberUser?: boolean } = {},
): Promise<Response> => {
  if (page.url() === "about:blank" || pathnameOf(page) !== "/signin") await page.goto("/signin");
  await textbox(page, "signin-username").fill(username);
  await textbox(page, "signin-password").fill(password);
  if (rememberUser) await bySel(page, "signin-remember-me").locator("input").check();
  const login = loginResponse(page);
  await bySel(page, "signin-submit").click();
  return login;
};

/**
 * Fast programmatic login through the app's own auth state machine (like `cy.loginByXstate`).
 * Skips typing but still exercises the real /login call and app bootstrap.
 */
export const loginByXstate = async (page: Page, username: string, password: string = env.defaultPassword) => {
  await page.goto("/signin");
  await waitForService(page, "authService");
  const login = loginResponse(page);
  await sendToService(page, "authService", "LOGIN", { username, password });
  expect((await login).status(), `login as ${username}`).toBe(200);
  await expect(page).not.toHaveURL(/\/signin$/);
  await waitForListLoaded(page);
};

/** Programmatic logout (like `cy.logoutByXstate`). */
export const logoutByXstate = async (page: Page) => {
  await sendToService(page, "authService", "LOGOUT");
  await expect(page).toHaveURL(/\/signin$/);
};

/** Log out and back in as another user, then wait for their feed (like `cy.switchUserByXstate`). */
export const switchUser = async (page: Page, username: string) => {
  await logoutByXstate(page);
  await loginByXstate(page, username);
  await openSideNavOnMobile(page);
  await expect(bySel(page, "sidenav-username")).toContainText(username);
  await closeSideNavOnMobile(page);
  await waitForListLoaded(page);
  await expect.poll(() => bySelLike(page, "transaction-item").count()).toBeGreaterThan(1);
};

/** Fill and submit the sign-up form. Resolves with the POST /users response. */
export const signUpViaForm = async (page: Page, info: SignUpInfo): Promise<Response> => {
  await textbox(page, "signup-first-name").fill(info.firstName);
  await textbox(page, "signup-last-name").fill(info.lastName);
  await textbox(page, "signup-username").fill(info.username);
  await textbox(page, "signup-password").fill(info.password);
  await textbox(page, "signup-confirmPassword").fill(info.password);
  const signup = waitForApi(page, { method: "POST", path: "/users" });
  await bySel(page, "signup-submit").click();
  return signup;
};

/**
 * Follow the "Sign Up" link from the sign-in page. The username field is autofocused,
 * so the first click blurs it and Formik's "required" message can shift the link
 * mid-click; retrying until the route changes keeps this deterministic.
 */
export const openSignUp = async (page: Page) => {
  await expect(async () => {
    await bySel(page, "signup").click();
    await expect(page).toHaveURL(/\/signup$/, { timeout: 2_000 });
  }).toPass({ timeout: 10_000 });
};
