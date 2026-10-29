import type { BankAccount, BankTransfer } from "@models";
import { del, get, post, type Http } from "./http";
import { endpoints } from "./endpoints";

export type NewBankAccount = Pick<BankAccount, "bankName" | "accountNumber" | "routingNumber">;

// ---- REST -------------------------------------------------------------------

export const listBankAccounts = (http: Http) => get<{ results: BankAccount[] }>(http, endpoints.bankAccounts);

export const getBankAccount = (http: Http, bankAccountId: string) =>
  get<{ account: BankAccount }>(http, endpoints.bankAccount(bankAccountId));

export const createBankAccount = (http: Http, account: NewBankAccount) =>
  post<{ account: BankAccount }>(http, endpoints.bankAccounts, account);

export const deleteBankAccount = (http: Http, bankAccountId: string) => del(http, endpoints.bankAccount(bankAccountId));

export const listBankTransfers = (http: Http) => get<{ transfers: BankTransfer[] }>(http, endpoints.bankTransfers);

// ---- GraphQL ----------------------------------------------------------------

export interface GraphQLResult<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export const graphql = <T>(http: Http, query: string, variables?: Record<string, unknown>, operationName?: string) =>
  post<GraphQLResult<T>>(http, endpoints.graphql, { query, variables, operationName });

const bankAccountFields = `id uuid userId bankName accountNumber routingNumber isDeleted createdAt modifiedAt`;

export const gqlListBankAccounts = (http: Http) =>
  graphql<{ listBankAccount: BankAccount[] }>(
    http,
    `query ListBankAccount { listBankAccount { ${bankAccountFields} } }`,
  );

export const gqlCreateBankAccount = (http: Http, account: NewBankAccount) =>
  graphql<{ createBankAccount: BankAccount }>(
    http,
    `mutation CreateBankAccount($bankName: String!, $accountNumber: String!, $routingNumber: String!) {
      createBankAccount(bankName: $bankName, accountNumber: $accountNumber, routingNumber: $routingNumber) {
        ${bankAccountFields}
      }
    }`,
    account,
  );

export const gqlDeleteBankAccount = (http: Http, id: string) =>
  graphql<{ deleteBankAccount: boolean }>(
    http,
    `
      mutation DeleteBankAccount($id: ID!) {
        deleteBankAccount(id: $id)
      }
    `,
    { id },
  );
