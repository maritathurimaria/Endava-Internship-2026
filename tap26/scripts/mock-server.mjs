#!/usr/bin/env node
/**
 * TAP26-Junior spec-driven mock API (zero dependencies, cross-platform).
 *
 * Answers every operation in tap26/openapi/openapi.json with its documented example, so tests,
 * demos and the UI can run without the real backend — plus scenarios for states the real API
 * cannot easily produce (empty, slow, errors) and an optional seed-backed stateful mode.
 *
 * Usage:
 *   node tap26/scripts/mock-server.mjs [--port 3101] [--stateful] [--scenario <name>] [--as <username>]
 *   env: MOCK_PORT, MOCK_SCENARIO
 *
 * Default mode — per request:
 *   method + path are matched against the spec's path templates ({param} → one segment);
 *   the lowest documented 2xx response is returned. Body: the media type's `examples` (first, or
 *   `__example=<name>` / header `x-mock-example`; GraphQL: the request's operationName), else its `example`, else the schema example,
 *   else a body synthesized from the schema (properties, examples, types, $ref, allOf/oneOf).
 *
 * Scenarios — header `x-mock-scenario: <name>[,<name>…]`, query `__scenario=<name>`,
 * or a server-wide default (--scenario / MOCK_SCENARIO / POST /__mock/scenario {"name": "…"}):
 *   status-<code>   respond with that documented status (or a generic body if undocumented)
 *   empty           arrays emptied (`results: []`, pageData.totalPages 0)
 *   slow            +2000 ms (any request: `__delay=<ms>` or header `x-mock-delay: <ms>`)
 *   error           500 JSON
 *   <file name>     tap26/mocks/scenarios/<name>.json (read fresh on every request):
 *                   { "name", "description",
 *                     "routes": [{ "method", "path", "status", "body" | "fixture", "delayMs", "headers",
 *                                  "operationName" (GraphQL only) }] }
 *                   `path` is a spec template ("/users/{userId}") or a concrete path; `method` "*" = any;
 *                   no `body` → the documented example for `status`; `fixture` → tap26/mocks/fixtures/<file>.
 *                   Requests that match no route of the scenario get the normal response.
 *
 * Stateful mode (--stateful): an in-memory copy of data/database-seed.json backs the main resources
 *   (auth/session, users, transactions + feeds with pageData, bank accounts incl. GraphQL, bank
 *   transfers, contacts, notifications, likes, comments, testData). POST/PATCH/DELETE mutate the copy.
 *   Identity: the `connect.sid` cookie from POST /login (password s3cret), or header
 *   `x-mock-user: <username|id>`, or --as <username>; otherwise protected routes answer 401.
 *   Reset: POST /__mock/reset (or POST /testData/seed). Anything not modelled falls back to examples.
 *
 * Control endpoints:
 *   GET  /__mock/routes     all spec routes, built-in + file scenarios, mode
 *   POST /__mock/reset      reset stateful data and sessions
 *   POST /__mock/scenario   {"name": "<scenario>"} sets the server-wide default ("" clears)
 *
 * CORS: reflects the request Origin with credentials and answers OPTIONS preflights, so the real
 * UI can point at the mock (start the frontend with VITE_BACKEND_PORT=3101).
 * Every request is logged: METHOD path → status [scenario] (source).
 */
import { createServer, STATUS_CODES } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCENARIO_DIR = join(ROOT, "tap26", "mocks", "scenarios");
const FIXTURE_DIR = join(ROOT, "tap26", "mocks", "fixtures");
const SEED_FILE = join(ROOT, "data", "database-seed.json");

const parseFlags = (argv) =>
  argv.reduce((flags, token, i, all) => {
    if (!token.startsWith("--")) return flags;
    const [key, inline] = token.slice(2).split("=", 2);
    const next = all[i + 1];
    return { ...flags, [key]: inline ?? (next && !next.startsWith("--") ? next : "true") };
  }, {});

const flags = parseFlags(process.argv.slice(2));
if (flags.help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}

const config = Object.freeze({
  port: Number(flags.port ?? process.env.MOCK_PORT ?? 3101),
  stateful: flags.stateful === "true" || process.env.MOCK_STATEFUL === "1",
  specFile: resolve(flags.spec ?? join(ROOT, "tap26", "openapi", "openapi.json")),
  defaultUser: flags.as ?? process.env.MOCK_USER ?? "",
  password: process.env.SEED_DEFAULT_USER_PASSWORD ?? "s3cret",
  pageSize: Number(process.env.PAGINATION_PAGE_SIZE ?? 10),
});

