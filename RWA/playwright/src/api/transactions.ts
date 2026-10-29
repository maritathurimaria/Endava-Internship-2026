import type { Paginated, Transaction, TransactionResponseItem, TransactionType, PrivacyLevel } from "@models";
import { get, patch, post, type Http, type Params } from "./http";
import { endpoints } from "./endpoints";

export interface TransactionQuery extends Params {}

export interface NewTransaction {
  transactionType: TransactionType;
  source?: string;
  receiverId: string;
  description: string;
  amount: number;
  privacyLevel?: PrivacyLevel;
}

type Feed = Paginated<TransactionResponseItem>;

export const listPersonalTransactions = (http: Http, query?: TransactionQuery) =>
  get<Feed>(http, endpoints.transactions, query);

export const listContactsTransactions = (http: Http, query?: TransactionQuery) =>
  get<Feed>(http, endpoints.contactsTransactions, query);

export const listPublicTransactions = (http: Http, query?: TransactionQuery) =>
  get<Feed>(http, endpoints.publicTransactions, query);

export const getTransaction = (http: Http, transactionId: string) =>
  get<{ transaction: TransactionResponseItem }>(http, endpoints.transaction(transactionId));

export const createTransaction = (http: Http, transaction: NewTransaction) =>
  post<{ transaction: Transaction }>(http, endpoints.transactions, transaction);

export const updateTransaction = (http: Http, transactionId: string, changes: Record<string, unknown>) =>
  patch(http, endpoints.transaction(transactionId), changes);

/** True when `userId` is the sender or receiver of the transaction. */
export const involvesUser =
  (userId: string) =>
  ({ senderId, receiverId }: Pick<Transaction, "senderId" | "receiverId">): boolean =>
    senderId === userId || receiverId === userId;
