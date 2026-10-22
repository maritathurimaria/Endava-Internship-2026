> **Purpose:** Human-readable reference of every RWA API endpoint (REST + GraphQL): auth, validation, response shape, side effects, status codes. Companion to the machine-readable contract in [`../openapi/openapi.yaml`](../openapi/openapi.yaml).
> **Last verified:** 2026-10-16 (code in `backend/*.ts` read line by line, then read-only calls against the running API on :3001)

# API overview

Base URL: **http://localhost:3001**. All bodies are JSON (`application/json`). Form-urlencoded bodies are also parsed.

- **Contract:** [`tap26/openapi/openapi.yaml`](../openapi/openapi.yaml) is the source of truth for schemas. Browse it with
  `node tap26/scripts/swagger-server.mjs` → http://localhost:3100. That page proxies `/api/*` to :3001, so cookies and CORS work.
- **Defects:** [known-issues.md](known-issues.md) lists verified API bugs as `KI-xx`. They are referenced below.
- **Generated list:** `generated/api-routes.md` (from `scan-app.mjs`) has every route with `file:line`.

## Conventions shared by all endpoints

| Topic | Behaviour |
|---|---|
| Authentication | Session cookie **`connect.sid`** from `POST /login`. Routes marked 🔒 use `ensureAuthenticated` → **401 `{"error":"Unauthorized"}`** without a session |
| Authorization | Mostly **none beyond "is logged in"**. Only `GET /users/:userId` checks ownership. See KI-04…KI-06 |
| Validation errors | **422 `{"errors":[{ value, msg, param, location }]}`** (express-validator 6). `oneOf` failures nest under `param: "_error"` |
| IDs | `:userId`, `:transactionId`, `:bankAccountId`, `:contactId`, `:notificationId` must pass `shortid.isValid` (≥ 7 chars of `[A-Za-z0-9_-]`), otherwise 422 |
| Unknown ids | No 404s. Usually **500 with an HTML stack trace** (e.g. `GET /transactions/abcdefghij`), sometimes `200 {}` (KI-10). Some updates/deletes hit the **wrong record** (KI-01…03) |
| Money | Responses: integer **cents**. `POST /transactions` body: **dollars**, truncated to an integer and then ×100 (KI-18) |
| Pagination | express-paginate: `?page` (default 1), `?limit` (default 10 = `PAGINATION_PAGE_SIZE`, **capped at 50**). Paged responses: `{ pageData: { page, limit, hasNextPages, totalPages }, results: [...] }` |
| Dates | ISO-8601 strings in JSON (seeded data). GraphQL-created bank accounts store epoch ms (KI-25) |
| CORS | `Access-Control-Allow-Origin: http://localhost:3000` (fixed), `credentials: true` |

## Auth (`backend/auth.ts`, mounted at `/`)

| Method | Path | Auth | Request | Response | Codes / notes |
|---|---|---|---|---|---|
| POST | `/login` | – | `{ username, password, remember? }` | `200 { user }`, **user includes `password` hash** (KI-07) + `Set-Cookie: connect.sid` (HttpOnly; `Expires` +30 days if `remember` is truthy) | 400 text `Bad Request` if a field is missing. 401 text `Unauthorized` for wrong credentials (KI-13) |
| POST | `/logout` | – | – | **302 → `/`**, clears the cookie, destroys the session | KI-14 |
| GET | `/checkAuth` | – | – | `200 { user }` | 401 `{"error":"User is unauthorized"}` |

## Users (`backend/user-routes.ts`)

