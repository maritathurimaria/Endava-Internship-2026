import type {
  BankAccount,
  Comment,
  Like,
  Notification,
  NotificationResponseItem,
  PageData,
  Paginated,
  Transaction,
  TransactionResponseItem,
  User,
} from "@models";
import { env } from "@config";

/**
 * Pure data factories for stubs, fixtures and payloads.
 *
 * - Deterministic: no randomness. Ids, uuids and timestamps derive from `seq` (default 1),
 *   so the same call always returns the same object: `buildUser({}, 2).id === "usr00002"`.
 * - Overrides win: assert on values you pass in, never on defaults.
 * - Frozen results, like every other value the framework hands out.
 * - Build several at once with `buildList(buildUser, 3)` (seq 1…3, unique ids).
 *
 * Ids look like the app's shortids (`^[A-Za-z0-9_-]{6,}$`), amounts are cents, dates are UTC ISO strings.
 */

export type Builder<T> = (overrides?: Partial<T>, seq?: number) => Readonly<T>;

const KINDS = { usr: 1, txn: 2, bnk: 3, ntf: 4, lik: 5, cmt: 6 } as const;
type Kind = keyof typeof KINDS;

/** `usr00001`, `txn00042`… */
export const mockId = (kind: Kind, seq = 1): string => `${kind}${String(seq).padStart(5, "0")}`;

/** A valid v4-shaped uuid that is unique per kind + seq. */
export const mockUuid = (kind: Kind, seq = 1): string =>
  `00000000-0000-4000-8000-${(KINDS[kind] * 1_000_000 + seq).toString(16).padStart(12, "0")}`;

const BASE_TIME = Date.UTC(2024, 0, 1); // 2024-01-01T00:00:00.000Z

/** One minute after the base time per seq: later seq → newer item. */
export const mockTimestamp = (seq = 1): string => new Date(BASE_TIME + seq * 60_000).toISOString();

const stamps = (kind: Kind, seq: number) => ({
  id: mockId(kind, seq),
  uuid: mockUuid(kind, seq),
  createdAt: mockTimestamp(seq),
  modifiedAt: mockTimestamp(seq),
});

/** Drop keys whose value is `undefined` (the app uses `has("status")`-style checks on notifications). */
const compact = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

const FIRST_NAMES = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Donald", "Margaret", "Linus"] as const;
const LAST_NAMES = ["Lovelace", "Hopper", "Turing", "Dijkstra", "Liskov", "Knuth", "Hamilton", "Torvalds"] as const;
const pick = <T>(items: readonly T[], seq: number): T => items[(seq - 1) % items.length];

// ---- entities ---------------------------------------------------------------------------------

export const buildUser: Builder<User> = (overrides = {}, seq = 1) => {
  const firstName = overrides.firstName ?? pick(FIRST_NAMES, seq);
  const lastName = overrides.lastName ?? pick(LAST_NAMES, seq);
  return Object.freeze({
    ...stamps("usr", seq),
    firstName,
    lastName,
    username: `${firstName}${seq}`,
    password: env.defaultPassword,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    phoneNumber: `555-010-${String(seq).padStart(4, "0")}`,
    balance: 100_000,
    avatar: `https://example.com/avatars/${firstName.toLowerCase()}.svg`,
    defaultPrivacyLevel: "public" as const,
    ...overrides,
  });
};

export const buildTransaction: Builder<Transaction> = (overrides = {}, seq = 1) =>
  Object.freeze({
    ...stamps("txn", seq),
    source: mockId("bnk", 1),
    amount: 1_000 * seq,
    description: `Mock payment ${seq}`,
    privacyLevel: "public" as const,
    senderId: mockId("usr", 1),
    receiverId: mockId("usr", 2),
    status: "complete" as const,
    requestStatus: "" as const,
    ...overrides,
  });

export const buildLike: Builder<Like> = (overrides = {}, seq = 1) =>
  Object.freeze({ ...stamps("lik", seq), userId: mockId("usr", 1), transactionId: mockId("txn", 1), ...overrides });

