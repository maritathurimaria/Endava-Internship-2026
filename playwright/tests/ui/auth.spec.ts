import { test, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  textbox,
  helperText,
  loginViaForm,
  signUpViaForm,
  openSignUp,
  signOut,
  waitForApi,
  waitForListLoaded,
  typeThenClear,
  fillAndBlur,
} from "@ui";
import { env } from "@config";

test.describe("User Sign-up and Login", () => {
  test("should redirect unauthenticated user to signin page", async ({ page }) => {
    await page.goto("/personal");
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("should redirect to the home page after login", async ({ page, users }) => {
    await loginViaForm(page, users[0].username, env.defaultPassword, { rememberUser: true });
    await expect(page).toHaveURL(new RegExp(`^${env.baseURL}/?$`));
  });

  test("should remember a user for 30 days after login", async ({ page, users }) => {
    await loginViaForm(page, users[0].username, env.defaultPassword, { rememberUser: true });
    await expect(page).toHaveURL(new RegExp(`^${env.baseURL}/?$`));

    const sessionCookie = (await page.context().cookies()).find((c) => c.name === "connect.sid");
    expect(sessionCookie, "session cookie is set").toBeDefined();
    // A persistent cookie has a real expiry (session cookies report -1).
    const days = (sessionCookie!.expires - Date.now() / 1000) / 86_400;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);

    await signOut(page);
  });

  test("should allow a visitor to sign-up, login, and logout", async ({ page }) => {
    const userInfo = { firstName: "Bob", lastName: "Ross", username: "PainterJoy90", password: "s3cret" };

    await page.goto("/");
    await openSignUp(page);
    await expect(bySel(page, "signup-title")).toBeVisible();
    await expect(bySel(page, "signup-title")).toContainText("Sign Up");

    const signup = await signUpViaForm(page, userInfo);
    expect(signup.status()).toBe(201);

    await loginViaForm(page, userInfo.username, userInfo.password);

    // Onboarding
    await expect(bySel(page, "user-onboarding-dialog")).toBeVisible();
    await waitForListLoaded(page);
    await expect(bySel(page, "nav-top-notifications-count")).toBeAttached();
    await bySel(page, "user-onboarding-next").click();

    await expect(bySel(page, "user-onboarding-dialog-title")).toContainText("Create Bank Account");
    await textbox(page, "bankName-input").fill("The Best Bank");
    await textbox(page, "accountNumber-input").fill("123456789");
    await textbox(page, "routingNumber-input").fill("987654321");

    const created = waitForApi(page, { method: "POST", path: "/graphql", graphqlOperation: "CreateBankAccount" });
    await bySelLike(page, "submit").click();
    expect((await created).status()).toBe(200);

    await expect(bySel(page, "user-onboarding-dialog-title")).toContainText("Finished");
    await expect(bySel(page, "user-onboarding-dialog-content")).toContainText("You're all set!");
    await bySel(page, "user-onboarding-next").click();

    await expect(bySel(page, "transaction-list")).toBeVisible();

    await signOut(page);
  });

  test("should display login errors", async ({ page }) => {
    await page.goto("/");

    await typeThenClear(textbox(page, "signin-username"), "User");
    await expect(helperText(page, "username")).toBeVisible();
    await expect(helperText(page, "username")).toContainText("Username is required");

    await fillAndBlur(textbox(page, "signin-password"), "abc");
    await expect(helperText(page, "password")).toContainText("Password must contain at least 4 characters");

    await expect(bySel(page, "signin-submit")).toBeDisabled();
  });

  test("should display signup errors", async ({ page }) => {
    await page.goto("/signup");

    const required: Array<[field: string, inputId: string, message: string]> = [
      ["signup-first-name", "firstName", "First Name is required"],
      ["signup-last-name", "lastName", "Last Name is required"],
      ["signup-username", "username", "Username is required"],
      ["signup-password", "password", "Enter your password"],
    ];
    for (const [field, inputId, message] of required) {
      await typeThenClear(textbox(page, field), "value");
      await expect(helperText(page, inputId)).toBeVisible();
      await expect(helperText(page, inputId)).toContainText(message);
    }

    await fillAndBlur(textbox(page, "signup-confirmPassword"), "DIFFERENT PASSWORD");
    await expect(helperText(page, "confirmPassword")).toContainText("Password does not match");

    await expect(bySel(page, "signup-submit")).toBeDisabled();
  });

  test("should error for an invalid user", async ({ page }) => {
    const login = await loginViaForm(page, "invalidUserName", "invalidPa$$word");
    expect(login.status()).toBe(401);
    await expect(bySel(page, "signin-error")).toBeVisible();
    await expect(bySel(page, "signin-error")).toHaveText("Username or password is invalid");
  });

  test("should error for an invalid password for existing user", async ({ page, users }) => {
    await loginViaForm(page, users[0].username, "INVALID");
    await expect(bySel(page, "signin-error")).toBeVisible();
    await expect(bySel(page, "signin-error")).toHaveText("Username or password is invalid");
  });
});