| Method | Path | Auth | Purpose & validation | Response | Side effects / notes |
|---|---|---|---|---|---|
| GET | `/users` | 🔒 | all users **except the caller** | `200 { results: User[] }` (with password hashes) | used by the New Transaction screen |
| GET | `/users/search?q=` | 🔒 | `q` required (else 422). Fuse.js fuzzy search over firstName, lastName, username, email, phoneNumber. **`q` is stripped of every non-alphanumeric character first** | `200 { results: User[] }` | caller excluded, so searching your own phone returns `[]` |
| POST | `/users` | – | sign-up. `oneOf`: at least one of firstName/lastName/password/balance/avatar/defaultPrivacyLevel present. Optional type checks: strings; `balance` numeric; `avatar` URL; `defaultPrivacyLevel` ∈ public/private/contacts | **`201 { user }`** | creates the user with a bcrypt-hashed password, `balance` = given cents or 0. Missing password → 500. **Duplicate usernames accepted** (KI-15) |
| GET | `/users/:userId` | 🔒 | shortid. **Ownership check**: another user's id → 401 | `200 { user }` | the only owner-checked route |
| GET | `/users/profile/:username` | – | public profile | `200 { user: { firstName, lastName, avatar } }` | unknown username → `{ user: {} }` |
| PATCH | `/users/:userId` | 🔒 | `oneOf` firstName/lastName/password/balance/avatar/defaultPrivacyLevel + `isUserValidator` types | **204** | `Object.assign(user, body)`: any field, any user, password stored **in plain text** (KI-03, KI-04, KI-16). The UI uses it for settings and then sends `REFRESH` |

## Contacts (`backend/contact-routes.ts`)

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/contacts/:username` | **–** | – | `200 { contacts: Contact[] }` | no auth. Unknown username → 500 (KI-08) |
| POST | `/contacts` | 🔒 | `{ contactUserId }` (shortid) | `200 { contact }` | contact is created for the caller. No duplicate or existence checks |
| DELETE | `/contacts/:contactId` | 🔒 | shortid | `200 {}` | unknown id deletes **every** contact (KI-01). No owner check |

The OpenAPI spec models `GET /contacts/{username}` and `DELETE /contacts/{contactId}` as one path, `/contacts/{usernameOrContactId}`, because Express shares the segment. There is no UI for contacts. They come from the seed (3 per user) and drive the "Friends" feed.

## Bank accounts (REST, `backend/bankaccount-routes.ts`)

| Method | Path | Auth | Request / validation | Response | Notes |
|---|---|---|---|---|---|
| GET | `/bankAccounts` | 🔒 | – | `200 { results: BankAccount[] }` | caller's accounts, **including soft-deleted ones** (`isDeleted: true`) |
| GET | `/bankAccounts/:bankAccountId` | 🔒 | shortid | `200 { account }` | any user's account (KI-06). Unknown → `200 {}` |
| POST | `/bankAccounts` | 🔒 | `bankName`, `accountNumber`, `routingNumber`: `isString().trim()` only | `200 { account }` | `userId` = caller, `isDeleted: false`. Length rules exist **only in the UI** (Yup) |
| DELETE | `/bankAccounts/:bankAccountId` | 🔒 | shortid | `200 {}` | **soft delete** (`isDeleted: true`). No owner check |

## GraphQL

Endpoint `/graphql`, code in `backend/graphql/`. The UI's bank-account screens use **GraphQL, not REST** (`src/machines/bankAccountsMachine.ts`).

```graphql
type Query    { listBankAccount: [BankAccount!] }
type Mutation {
  createBankAccount(bankName: String!, accountNumber: String!, routingNumber: String!): BankAccount
  deleteBankAccount(id: ID!): Boolean
}
type BankAccount { id: ID! uuid: String userId: String bankName: String accountNumber: String
                   routingNumber: String isDeleted: Boolean createdAt: String modifiedAt: String }