/** The only mutable state: active default scenario, stateful db, sessions. Replaced wholesale, never patched from outside. */
const state = { scenario: flags.scenario ?? process.env.MOCK_SCENARIO ?? "", db: null, sessions: new Map(), seq: 0 };

const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const now = () => new Date().toISOString();

// ---- spec loading & route matching ------------------------------------------------------------

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "/users/{userId}" → /^\/users\/([^/]+)\/?$/ */
const templateRegex = (template) =>
  new RegExp(`^${template.split(/\{[^}]+\}/).map(escapeRegex).join("([^/]+)")}/?$`);

const compileRoutes = (spec) =>
  Object.entries(spec.paths ?? {})
    .flatMap(([template, item]) =>
      METHODS.filter((m) => item[m]).map((m) => ({
        method: m.toUpperCase(),
        template,
        regex: templateRegex(template),
        params: [...template.matchAll(/\{([^}]+)\}/g)].map((x) => x[1]),
        op: item[m],
      })),
    )
    // static segments win over parameters: /users/search before /users/{userId}
    .sort((a, b) => a.params.length - b.params.length || b.template.length - a.template.length);

const specCache = { mtime: 0, spec: null, routes: [] };
const loadSpec = () => {
  const mtime = statSync(config.specFile).mtimeMs;
  if (mtime !== specCache.mtime) {
    const spec = JSON.parse(readFileSync(config.specFile, "utf8"));
    Object.assign(specCache, { mtime, spec, routes: compileRoutes(spec) });
  }
  return specCache;
};

const matchRoute = (routes, method, pathname) => {
  const candidates = routes.filter((r) => r.regex.test(pathname));
  const route = candidates.find((r) => r.method === method);
  if (!route) return { route: undefined, allowed: [...new Set(candidates.map((r) => r.method))] };
  const values = pathname.match(route.regex).slice(1).map(decodeURIComponent);
  return { route, params: Object.fromEntries(route.params.map((name, i) => [name, values[i]])), allowed: [] };
};

// ---- examples ---------------------------------------------------------------------------------

const deref = (spec, node, seen = new Set()) => {
  if (!node || typeof node !== "object" || !node.$ref) return node;
  if (seen.has(node.$ref)) return {};
  const target = node.$ref
    .replace(/^#\//, "")
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((acc, key) => acc?.[key], spec);
  return deref(spec, target, new Set([...seen, node.$ref]));
};

const FORMAT_SAMPLES = {
  "date-time": "2024-01-01T00:00:00.000Z",
  date: "2024-01-01",
  uuid: "00000000-0000-4000-8000-000000000000",
  uri: "https://example.com/resource",
  email: "user@example.com",
};

/** Build a minimal but valid-looking value from a schema. */
const synthesize = (spec, rawSchema, depth = 0) => {
  const schema = deref(spec, rawSchema);
  if (!schema || depth > 8) return null;
  if (schema.example !== undefined) return clone(schema.example);
  if (schema.default !== undefined) return clone(schema.default);
  if (schema.enum?.length) return clone(schema.enum[0]);
  if (schema.allOf) {
    return schema.allOf.reduce((acc, part) => {
      const value = synthesize(spec, part, depth + 1);
      return value && typeof value === "object" && !Array.isArray(value) ? { ...acc, ...value } : acc;
    }, {});
  }
  if (schema.oneOf || schema.anyOf) return synthesize(spec, (schema.oneOf ?? schema.anyOf)[0], depth + 1);
  const type = schema.type ?? (schema.properties ? "object" : schema.items ? "array" : undefined);
  switch (type) {
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, prop]) => [key, synthesize(spec, prop, depth + 1)]),
      );
    case "array":
      return schema.items ? [synthesize(spec, schema.items, depth + 1)] : [];
    case "string":
      return FORMAT_SAMPLES[schema.format] ?? "string";
    case "integer":
    case "number":
      return schema.minimum ?? 0;
    case "boolean":
      return false;
    default:
      return schema.nullable ? null : {};
  }
};

const pickStatus = (op, wanted) => {
  const codes = Object.keys(op.responses ?? {});
  if (wanted && codes.includes(String(wanted))) return String(wanted);
  return codes.filter((c) => /^2\d\d$/.test(c)).sort()[0] ?? codes.filter((c) => /^\d{3}$/.test(c)).sort()[0];
};

/** Documented example for one response of an operation → { status, type, body, example }. */
const documented = (spec, op, status, exampleName) => {
  const response = deref(spec, op.responses?.[status]) ?? {};
  const content = response.content ?? {};
  const type = content["application/json"] ? "application/json" : Object.keys(content)[0];
  if (!type) return { status: Number(status), type: undefined, body: undefined };
  const media = content[type];
  if (media.examples && Object.keys(media.examples).length) {
    const names = Object.keys(media.examples);
    const name = names.includes(exampleName) ? exampleName : names[0];
    return { status: Number(status), type, body: clone(deref(spec, media.examples[name]).value), example: name };
  }
  if (media.example !== undefined) return { status: Number(status), type, body: clone(media.example) };
  return { status: Number(status), type, body: synthesize(spec, media.schema) };
};

