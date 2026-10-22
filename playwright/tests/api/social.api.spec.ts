import { test, expect } from "@fixtures/api";
import { bankAccounts, social, errorsOf } from "@api";

/** Contacts, likes, comments, notifications and bank transfers. */

test.describe("Bank Transfer API", () => {
  test("GET /bankTransfers gets a list of bank transfers for user", async ({ api, me }) => {
    const res = await bankAccounts.listBankTransfers(api);
    expect(res.status).toBe(200);
    expect(res.body.transfers[0].userId).toBe(me.id);
  });
});

test.describe("Contacts API", () => {
  test("GET /contacts/:username gets a list of contacts by username", async ({ api, me }) => {
    const res = await social.listContacts(api, me.username);
    expect(res.status).toBe(200);
    expect(res.body.contacts[0]).toHaveProperty("userId");
  });

  test("POST /contacts creates a new contact", async ({ api, me, db }) => {
    // Same data choice as the Cypress spec: a contact record's id used as contactUserId.
    const contact = await db.find("contacts");
    const res = await social.createContact(api, contact.id);
    expect(res.status).toBe(200);
    expect(typeof res.body.contact.id).toBe("string");
    expect(res.body.contact.userId).toBe(me.id);
  });

  test("POST /contacts errors when invalid contactUserId", async ({ api }) => {
    const res = await social.createContact(api, "1234");
    expect(res.status).toBe(422);
    expect(errorsOf(res)).toHaveLength(1);
  });

  test("DELETE /contacts/:contactId deletes a contact", async ({ api, db }) => {
    const contact = await db.find("contacts");
    const res = await social.deleteContact(api, contact.id);
    expect(res.status).toBe(200);
  });
});

test.describe("Likes API", () => {
  test("GET /likes/:transactionId gets a list of likes for a transaction", async ({ api, db }) => {
    const like = await db.find("likes");
    const res = await social.listLikes(api, like.transactionId);
    expect(res.status).toBe(200);
    expect(res.body.likes).toHaveLength(1);
  });

  test("POST /likes/:transactionId creates a new like for a transaction", async ({ api, db }) => {
    const like = await db.find("likes");
    const res = await social.createLike(api, like.transactionId);
    expect(res.status).toBe(200);
    expect((await social.listLikes(api, like.transactionId)).body.likes).toHaveLength(2);
  });
});

test.describe("Comments API", () => {
  test("GET /comments/:transactionId gets a list of comments for a transaction", async ({ api, db }) => {
    const comment = await db.find("comments");
    const res = await social.listComments(api, comment.transactionId);
    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(1);
  });

  test("POST /comments/:transactionId creates a new comment for a transaction", async ({ api, db }) => {
    const comment = await db.find("comments");
    const res = await social.createComment(api, comment.transactionId, "This is my comment");
    expect(res.status).toBe(200);
    const after = await social.listComments(api, comment.transactionId);
    expect(after.body.comments.map((c) => c.content)).toContain("This is my comment");
  });
});

test.describe("Notifications API", () => {
  test("GET /notifications gets a list of notifications for a user", async ({ api }) => {
    const res = await social.listNotifications(api);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });

  test("POST /notifications/bulk creates notifications for transaction, like and comment", async ({ api, db }) => {
    const [transaction, like, comment] = await Promise.all([
      db.find("transactions"),
      db.find("likes"),
      db.find("comments"),
    ]);
    // Mirrors the Cypress spec, which passes the like/comment transactionId as likeId/commentId.
    const res = await social.createNotifications(api, [
      { type: "payment", transactionId: transaction.id, status: "received" },
      { type: "like", transactionId: transaction.id, likeId: like.transactionId },
      { type: "comment", transactionId: transaction.id, commentId: comment.transactionId },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.results[0].transactionId).toBe(transaction.id);
  });

  test("PATCH /notifications/:notificationId updates a notification", async ({ api, db }) => {
    const notification = await db.find("notifications");
    const res = await social.updateNotification(api, notification.id, { isRead: true });
    expect(res.status).toBe(204);
  });

  test("PATCH /notifications/:notificationId errors when invalid field sent", async ({ api, db }) => {
    const notification = await db.find("notifications");
    const res = await social.updateNotification(api, notification.id, {
      notANotificationField: "not a notification field",
    });
    expect(res.status).toBe(422);
    expect(errorsOf(res)).toHaveLength(1);
  });
});
