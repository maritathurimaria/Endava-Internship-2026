import { test as base, expect } from "@fixtures/ui";
import {
  bySel,
  bySelLike,
  textbox,
  helperText,
  goToSideNav,
  loginByXstate,
  waitForApi,
  transformApi,
  typeThenClear,
  fillAndBlur,
  touch,
} from "@ui";
import type { User } from "@models";

const listBankAccounts = { method: "POST", path: "/graphql", graphqlOperation: "ListBankAccount" } as const;

/** Every test starts logged in as the first seeded user. */
const test = base.extend<{ user: User }>({
  user: [
    async ({ page, users }, use) => {
      await loginByXstate(page, users[0].username);
      await use(users[0]);
    },
    { auto: true },
  ],
});

const field = (page: Parameters<typeof textbox>[0], name: string) => textbox(page, `${name}-input`);
const fieldHelper = (page: Parameters<typeof helperText>[0], name: string) =>
  helperText(page, `bankaccount-${name}-input`);

test.describe("Bank Accounts", () => {
  test("creates a new bank account", async ({ page }) => {
    await goToSideNav(page, "bankaccounts");
    await bySel(page, "bankaccount-new").click();
    await expect(page).toHaveURL(/\/bankaccounts\/new$/);

    await field(page, "bankName").fill("The Best Bank");
    await field(page, "routingNumber").fill("987654321");
    await field(page, "accountNumber").fill("123456789");

    const created = waitForApi(page, { method: "POST", path: "/graphql", graphqlOperation: "CreateBankAccount" });
    await bySelLike(page, "submit").click();
    await created;

    const items = bySelLike(page, "bankaccount-list-item");
    await expect(items).toHaveCount(2);
    await expect(items.nth(1)).toContainText("The Best Bank");
  });

  test("should display bank account form errors", async ({ page }) => {
    await page.goto("/bankaccounts");
    await bySel(page, "bankaccount-new").click();

    // Bank name
    await typeThenClear(field(page, "bankName"), "The");
    await expect(fieldHelper(page, "bankName")).toContainText("Enter a bank name");
    await fillAndBlur(field(page, "bankName"), "The");
    await expect(fieldHelper(page, "bankName")).toContainText("Must contain at least 5 characters");

    // Routing number: required, exactly 9 digits
    await touch(field(page, "routingNumber"));
    await expect(fieldHelper(page, "routingNumber")).toContainText("Enter a valid bank routing number");
    await fillAndBlur(field(page, "routingNumber"), "12345678");
    await expect(fieldHelper(page, "routingNumber")).toContainText("Must contain a valid routing number");
    await fillAndBlur(field(page, "routingNumber"), "123456789");
    await expect(fieldHelper(page, "routingNumber")).toHaveCount(0);

    // Account number: required, 9–12 digits
    await touch(field(page, "accountNumber"));
    await expect(fieldHelper(page, "accountNumber")).toContainText("Enter a valid bank account number");
    await fillAndBlur(field(page, "accountNumber"), "12345678");
    await expect(fieldHelper(page, "accountNumber")).toContainText("Must contain at least 9 digits");
    await fillAndBlur(field(page, "accountNumber"), "123456789");
    await expect(fieldHelper(page, "accountNumber")).toHaveCount(0);
    await fillAndBlur(field(page, "accountNumber"), "123456789111");
    await expect(fieldHelper(page, "accountNumber")).toHaveCount(0);
    await fillAndBlur(field(page, "accountNumber"), "1234567891111");
    await expect(fieldHelper(page, "accountNumber")).toContainText("Must contain no more than 12 digits");

    await expect(bySel(page, "bankaccount-submit")).toBeDisabled();
  });

  test("soft deletes a bank account", async ({ page }) => {
    await page.goto("/bankaccounts");
    const deleted = waitForApi(page, { method: "POST", path: "/graphql", graphqlOperation: "DeleteBankAccount" });
    await bySelLike(page, "delete").first().click();
    await deleted;
    await expect(bySelLike(page, "list-item").first()).toContainText("Deleted");
  });

  // Same TODO as upstream: the onboarding assertion can go once users get an "onboarded" flag.
  test("renders an empty bank account list state with onboarding modal", async ({ page }) => {
    await transformApi<{ data: { listBankAccount: unknown[] } }>(page, listBankAccounts, (body) => ({
      ...body,
      data: { ...body.data, listBankAccount: [] },
    }));

    const listed = waitForApi(page, listBankAccounts);
    await page.goto("/bankaccounts");
    await listed;

    await expect(bySel(page, "bankaccount-list")).toHaveCount(0);
    await expect(bySel(page, "empty-list-header")).toContainText("No Bank Accounts");
    await expect(bySel(page, "user-onboarding-dialog")).toBeVisible();
    await expect(bySel(page, "nav-top-notifications-count")).toBeAttached();
  });
});