const genericBody = (status) =>
  status === 204 || status === 304 ? undefined : { error: STATUS_CODES[status] ?? "Mock response", status };

// ---- scenarios --------------------------------------------------------------------------------

const BUILT_IN = Object.freeze({
  "status-<code>": "Respond with the documented example for that status (or a generic body)",
  empty: "Empty every array in the body (results: []), pageData.totalPages 0",
  slow: "Delay the response by 2000 ms (also __delay=<ms> / x-mock-delay)",
  error: "500 JSON for every request",
});

const isBuiltIn = (name) => /^status-\d{3}$/.test(name) || ["empty", "slow", "error"].includes(name);

const scenarioFiles = () =>
  existsSync(SCENARIO_DIR) ? readdirSync(SCENARIO_DIR).filter((f) => f.endsWith(".json")).sort() : [];

const loadScenario = (name) => {
  const file = join(SCENARIO_DIR, `${name}.json`);
  if (!existsSync(file)) return undefined;
  const scenario = JSON.parse(readFileSync(file, "utf8"));
  return {
    ...scenario,
    routes: (scenario.routes ?? []).map((r) => ({ ...r, regex: templateRegex(r.path), method: (r.method ?? "*").toUpperCase() })),
  };
};

const listScenarios = () =>
  scenarioFiles().map((f) => {
    try {
      const s = JSON.parse(readFileSync(join(SCENARIO_DIR, f), "utf8"));
      return { name: f.replace(/\.json$/, ""), description: s.description ?? "", routes: (s.routes ?? []).map((r) => `${r.method ?? "*"} ${r.path} → ${r.status ?? 200}`) };
    } catch (error) {
      return { name: f.replace(/\.json$/, ""), error: `invalid JSON: ${error.message}` };
    }
  });

const emptied = (body) => {
  if (Array.isArray(body)) return [];
  if (!body || typeof body !== "object") return body;
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => {
      if (Array.isArray(value)) return [key, []];
      if (key === "pageData" && value && typeof value === "object") return [key, { ...value, page: 1, hasNextPages: false, totalPages: 0 }];
      if (key === "data" && value && typeof value === "object") return [key, emptied(value)]; // GraphQL { data: { list: [] } }
      return [key, value];
    }),
  );
};

// ---- stateful mode ----------------------------------------------------------------------------

const resetDb = () => {
  state.db = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  state.sessions = new Map();
};

const shortId = () => `mock${(++state.seq).toString(36).padStart(5, "0")}${Math.random().toString(36).slice(2, 5)}`;
const stamp = () => ({ id: shortId(), uuid: randomUUID(), createdAt: now(), modifiedAt: now() });
const table = (name) => state.db[name];
const byId = (name, id) => table(name).find((row) => row.id === id);
const fullName = (userId) => {
  const u = byId("users", userId);
  return u ? `${u.firstName} ${u.lastName}` : "";
};

const ok = (body, status = 200, extra = {}) => ({ status, body, ...extra });
const text = (status, body = STATUS_CODES[status]) => ({ status, body, type: "text/plain" });
const unauthorized = () => ok({ error: "Unauthorized" }, 401);
const invalid = (param, value, location = "body") => ok({ errors: [{ value, msg: "Invalid value", param, location }] }, 422);
const crash = (what) => text(500, `TypeError: Cannot read properties of undefined (${what} not found — mock of KI-10)`);

const formatTransaction = (t) => {
  const receiver = byId("users", t.receiverId) ?? {};
  const sender = byId("users", t.senderId) ?? {};
  return {
    receiverName: fullName(t.receiverId),
    senderName: fullName(t.senderId),
    receiverAvatar: receiver.avatar,
    senderAvatar: sender.avatar,
    likes: table("likes").filter((l) => l.transactionId === t.id),
    comments: table("comments").filter((c) => c.transactionId === t.id),
    ...t,
  };
};

const formatNotification = (n) => {
  const tx = byId("transactions", n.transactionId);
  const by = n.likeId
    ? byId("likes", n.likeId)?.userId
    : n.commentId
      ? byId("comments", n.commentId)?.userId
      : tx?.requestStatus
        ? tx.senderId
        : n.userId;
  return { userFullName: fullName(by), ...n };
};

