/**
 * Domain types for the Real World App, mirroring `src/models` in the app repo.
 * Kept local so the framework has no compile-time dependency on the app source.
 */

export type PrivacyLevel = "public" | "private" | "contacts";

export interface User {
  id: string;
  uuid: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  balance: number;
  avatar: string;
  defaultPrivacyLevel: PrivacyLevel;
  createdAt: string;
  modifiedAt: string;
}

export type TransactionStatus = "pending" | "incomplete" | "complete";
export type TransactionRequestStatus = "pending" | "accepted" | "rejected" | "";
export type TransactionType = "payment" | "request";

export interface Transaction {
  id: string;
  uuid: string;
  source: string;
  amount: number;
  description: string;
  privacyLevel: PrivacyLevel;
  receiverId: string;
  senderId: string;
  balanceAtCompletion?: number;
  status: TransactionStatus;
  requestStatus?: TransactionRequestStatus;
  requestResolvedAt?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface TransactionResponseItem extends Transaction {
  receiverName: string;
  senderName: string;
  receiverAvatar: string;
  senderAvatar: string;
  likes: Like[];
  comments: Comment[];
}

export interface PageData {
  page: number;
  limit: number;
  hasNextPages: boolean;
  totalPages: number;
}

export interface Paginated<T> {
  pageData: PageData;
  results: T[];
}

export interface BankAccount {
  id: string;
  uuid: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  isDeleted: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface BankTransfer {
  id: string;
  uuid: string;
  userId: string;
  source: string;
  amount: number;
  transactionId: string;
  type: "withdrawal" | "deposit";
  createdAt: string;
  modifiedAt: string;
}

export interface Contact {
  id: string;
  uuid: string;
  userId: string;
  contactUserId: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Like {
  id: string;
  uuid: string;
  userId: string;
  transactionId: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Comment {
  id: string;
  uuid: string;
  content: string;
  userId: string;
  transactionId: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Notification {
  id: string;
  uuid: string;
  userId: string;
  transactionId: string;
  isRead: boolean;
  status?: string;
  likeId?: string;
  commentId?: string;
  createdAt: string;
  modifiedAt: string;
}

/** A notification as returned by `GET /notifications` (adds the actor's display name). */
export interface NotificationResponseItem extends Notification {
  userFullName: string;
}

/** Entities exposed by `GET /testData/:entity` (same names as the Cypress `cy.database` task). */
export interface DbSchema {
  users: User;
  contacts: Contact;
  bankaccounts: BankAccount;
  transactions: Transaction;
  likes: Like;
  comments: Comment;
  notifications: Notification;
  banktransfers: BankTransfer;
}

export type Entity = keyof DbSchema;
