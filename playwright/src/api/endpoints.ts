/** Every backend route the framework touches, in one place. Paths are relative to API_URL. */
export const endpoints = Object.freeze({
  login: "/login",
  logout: "/logout",
  checkAuth: "/checkAuth",

  users: "/users",
  user: (userId: string) => `/users/${userId}`,
  userSearch: "/users/search",
  userProfile: (username: string) => `/users/profile/${username}`,

  transactions: "/transactions",
  transaction: (transactionId: string) => `/transactions/${transactionId}`,
  contactsTransactions: "/transactions/contacts",
  publicTransactions: "/transactions/public",

  bankAccounts: "/bankAccounts",
  bankAccount: (bankAccountId: string) => `/bankAccounts/${bankAccountId}`,
  bankTransfers: "/bankTransfers",

  contacts: "/contacts",
  contactsFor: (username: string) => `/contacts/${username}`,
  contact: (contactId: string) => `/contacts/${contactId}`,

  likes: (transactionId: string) => `/likes/${transactionId}`,
  comments: (transactionId: string) => `/comments/${transactionId}`,

  notifications: "/notifications",
  notificationsBulk: "/notifications/bulk",
  notification: (notificationId: string) => `/notifications/${notificationId}`,

  graphql: "/graphql",

  testDataSeed: "/testData/seed",
  testData: (entity: string) => `/testData/${entity}`,
});