export const buildComment: Builder<Comment> = (overrides = {}, seq = 1) =>
  Object.freeze({
    ...stamps("cmt", seq),
    content: `Mock comment ${seq}`,
    userId: mockId("usr", 1),
    transactionId: mockId("txn", 1),
    ...overrides,
  });

/**
 * A feed item as the GET endpoints return it. Names default to the users built with the same
 * ids (`buildUser({}, 1)` sends to `buildUser({}, 2)`); pass `senderName`/`receiverName` to change them.
 */
export const buildTransactionResponseItem: Builder<TransactionResponseItem> = (overrides = {}, seq = 1) => {
  const base = buildTransaction(overrides, seq);
  const userSeq = (id: string) => Number(/^usr(\d{5})$/.exec(id)?.[1] ?? 1);
  const sender = buildUser({}, userSeq(base.senderId));
  const receiver = buildUser({}, userSeq(base.receiverId));
  return Object.freeze({
    ...base,
    senderName: `${sender.firstName} ${sender.lastName}`,
    receiverName: `${receiver.firstName} ${receiver.lastName}`,
    senderAvatar: sender.avatar,
    receiverAvatar: receiver.avatar,
    likes: [],
    comments: [],
    ...overrides,
  });
};

export const buildBankAccount: Builder<BankAccount> = (overrides = {}, seq = 1) =>
  Object.freeze({
    ...stamps("bnk", seq),
    userId: mockId("usr", 1),
    bankName: `Mock Bank ${seq}`,
    accountNumber: String(100_000_000 + seq),
    routingNumber: String(200_000_000 + seq),
    isDeleted: false,
    ...overrides,
  });

export type NotificationKind = "like" | "comment" | "requested" | "received";

/**
 * A `GET /notifications` item. `kind` picks the variant the UI renders:
 * like → "<name> liked a transaction.", comment → "commented on", requested/received → payment.
 */
export const buildNotification = (
  overrides: Partial<NotificationResponseItem> & { kind?: NotificationKind } = {},
  seq = 1,
): Readonly<NotificationResponseItem> => {
  const { kind = "like", ...rest } = overrides;
  const variant: Partial<Notification> =
    kind === "like"
      ? { likeId: mockId("lik", seq) }
      : kind === "comment"
        ? { commentId: mockId("cmt", seq) }
        : { status: kind };
  return Object.freeze(
    compact({
      ...stamps("ntf", seq),
      userId: mockId("usr", 1),
      transactionId: mockId("txn", seq),
      isRead: false,
      userFullName: `${pick(FIRST_NAMES, seq + 1)} ${pick(LAST_NAMES, seq + 1)}`,
      ...variant,
      ...rest,
    }),
  );
};

// ---- collections ------------------------------------------------------------------------------

/** `count` items with seq 1…count (or from `start`). `overrides` may depend on the index. */
export const buildList = <T, O = Partial<T>>(
  build: (overrides?: O, seq?: number) => Readonly<T>,
  count: number,
  overrides: O | ((index: number) => O) = {} as O,
  start = 1,
): ReadonlyArray<Readonly<T>> =>
  Object.freeze(
    Array.from({ length: count }, (_, i) =>
      build(typeof overrides === "function" ? (overrides as (index: number) => O)(i) : overrides, start + i),
    ),
  );

/** A paginated body `{ pageData, results }` like the transaction feeds return. */
export const buildPage = <T>(
  items: ReadonlyArray<T>,
  pageData: Partial<PageData> = {},
): Readonly<Paginated<T>> => {
  const limit = pageData.limit ?? env.paginationPageSize;
  const page = pageData.page ?? 1;
  const totalPages = pageData.totalPages ?? Math.max(page, Math.ceil(items.length / limit));
  return Object.freeze({
    pageData: Object.freeze({ page, limit, totalPages, hasNextPages: page < totalPages, ...pageData }),
    results: [...items],
  });
};

/** `{ pageData, results: [] }` — what an empty feed returns. */
export const emptyPage = <T = TransactionResponseItem>(): Readonly<Paginated<T>> =>
  buildPage<T>([], { totalPages: 0, hasNextPages: false });
