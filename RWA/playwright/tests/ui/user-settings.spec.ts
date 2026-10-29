import { test as base, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  textbox,
  helperText,
  goToSideNav,
  loginByXstate,
  openSideNavOnMobile,
  waitForApi,
  typeThenClear,
  fillAndBlur,
} from "@ui";

/** Every test starts on the User Settings page, logged in as the first seeded user. */
const test = base.extend<{ settingsPage: void }>({
  settingsPage: [
    async ({ page, users }, use) => {
      await loginByXstate(page, users[0].username);
      await goToSideNav(page, "user-settings");
      await use();
    },
    { auto: true },
  ],
});

const input = (page: Parameters<typeof textbox>[0], name: string) => textbox(page, `${name}-input`);
const helper = (page: Parameters<typeof helperText>[0], name: string) =>
  helperText(page, `user-settings-${name}-input`);

test.describe("User Settings", () => {
  test("renders the user settings form", async ({ page }) => {
    await expect(bySel(page, "user-settings-form")).toBeVisible();
    await expect(page).toHaveURL(/\/user\/settings/);
  });

  test("should display user setting form errors", async ({ page }) => {
    for (const name of ["first", "last"]) {
      await typeThenClear(input(page, `${name}Name`), "Abc");
      await expect(helper(page, `${name}Name`)).toBeVisible();
      await expect(helper(page, `${name}Name`)).toContainText(`Enter a ${name} name`);
    }

    await typeThenClear(input(page, "email"), "abc");
    await expect(helper(page, "email")).toContainText("Enter an email address");
    await fillAndBlur(input(page, "email"), "abc@bob.");
    await expect(helper(page, "email")).toContainText("Must contain a valid email address");

    await typeThenClear(input(page, "phoneNumber"), "abc");
    await expect(helper(page, "phoneNumber")).toContainText("Enter a phone number");
    await fillAndBlur(input(page, "phoneNumber"), "615-555-");
    await expect(helper(page, "phoneNumber")).toContainText("Phone number is not valid");

    await expect(bySelLike(page, "submit")).toBeDisabled();
  });

  test("updates first name, last name, email and phone number", async ({ page }) => {
    await input(page, "firstName").fill("New First Name");
    await input(page, "lastName").fill("New Last Name");
    await input(page, "email").fill("email@email.com");
    await fillAndBlur(input(page, "phoneNumber"), "6155551212");

    await expect(bySelLike(page, "submit")).toBeEnabled();
    const updated = waitForApi(page, { method: "PATCH", path: /^\/users\/[^/]+$/ });
    await bySelLike(page, "submit").click();
    expect((await updated).status()).toBe(204);

    await openSideNavOnMobile(page);
    await expect(bySel(page, "sidenav-user-full-name")).toContainText("New First Name");
  });
});