const paginate = (items, query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || config.pageSize));
  const totalPages = Math.ceil(items.length / limit);
  return {
    pageData: { page, limit, hasNextPages: page < totalPages, totalPages },
    results: items.slice((page - 1) * limit, page * limit),
  };
};

const EXACT_FILTERS = ["status", "requestStatus", "receiverId", "senderId"];
const filterTransactions = (items, query) => {
  const exact = items.filter((t) => EXACT_FILTERS.every((k) => query[k] === undefined || t[k] === query[k]));
  const byDate =
    query.dateRangeStart && query.dateRangeEnd
      ? exact.filter((t) => t.createdAt >= query.dateRangeStart && t.createdAt <= query.dateRangeEnd)
      : exact;
  return query.amountMin !== undefined && query.amountMax !== undefined
    ? byDate.filter((t) => t.amount >= Number(query.amountMin) && t.amount < Number(query.amountMax))
    : byDate;
};

/** Like the API: newest `modifiedAt` first. */
const newestFirst = (items) => [...items].sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));

const personalTransactions = (userId, query = {}) =>
  newestFirst(
    filterTransactions(
      table("transactions").filter((t) => t.receiverId === userId || t.senderId === userId),
      query,
    ),
  ).map(formatTransaction);

const contactsTransactions = (userId, query = {}) => {
  const contactIds = table("contacts").filter((c) => c.userId === userId).map((c) => c.contactUserId);
  const seen = new Set();
  return contactIds
    .flatMap((id) => personalTransactions(id, query))
    .filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
};

const publicFeed = (userId, query) => {
  const contacts = contactsTransactions(userId, query);
  const contactIds = new Set(contactsTransactions(userId).map((t) => t.id));
  const others = newestFirst(
    filterTransactions(
      table("transactions").filter((t) => t.privacyLevel === "public" && !contactIds.has(t.id)),
      { ...query, status: undefined, requestStatus: undefined, receiverId: undefined, senderId: undefined },
    ),
  ).map(formatTransaction);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return paginate(page === 1 ? [...contacts.slice(0, 5), ...others] : others, query);
};

const moveMoney = (from, to, amount) => {
  if (from) from.balance = (from.balance ?? 0) - amount;
  if (to) to.balance = (to.balance ?? 0) + amount;
};

const notify = (userId, transactionId, extra) => {
  const notification = { ...stamp(), userId, transactionId, isRead: false, ...extra };
  table("notifications").push(notification);
  return notification;
};

const graphqlOperation = (body) => {
  const query = String(body?.query ?? "");
  if (body?.operationName) return body.operationName;
  if (/listBankAccount/.test(query)) return "ListBankAccount";
  if (/createBankAccount/.test(query)) return "CreateBankAccount";
  if (/deleteBankAccount/.test(query)) return "DeleteBankAccount";
  return "";
};

/** Stateful handlers keyed by "METHOD template". Each gets { me, params, query, body, cookies } and returns a reply or undefined (→ fall back to examples). */
const PUBLIC_ROUTES = new Set(["POST /login", "POST /logout", "GET /checkAuth", "POST /users", "GET /users/profile/{username}", "GET /contacts/{usernameOrContactId}", "POST /testData/seed", "GET /testData/{entity}", "GET /", "POST /graphql"]);

