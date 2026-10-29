import type { User } from "@models";
import { get, patch, post, type Http } from "./http";
import { endpoints } from "./endpoints";

export type NewUser = Pick<
  User,
  "firstName" | "lastName" | "username" | "password" | "email" | "phoneNumber" | "avatar"
> &
  Partial<Pick<User, "balance">>;

export const listUsers = (http: Http) => get<{ results: User[] }>(http, endpoints.users);

export const getUser = (http: Http, userId: string) => get<{ user: User }>(http, endpoints.user(userId));

export const getUserProfile = (http: Http, username: string) =>
  get<{ user: Pick<User, "firstName" | "lastName" | "avatar"> }>(http, endpoints.userProfile(username));

export const searchUsers = (http: Http, q: string) => get<{ results: User[] }>(http, endpoints.userSearch, { q });

export const createUser = (http: Http, user: NewUser | Record<string, unknown>) =>
  post<{ user: User }>(http, endpoints.users, user);

export const updateUser = (http: Http, userId: string, changes: Partial<User> | Record<string, unknown>) =>
  patch(http, endpoints.user(userId), changes);
