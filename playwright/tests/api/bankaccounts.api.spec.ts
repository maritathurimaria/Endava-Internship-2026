import { faker } from "@faker-js/faker";
import { test as base, expect } from "@fixtures/api";
import { bankAccounts } from "@api";
import type { BankAccount } from "@models";

const newAccount = () => ({
  bankName: `${faker.company.name()} Bank`,
  accountNumber: faker.finance.accountNumber(10),
  routingNumber: faker.finance.accountNumber(9),
});

const test = base.extend<{ seededAccounts: BankAccount[] }>({
  seededAccounts: async ({ db }, use) => use(await db.filter("bankaccounts")),
});

test.describe("Bank Accounts API", () => {
  test.describe("GET /bankAccounts", () => {
    test("gets a list of bank accounts for user", async ({ api, me }) => {
      const res = await bankAccounts.listBankAccounts(api);
      expect(res.status).toBe(200);
      expect(res.body.results[0].userId).toBe(me.id);
    });
  });

  test.describe("GET /bankAccounts/:bankAccountId", () => {
    test("gets a bank account", async ({ api, me, seededAccounts }) => {
      const res = await bankAccounts.getBankAccount(api, seededAccounts[0].id);
      expect(res.status).toBe(200);
      expect(res.body.account.userId).toBe(me.id);
    });
  });

  test.describe("POST /bankAccounts", () => {
    test("creates a new bank account", async ({ api, me }) => {
      const res = await bankAccounts.createBankAccount(api, newAccount());
      expect(res.status).toBe(200);
      expect(typeof res.body.account.id).toBe("string");
      expect(res.body.account.userId).toBe(me.id);
    });
  });

  test.describe("DELETE /bankAccounts/:bankAccountId", () => {
    test("deletes a bank account", async ({ api, seededAccounts }) => {
      const res = await bankAccounts.deleteBankAccount(api, seededAccounts[0].id);
      expect(res.status).toBe(200);
    });
  });

  test.describe("/graphql", () => {
    test("gets a list of bank accounts for user", async ({ api, me }) => {
      const res = await bankAccounts.gqlListBankAccounts(api);
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.listBankAccount[0].userId).toBe(me.id);
    });

    test("creates a new bank account", async ({ api, me }) => {
      const res = await bankAccounts.gqlCreateBankAccount(api, newAccount());
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.createBankAccount.userId).toBe(me.id);
    });

    test("deletes a bank account", async ({ api, seededAccounts }) => {
      const res = await bankAccounts.gqlDeleteBankAccount(api, seededAccounts[0].id);
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
    });
  });
});