const STATEFUL = {
  "POST /login": ({ body }) => {
    if (!body?.username || !body?.password) return text(400, "Bad Request");
    const user = table("users").find((u) => u.username === body.username);
    const passwordOk = user && (body.password === config.password || body.password === user.password);
    if (!passwordOk) return text(401, "Unauthorized");
    const sid = `mock-${randomUUID()}`;
    state.sessions.set(sid, user.id);
    const expires = body.remember ? `; Expires=${new Date(Date.now() + 30 * 864e5).toUTCString()}` : "";
    return ok({ user }, 200, { headers: { "set-cookie": `connect.sid=${sid}; Path=/; HttpOnly${expires}` } });
  },
  "POST /logout": ({ cookies }) => {
    state.sessions.delete(cookies["connect.sid"]);
    return { status: 302, body: undefined, headers: { location: "/", "set-cookie": "connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT" } };
  },
  "GET /checkAuth": ({ me }) => (me ? ok({ user: me }) : ok({ error: "User is unauthorized" }, 401)),

  "GET /users": ({ me }) => ok({ results: table("users").filter((u) => u.id !== me.id) }),
  "GET /users/search": ({ me, query }) => {
    const q = String(query.q ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!q) return invalid("q", query.q, "query");
    const hit = (u) => ["firstName", "lastName", "username", "email", "phoneNumber"].some((k) => String(u[k] ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().includes(q));
    return ok({ results: table("users").filter((u) => u.id !== me.id && hit(u)) });
  },
  "POST /users": ({ body }) => {
    const missing = ["firstName", "lastName", "username", "password"].find((k) => !body?.[k]);
    if (missing) return invalid(missing, body?.[missing]);
    const user = { ...stamp(), balance: 0, defaultPrivacyLevel: "public", email: "", phoneNumber: "", avatar: "", ...body };
    delete user.confirmPassword;
    table("users").push(user);
    return ok({ user }, 201);
  },
  "GET /users/{userId}": ({ params }) => {
    const user = byId("users", params.userId);
    return user ? ok({ user }) : invalid("userId", params.userId, "params");
  },
  "PATCH /users/{userId}": ({ params, body }) => {
    const user = byId("users", params.userId);
    if (!user) return invalid("userId", params.userId, "params");
    const allowed = ["firstName", "lastName", "email", "phoneNumber", "defaultPrivacyLevel", "avatar"];
    allowed.filter((k) => body?.[k] !== undefined).forEach((k) => (user[k] = body[k]));
    user.modifiedAt = now();
    return { status: 204, body: undefined };
  },
  "GET /users/profile/{username}": ({ params }) => {
    const user = table("users").find((u) => u.username === params.username);
    return ok({ user: user ? { firstName: user.firstName, lastName: user.lastName, avatar: user.avatar } : {} });
  },

  "GET /transactions": ({ me, query }) => ok(paginate(personalTransactions(me.id, query), query)),
  "GET /transactions/contacts": ({ me, query }) => ok(paginate(contactsTransactions(me.id, query), query)),
  "GET /transactions/public": ({ me, query }) => ok(publicFeed(me.id, query)),
  "GET /transactions/{transactionId}": ({ params }) => {
    const tx = byId("transactions", params.transactionId);
    return tx ? ok({ transaction: formatTransaction(tx) }) : crash("transaction");
  },
  "POST /transactions": ({ me, body }) => {
    const receiver = byId("users", body?.receiverId);
    if (!receiver) return invalid("receiverId", body?.receiverId);
    if (!["payment", "request"].includes(body?.transactionType)) return invalid("transactionType", body?.transactionType);
    const amount = Math.trunc(Number(body.amount)) * 100;
    if (!Number.isFinite(amount)) return invalid("amount", body.amount);
    const isRequest = body.transactionType === "request";
    const transaction = {
      ...stamp(),
      source: body.source ?? "",
      amount,
      description: body.description ?? "",
      receiverId: receiver.id,
      senderId: me.id,
      privacyLevel: body.privacyLevel ?? me.defaultPrivacyLevel ?? "public",
      status: isRequest ? "pending" : "complete",
      ...(isRequest ? { requestStatus: "pending" } : {}),
    };
    table("transactions").push(transaction);
    if (!isRequest) moveMoney(me, receiver, amount);
    notify(receiver.id, transaction.id, { status: isRequest ? "requested" : "received" });
    return ok({ transaction });
  },
  "PATCH /transactions/{transactionId}": ({ params, body }) => {
    const tx = byId("transactions", params.transactionId);
    if (!tx) return crash("transaction");
    const edits = { ...body };
    if (tx.requestStatus) {
      moveMoney(byId("users", tx.receiverId), byId("users", tx.senderId), tx.amount);
      edits.status = "complete";
      notify(tx.senderId, tx.id, { status: "received" });
    }
    Object.assign(tx, edits, { modifiedAt: now() });
    return { status: 204, body: undefined };
  },

  "GET /bankAccounts": ({ me }) => ok({ results: table("bankaccounts").filter((a) => a.userId === me.id) }),
  "GET /bankAccounts/{bankAccountId}": ({ params }) => ok({ account: byId("bankaccounts", params.bankAccountId) }),
  "POST /bankAccounts": ({ me, body }) => {
    const missing = ["bankName", "accountNumber", "routingNumber"].find((k) => !body?.[k]);
    if (missing) return invalid(missing, body?.[missing]);
    const account = { ...stamp(), userId: me.id, bankName: body.bankName, accountNumber: body.accountNumber, routingNumber: body.routingNumber, isDeleted: false };
    table("bankaccounts").push(account);
    return ok({ account });
  },
  "DELETE /bankAccounts/{bankAccountId}": ({ params }) => {
    const account = byId("bankaccounts", params.bankAccountId);
    if (account) Object.assign(account, { isDeleted: true, modifiedAt: now() });
    return ok({ account });
  },
  "GET /bankTransfers": ({ me }) => ok({ transfers: table("banktransfers").filter((t) => t.userId === me.id) }),

  "GET /contacts/{usernameOrContactId}": ({ params }) => {
    const user = table("users").find((u) => u.username === params.usernameOrContactId);
    return user ? ok({ contacts: table("contacts").filter((c) => c.userId === user.id) }) : crash("user");
  },
  "POST /contacts": ({ me, body }) => {
    if (!byId("users", body?.contactUserId)) return invalid("contactUserId", body?.contactUserId);
    const existing = table("contacts").find((c) => c.userId === me.id && c.contactUserId === body.contactUserId);
    const contact = existing ?? { ...stamp(), userId: me.id, contactUserId: body.contactUserId };
    if (!existing) table("contacts").push(contact);
    return ok({ contact });
  },
  "DELETE /contacts/{usernameOrContactId}": ({ params }) => {
    state.db.contacts = table("contacts").filter((c) => c.id !== params.usernameOrContactId);
    return ok({ contacts: table("contacts") });
  },

  "GET /notifications": ({ me }) =>
    ok({
      results: table("notifications")
        .filter((n) => n.userId === me.id && !n.isRead)
        .map(formatNotification)
        .sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt))),
    }),
  "PATCH /notifications/{notificationId}": ({ params, body }) => {
    const notification = byId("notifications", params.notificationId);
    if (!notification) return invalid("notificationId", params.notificationId, "params");
    Object.assign(notification, { isRead: Boolean(body?.isRead), modifiedAt: now() });
    return { status: 204, body: undefined };
  },
  "POST /notifications/bulk": ({ me, body }) => {
    if (!Array.isArray(body?.items)) return text(500, "TypeError: items is not iterable (mock of KI-17)");
    const results = body.items.map((item) => {
      if (item.type === "payment" && item.status) return notify(me.id, item.transactionId, { status: item.status });
      if (item.type === "like" && item.likeId) return notify(me.id, item.transactionId, { likeId: item.likeId });
      if (item.commentId) return notify(me.id, item.transactionId, { commentId: item.commentId });
      return null;
    });
    return ok({ results });
  },

  "GET /likes/{transactionId}": ({ params }) => ok({ likes: table("likes").filter((l) => l.transactionId === params.transactionId) }),
  "POST /likes/{transactionId}": ({ me, params }) => {
    const tx = byId("transactions", params.transactionId);
    if (!tx) return crash("transaction");
    const like = { ...stamp(), userId: me.id, transactionId: tx.id };
    table("likes").push(like);
    [tx.senderId, tx.receiverId].forEach((userId) => notify(userId, tx.id, { likeId: like.id }));
    return text(200, "OK");
  },
  "GET /comments/{transactionId}": ({ params }) => ok({ comments: table("comments").filter((c) => c.transactionId === params.transactionId) }),
  "POST /comments/{transactionId}": ({ me, params, body }) => {
    const tx = byId("transactions", params.transactionId);
    if (!tx) return crash("transaction");
    if (!body?.content) return invalid("content", body?.content);
    const comment = { ...stamp(), content: body.content, userId: me.id, transactionId: tx.id };
    table("comments").push(comment);
    [tx.senderId, tx.receiverId].forEach((userId) => notify(userId, tx.id, { commentId: comment.id }));
    return text(200, "OK");
  },

  "POST /graphql": ({ me, body }) => {
    const unauth = { data: null, errors: [{ message: "Unauthorized" }] };
    const operation = graphqlOperation(body);
    const vars = body?.variables ?? {};
    if (!operation) return undefined;
    if (!me) return ok(unauth);
    if (operation === "ListBankAccount") return ok({ data: { listBankAccount: table("bankaccounts").filter((a) => a.userId === me.id) } });
    if (operation === "CreateBankAccount") {
      const account = { ...stamp(), userId: me.id, bankName: vars.bankName, accountNumber: vars.accountNumber, routingNumber: vars.routingNumber, isDeleted: false };
      table("bankaccounts").push(account);
      return ok({ data: { createBankAccount: account } });
    }
    if (operation === "DeleteBankAccount") {
      const account = byId("bankaccounts", vars.id);
      if (account) Object.assign(account, { isDeleted: true, modifiedAt: now() });
      return ok({ data: { deleteBankAccount: true } });
    }
    return undefined;
  },

  "POST /testData/seed": () => {
    resetDb();
    return text(200, "OK");
  },
  "GET /testData/{entity}": ({ params }) =>
    state.db[params.entity] ? ok({ results: state.db[params.entity] }) : invalid("entity", params.entity, "params"),
};

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );

