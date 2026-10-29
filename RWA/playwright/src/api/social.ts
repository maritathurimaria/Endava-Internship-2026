import type { Comment, Contact, Like, Notification } from "@models";
import { del, get, patch, post, type Http } from "./http";
import { endpoints } from "./endpoints";

// ---- Contacts ---------------------------------------------------------------

export const listContacts = (http: Http, username: string) =>
  get<{ contacts: Contact[] }>(http, endpoints.contactsFor(username));

export const createContact = (http: Http, contactUserId: string) =>
  post<{ contact: Contact }>(http, endpoints.contacts, { contactUserId });

export const deleteContact = (http: Http, contactId: string) => del(http, endpoints.contact(contactId));

// ---- Likes ------------------------------------------------------------------

export const listLikes = (http: Http, transactionId: string) =>
  get<{ likes: Like[] }>(http, endpoints.likes(transactionId));

export const createLike = (http: Http, transactionId: string) =>
  post(http, endpoints.likes(transactionId), { transactionId });

// ---- Comments ---------------------------------------------------------------

export const listComments = (http: Http, transactionId: string) =>
  get<{ comments: Comment[] }>(http, endpoints.comments(transactionId));

export const createComment = (http: Http, transactionId: string, content: string) =>
  post(http, endpoints.comments(transactionId), { content });

// ---- Notifications ----------------------------------------------------------

export type NotificationPayload =
  | { type: "payment"; transactionId: string; status: "received" | "requested" | string }
  | { type: "like"; transactionId: string; likeId: string }
  | { type: "comment"; transactionId: string; commentId: string };

export const listNotifications = (http: Http) => get<{ results: Notification[] }>(http, endpoints.notifications);

export const createNotifications = (http: Http, items: NotificationPayload[]) =>
  post<{ results: Notification[] }>(http, endpoints.notificationsBulk, { items });

export const updateNotification = (http: Http, notificationId: string, changes: Record<string, unknown>) =>
  patch(http, endpoints.notification(notificationId), changes);
