#!/usr/bin/env node
/**
 * Regenerates tap26/mocks/fixtures/*.json from data/database-seed.json (zero dependencies).
 * Fixtures are deterministic (no random values) and shaped exactly like API response bodies,
 * so they can be served as-is by stubs (`stubApi`) or mock scenarios (`"fixture": "users.json"`).
 *
 * Usage: node tap26/mocks/build-fixtures.mjs
 *
 *   users.json              { results: User[] }                 first 3 seed users, password hash removed
 *   transactions-page.json  { pageData, results }               page 1 (10 items) of users[0]'s personal feed, enriched
 *   notifications.json      { results: NotificationResponseItem[] }  users[0]'s unread notifications, newest first
 *   bank-accounts.json      { results: BankAccount[] }          users[0]'s bank accounts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "tap26", "mocks", "fixtures");
const seed = JSON.parse(readFileSync(join(ROOT, "data", "database-seed.json"), "utf8"));

const PAGE_SIZE = 10;
const [me] = seed.users;
const userById = (id) => seed.users.find((u) => u.id === id) ?? {};
const fullName = (id) => `${userById(id).firstName ?? ""} ${userById(id).lastName ?? ""}`.trim();
const withoutPassword = ({ password, ...user }) => user;

const enrich = (t) => ({
  receiverName: fullName(t.receiverId),
  senderName: fullName(t.senderId),
  receiverAvatar: userById(t.receiverId).avatar,
  senderAvatar: userById(t.senderId).avatar,
  likes: seed.likes.filter((l) => l.transactionId === t.id),
  comments: seed.comments.filter((c) => c.transactionId === t.id),
  ...t,
});

// Same order as the API: newest `modifiedAt` first.
const personal = seed.transactions
  .filter((t) => t.receiverId === me.id || t.senderId === me.id)
  .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
const totalPages = Math.ceil(personal.length / PAGE_SIZE);

const notificationActor = (n) => {
  if (n.likeId) return seed.likes.find((l) => l.id === n.likeId)?.userId;
  if (n.commentId) return seed.comments.find((c) => c.id === n.commentId)?.userId;
  const tx = seed.transactions.find((t) => t.id === n.transactionId);
  return tx?.requestStatus ? tx.senderId : n.userId;
};

const fixtures = {
  "users.json": { results: seed.users.slice(0, 3).map(withoutPassword) },
  "transactions-page.json": {
    pageData: { page: 1, limit: PAGE_SIZE, hasNextPages: totalPages > 1, totalPages },
    results: personal.slice(0, PAGE_SIZE).map(enrich),
  },
  "notifications.json": {
    results: seed.notifications
      .filter((n) => n.userId === me.id && !n.isRead)
      .map((n) => ({ userFullName: fullName(notificationActor(n)), ...n }))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
  },
  "bank-accounts.json": { results: seed.bankaccounts.filter((a) => a.userId === me.id) },
};

mkdirSync(OUT, { recursive: true });
for (const [name, body] of Object.entries(fixtures)) {
  writeFileSync(join(OUT, name), `${JSON.stringify(body, null, 2)}\n`);
  console.log(`wrote tap26/mocks/fixtures/${name} (${body.results.length} results)`);
}