const currentUser = (req, cookies) => {
  const sessionUser = state.sessions.get(cookies["connect.sid"]);
  const hint = sessionUser ?? req.headers["x-mock-user"] ?? config.defaultUser;
  return hint ? table("users").find((u) => u.id === hint || u.username === hint) : undefined;
};

const statefulReply = (req, route, params, query, body) => {
  const key = `${route.method} ${route.template}`;
  const handler = STATEFUL[key];
  if (!handler) return undefined;
  const cookies = parseCookies(req.headers.cookie);
  const me = currentUser(req, cookies);
  if (!me && !PUBLIC_ROUTES.has(key)) return unauthorized();
  return handler({ me, params, query, body, cookies });
};

// ---- HTTP plumbing ----------------------------------------------------------------------------

const readBody = (req) =>
  new Promise((done) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return done(undefined);
      const type = req.headers["content-type"] ?? "";
      if (type.includes("application/x-www-form-urlencoded")) return done(Object.fromEntries(new URLSearchParams(raw)));
      try {
        done(JSON.parse(raw));
      } catch {
        done(raw);
      }
    });
    req.on("error", () => done(undefined));
  });

const corsHeaders = (req) =>
  req.headers.origin
    ? {
        "access-control-allow-origin": req.headers.origin,
        "access-control-allow-credentials": "true",
        "access-control-expose-headers": "x-mock-route, x-mock-scenario, x-mock-source",
        vary: "Origin",
      }
    : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const send = (req, res, reply, meta) => {
  const { status, body, headers = {} } = reply;
  const type = reply.type ?? (body === undefined ? undefined : typeof body === "string" ? "text/plain" : "application/json");
  const payload = body === undefined || status === 204 || status === 304 ? "" : typeof body === "string" ? body : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    ...corsHeaders(req),
    ...(type ? { "content-type": type.includes("charset") ? type : `${type}; charset=utf-8` } : {}),
    "cache-control": "no-store",
    ...(meta.route ? { "x-mock-route": meta.route } : {}),
    ...(meta.scenario ? { "x-mock-scenario": meta.scenario } : {}),
    "x-mock-source": meta.source,
    ...headers,
  });
  res.end(req.method === "HEAD" ? undefined : payload);
  console.log(
    `${new Date().toISOString().slice(11, 19)} ${req.method} ${req.url} → ${status}${meta.scenario ? ` [${meta.scenario}]` : ""} (${meta.source})`,
  );
};