```

| Operation (UI `operationName`) | Resolver | Behaviour |
|---|---|---|
| `query ListBankAccount { listBankAccount {…} }` | `getBankAccountsByUserId(ctx.user.id)` | caller's accounts, soft-deleted included |
| `mutation CreateBankAccount($bankName,$accountNumber,$routingNumber)` | `createBankAccountForUser(ctx.user.id, args)` | same as REST POST |
| `mutation DeleteBankAccount($id)` | `removeBankAccountById(id)` | soft delete, always returns `true` |

- `POST /graphql` with body `{ operationName?, query, variables? }`. **No HTTP-level auth.** Logged out, you get
  `200 {"errors":[{"message":"TypeError: Cannot read properties of undefined (reading 'id')"…}],"data":{"listBankAccount":null}}` (verified, KI-09).
- `GET /graphql` always serves the **GraphQL Playground** HTML page (KI-26).
- Missing query → 400. Non-JSON body → 415 (KI-27).

## Bank transfers (`backend/banktransfer-routes.ts`)

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| GET | `/bankTransfers` | 🔒 | `200 { transfers: BankTransfer[] }` (note the key name, not `results`) | read-only. New transfers are only created internally when a payment exceeds the sender's balance (withdrawal). No UI |

## Transactions (`backend/transaction-routes.ts`)

### Feeds (all 🔒, all paginated)

| Method | Path | Data source (`database.ts`) | Query params | Notes |
|---|---|---|---|---|
| GET | `/transactions` | `getTransactionsForUserForApi(me)`: every transaction where I am sender **or** receiver, sorted by `modifiedAt` desc | `status` (pending/incomplete/complete), `requestStatus` (pending/accepted/rejected), `receiverId`, `senderId`, `dateRangeStart`+`dateRangeEnd` (ISO, both needed), `amountMin`+`amountMax` (cents, both needed, max **exclusive**), `page`, `limit` | "Mine" tab. Invalid `status`/`requestStatus` → 422. **Unknown params become exact-match filters** and return nothing (KI-22) |
| GET | `/transactions/contacts` | `getTransactionsForUserContacts(me)`: all transactions of each of my contacts (any privacy level!), unique by id, sorted per contact (KI-23) | same as above | "Friends" tab |
| GET | `/transactions/public` | page 1: **first 5 contact transactions** + public transactions not involving my contacts. Pages ≥ 2: only the public list | `order` (only `default`, else 422), date/amount ranges, `page`, `limit` | "Everyone" tab. `totalPages` differs between page 1 and later pages (KI-20), and page 2 starts at item 10 of the public list, so **items 5–9 are never shown** with the default limit (verified) |

Each item in a feed is a **`TransactionResponseItem`**: the transaction fields plus `senderName`, `receiverName`,
`senderAvatar`, `receiverAvatar`, `likes: Like[]` and `comments: Comment[]`.

### Single transaction

| Method | Path | Auth | Request / validation | Response | Side effects |
|---|---|---|---|---|---|
| POST | `/transactions` | 🔒 | `transactionType` ∈ {`payment`,`request`} · `receiverId` string · `description` string · `amount` numeric → **`toInt()`** · `privacyLevel?` ∈ public/private/contacts · `source?` string | `200 { transaction }` | see the lifecycle below. `senderId` is always the caller (any `senderId` in the body is ignored) |
| GET | `/transactions/:transactionId` | 🔒 | shortid | `200 { transaction: TransactionResponseItem }` | none. No privacy/owner check (KI-06). Unknown id → **500 HTML** |
| PATCH | `/transactions/:transactionId` | 🔒 | shortid · `requestStatus` ∈ pending/accepted/rejected (required) | **204** | whole body assigned. For request transactions it moves money, see below (KI-05). Unknown id → 500 |

#### What `POST /transactions` does (`createTransaction`, `database.ts:524`)

| Step | Payment | Request |
|---|---|---|
| Stored `amount` | `amount × 100` (body is dollars → cents) | same |
| `privacyLevel` | body value or the **sender's `defaultPrivacyLevel`** | same |
| `status` / `requestStatus` | `pending` → **`complete`** / `undefined` | `pending` / **`pending`** |
| Sender balance | **debited**. If balance − amount ≤ 0: a `withdrawal` bank transfer for the difference is created and the balance is set to 0 | unchanged |
| Receiver balance | **credited** | unchanged |
| Notification | `payment` notification `status: "received"` for the **receiver** | `payment` notification `status: "requested"` for the **receiver** |

#### What `PATCH /transactions/:id` does (`updateTransactionById`, `database.ts:578`)

If the transaction has a non-empty `requestStatus` (it is a request), then **regardless of the new value**:
the receiver (the payer) is debited, the sender (the requester) is credited, `status` becomes `complete`, and a
`received` notification goes to the sender. A **rejection therefore still transfers the money**. Repeating the call
transfers it again. Verified in an isolated copy (KI-05). For payments, the body is just assigned.

## Likes (`backend/like-routes.ts`)

| Method | Path | Auth | Response | Side effects |
|---|---|---|---|---|
| GET | `/likes/:transactionId` | 🔒 | `200 { likes: Like[] }` | – |
| POST | `/likes/:transactionId` | 🔒 | `200` text `OK` (KI-12). Unknown transaction → 500 | creates a like **and two `like` notifications (sender and receiver), even when you are one of them** (the condition `userId !== senderId \|\| userId !== receiverId` is almost always true). Liking twice is allowed by the API. The UI disables the button (KI-24) |

## Comments (`backend/comment-routes.ts`)

| Method | Path | Auth | Request | Response | Side effects |
|---|---|---|---|---|---|
| GET | `/comments/:transactionId` | 🔒 | – | `200 { comments: Comment[] }` | – |
| POST | `/comments/:transactionId` | 🔒 | `{ content }` (string; empty allowed) | `200` text `OK`. Unknown transaction → 500 | comment + two `comment` notifications (sender and receiver), same rule as likes |

## Notifications (`backend/notification-routes.ts`)

| Method | Path | Auth | Request / validation | Response | Notes |
|---|---|---|---|---|---|
| GET | `/notifications` | 🔒 | – | `200 { results: NotificationResponseItem[] }` | **only unread** (`isRead: false`) for the caller, sorted by `modifiedAt` desc, each with `userFullName` |
| POST | `/notifications/bulk` | 🔒 | `{ items: [{ type: payment\|like\|comment, transactionId, status? \| likeId? \| commentId? }] }` | `200 { results }` | creates notifications **for the caller**. Missing `items` → 500. Mismatched items → `null` (KI-17). Not used by the UI |
| PATCH | `/notifications/:notificationId` | 🔒 | `isRead` boolean (required) | **204** | whole body assigned. Unknown id updates the **first** notification (KI-02). No owner check |

`userFullName` rules (`formatNotificationForApiResponse`): the default is the notification owner's name. For request
transactions it is the requester's name. For likes and comments it is the liker's or commenter's name. So a payment receiver reads
"**<their own name>** received payment." The Cypress test asserts this text.

## Test data (`backend/testdata-routes.ts`). Only when `NODE_ENV` is `development` or `test`, no auth

| Method | Path | Response | Notes |
|---|---|---|---|
| POST | `/testData/seed` | `200` text `OK` | `db.setState(<process.cwd()>/data/database-seed.json).write()`: resets everything **for every user and test** |
| GET | `/testData/:entity` | `200 { results: [...] }` | entity ∈ users, contacts, bankaccounts, notifications, transactions, likes, comments, banktransfers. Otherwise 422. Returns raw DB rows, including password hashes |

## Miscellaneous

| Method | Path | Response |
|---|---|---|
| GET | `/` | text `Cypress Realworld App - backend` |
| GET | `/__coverage__` | backend Istanbul coverage JSON (present because the API runs under `nyc`) |
| GET | static | files from `public/` (favicon, manifest, …) |

## Quick recipes (curl)

```bash
# reset data (no auth)
curl -s -X POST http://localhost:3001/testData/seed
# log in and keep the cookie
curl -s -c /tmp/rwa.cookies -H 'Content-Type: application/json' \
     -d '{"username":"Heath93","password":"s3cret"}' http://localhost:3001/login
# my feed, page 2, 5 per page, pending requests only
curl -s -b /tmp/rwa.cookies "http://localhost:3001/transactions?page=2&limit=5&requestStatus=pending"
# pay user GjWovtg2hr $12 (stored as 1200 cents)
curl -s -b /tmp/rwa.cookies -H 'Content-Type: application/json' \
     -d '{"transactionType":"payment","receiverId":"GjWovtg2hr","amount":12,"description":"lunch"}' \
     http://localhost:3001/transactions
# GraphQL bank accounts
curl -s -b /tmp/rwa.cookies -H 'Content-Type: application/json' \
     -d '{"query":"{ listBankAccount { id bankName isDeleted } }"}' http://localhost:3001/graphql
```

In tests, use the Playwright API layer (`playwright/src/api/*.ts`, routes in `endpoints.ts`) instead of hand-written URLs.
