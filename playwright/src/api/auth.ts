import type { User } from "@models";
import { env } from "@config";
import { get, post, type Http } from "./http";
import { endpoints } from "./endpoints";

/** Session login (sets the `connect.sid` cookie on the given context). Equivalent to `cy.loginByApi`. */
export const login = (http: Http, username: string, password: string = env.defaultPassword, remember = false) =>
  post<{ user: User }>(http, endpoints.login, { username, password, ...(remember ? { remember } : {}) });

export const logout = (http: Http) => post(http, endpoints.logout);

export const checkAuth = (http: Http) => get<{ user: User }>(http, endpoints.checkAuth);