const control = async (req, res, pathname, body) => {
  if (req.method === "GET" && pathname === "/__mock/routes") {
    const { routes } = loadSpec();
    return send(req, res, ok({
      mode: config.stateful ? "stateful" : "examples",
      activeScenario: state.scenario || null,
      routes: routes.map((r) => ({
        method: r.method,
        path: r.template,
        operationId: r.op.operationId,
        statuses: Object.keys(r.op.responses ?? {}),
        stateful: config.stateful && Boolean(STATEFUL[`${r.method} ${r.template}`]),
      })),
      scenarios: { builtIn: BUILT_IN, files: listScenarios() },
    }), { source: "control" });
  }
  if (req.method === "POST" && pathname === "/__mock/reset") {
    resetDb();
    return send(req, res, ok({ reset: true, stateful: config.stateful }), { source: "control" });
  }
  if (req.method === "POST" && pathname === "/__mock/scenario") {
    const name = String(body?.name ?? new URL(req.url, "http://x").searchParams.get("name") ?? "").trim();
    const unknown = name.split(",").map((n) => n.trim()).filter((n) => n && !isBuiltIn(n) && !loadScenario(n));
    if (unknown.length) return send(req, res, ok({ error: `Unknown scenario: ${unknown.join(", ")}` }, 400), { source: "control" });
    state.scenario = name;
    return send(req, res, ok({ activeScenario: name || null }), { source: "control" });
  }
  return send(req, res, ok({ error: "Unknown control endpoint", routes: ["GET /__mock/routes", "POST /__mock/reset", "POST /__mock/scenario"] }, 404), { source: "control" });
};

const handle = async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(req),
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "content-type, x-mock-scenario, x-mock-delay, x-mock-user",
      "access-control-max-age": "600",
    });
    return res.end();
  }

  const body = await readBody(req);
  if (pathname.startsWith("/__mock/")) return control(req, res, pathname, body);

  const query = Object.fromEntries([...url.searchParams].filter(([k]) => !k.startsWith("__")));
  const scenarioHeader = req.headers["x-mock-scenario"] ?? url.searchParams.get("__scenario") ?? state.scenario;
  const scenarios = String(scenarioHeader ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const scenarioLabel = scenarios.join(",");
  // GraphQL: response examples are named after the operation (ListBankAccount, CreateBankAccount…)
  const exampleName = req.headers["x-mock-example"] ?? url.searchParams.get("__example") ?? (graphqlOperation(body) || undefined);
  const extraDelay = Number(req.headers["x-mock-delay"] ?? url.searchParams.get("__delay") ?? 0) || 0;
  const delay = (ms) => sleep(ms + extraDelay + (scenarios.includes("slow") ? 2000 : 0));

  const { spec, routes } = loadSpec();
  const { route, params = {}, allowed } = matchRoute(routes, req.method === "HEAD" ? "GET" : req.method, pathname);
  const meta = { route: route ? `${route.method} ${route.template}` : undefined, scenario: scenarioLabel };

  // 1. scenario files (first matching route wins)
  const fileScenarios = scenarios.filter((s) => !isBuiltIn(s));
  for (const name of fileScenarios) {
    const scenario = loadScenario(name);
    if (!scenario) {
      return send(req, res, ok({ error: `Unknown mock scenario '${name}'`, available: [...Object.keys(BUILT_IN), ...scenarioFiles().map((f) => f.replace(/\.json$/, ""))] }, 400), { ...meta, source: "scenario" });
    }
    const hit = scenario.routes.find(
      (r) =>
        (r.method === "*" || r.method === req.method) &&
        r.regex.test(pathname) &&
        (!r.operationName || r.operationName === graphqlOperation(body)),
    );
    if (hit) {
      const status = Number(hit.status ?? 200);
      const fallback = route ? documented(spec, route.op, pickStatus(route.op, status) ?? status, exampleName) : { body: genericBody(status) };
      const fromFixture = hit.fixture ? JSON.parse(readFileSync(join(FIXTURE_DIR, hit.fixture), "utf8")) : undefined;
      const replyBody = hit.body !== undefined ? hit.body : fromFixture !== undefined ? fromFixture : Number(fallback.status) === status ? fallback.body : genericBody(status);
      await delay(Number(hit.delayMs ?? 0));
      return send(req, res, { status, body: replyBody, headers: hit.headers ?? {} }, { ...meta, source: `scenario:${name}` });
    }
  }

  // 2. built-in error scenarios
  if (scenarios.includes("error")) {
    await delay(0);
    return send(req, res, ok({ error: "Internal Server Error", scenario: "error" }, 500), { ...meta, source: "builtin" });
  }
  const forced = scenarios.map((s) => s.match(/^status-(\d{3})$/)?.[1]).find(Boolean);
  if (forced) {
    const status = Number(forced);
    const doc = route && route.op.responses?.[forced] ? documented(spec, route.op, forced, exampleName) : { type: undefined, body: genericBody(status) };
    await delay(0);
    return send(req, res, { status, body: doc.body, type: doc.type }, { ...meta, source: "builtin" });
  }

  if (!route) {
    const status = allowed.length ? 405 : 404;
    return send(req, res, { status, body: { error: allowed.length ? `Method not allowed (use ${allowed.join(", ")})` : "No mock route for this path", hint: "GET /__mock/routes" }, headers: allowed.length ? { allow: allowed.join(", ") } : {} }, { ...meta, source: "router" });
  }

  // 3. stateful data, else 4. documented example
  const stateful = config.stateful ? statefulReply(req, route, params, query, body) : undefined;
  const reply = stateful ?? documented(spec, route.op, pickStatus(route.op), exampleName);
  const finalBody = scenarios.includes("empty") ? emptied(reply.body) : reply.body;
  await delay(0);
  return send(req, res, { ...reply, body: finalBody }, { ...meta, source: stateful ? "stateful" : reply.example ? `example:${reply.example}` : "example" });
};

// ---- start ------------------------------------------------------------------------------------

if (config.stateful) resetDb();
loadSpec();

const server = createServer((req, res) =>
  handle(req, res).catch((error) => {
    console.error(`mock-server: ${req.method} ${req.url} failed: ${error.stack}`);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify({ error: "Mock server error", detail: error.message }));
  }),
);

server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `mock-server: port ${config.port} is already in use — is the mock server already running?\n  Use another port: node tap26/scripts/mock-server.mjs --port ${config.port + 10}`
      : `mock-server: ${error.message}`,
  );
  process.exit(1);
});

server.listen(config.port, () => {
  const base = `http://localhost:${config.port}`;
  console.log(
    [
      `TAP26 mock API        ${base}  (${config.stateful ? "stateful: in-memory copy of data/database-seed.json" : "examples from the OpenAPI spec"})`,
      `Spec                  ${config.specFile.replace(`${ROOT}/`, "")} (${specCache.routes.length} operations)`,
      `Scenarios             ${[...Object.keys(BUILT_IN), ...scenarioFiles().map((f) => f.replace(/\.json$/, ""))].join(", ")}`,
      `Active scenario       ${state.scenario || "(none)"}  — per request: x-mock-scenario header or ?__scenario=`,
      `Routes                ${base}/__mock/routes`,
    ].join("\n"),
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
