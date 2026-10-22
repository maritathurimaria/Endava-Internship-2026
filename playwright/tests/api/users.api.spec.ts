import { faker } from "@faker-js/faker";
import { test, expect } from "@fixtures/api";
import { users as usersApi, auth, errorsOf } from "@api";

const newUserPayload = () => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  username: faker.internet.username(),
  password: faker.internet.password(),
  email: faker.internet.email(),
  phoneNumber: faker.phone.number(),
  avatar: faker.image.avatar(),
});

test.describe("Users API", () => {
  test.describe("GET /users", () => {
    test("gets a list of users", async ({ api }) => {
      const res = await usersApi.listUsers(api);
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(1);
    });
  });

  test.describe("GET /users/:userId", () => {
    test("gets a user", async ({ api, me }) => {
      const res = await usersApi.getUser(api, me.id);
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty("firstName");
    });

    test("errors when invalid userId", async ({ api }) => {
      const res = await usersApi.getUser(api, "1234");
      expect(res.status).toBe(422);
      expect(errorsOf(res)).toHaveLength(1);
    });
  });

  test.describe("GET /users/profile/:username", () => {
    test("gets a user profile by username", async ({ api, me }) => {
      const res = await usersApi.getUserProfile(api, me.username);
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ firstName: me.firstName, lastName: me.lastName, avatar: me.avatar });
      expect(res.body.user).not.toHaveProperty("balance");
    });
  });

  test.describe("GET /users/search", () => {
    for (const attr of ["email", "phoneNumber", "username"] as const) {
      test(`gets users by ${attr}`, async ({ api, users }) => {
        const searchUser = users[1];
        const res = await usersApi.searchUsers(api, searchUser[attr]);
        expect(res.status).toBe(200);
        expect(res.body.results[0]).toMatchObject({ firstName: searchUser.firstName });
      });
    }
  });

  test.describe("POST /users", () => {
    test("creates a new user", async ({ api }) => {
      const payload = newUserPayload();
      const res = await usersApi.createUser(api, payload);
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ firstName: payload.firstName });
    });

    test("creates a new user with an account balance in cents", async ({ api }) => {
      const payload = { ...newUserPayload(), balance: 100_00 };
      const res = await usersApi.createUser(api, payload);
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ firstName: payload.firstName, balance: 100_00 });
    });

    test("errors when an invalid field sent", async ({ api }) => {
      const res = await usersApi.createUser(api, { notAUserField: "not a user field" });
      expect(res.status).toBe(422);
      expect(errorsOf(res)).toHaveLength(1);
    });
  });

  test.describe("PATCH /users/:userId", () => {
    test("updates a user", async ({ api, me }) => {
      const res = await usersApi.updateUser(api, me.id, { firstName: faker.person.firstName() });
      expect(res.status).toBe(204);
    });

    test("errors when an invalid field sent", async ({ api, me }) => {
      const res = await usersApi.updateUser(api, me.id, { notAUserField: "not a user field" });
      expect(res.status).toBe(422);
      expect(errorsOf(res)).toHaveLength(1);
    });
  });

  test.describe("POST /login", () => {
    test("logs in as a user", async ({ api, users }) => {
      const res = await auth.login(api, users[0].username);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(users[0].id);
    });

    test("rejects an invalid password", async ({ api, users }) => {
      const res = await auth.login(api, users[0].username, "INVALID");
      expect(res.status).toBe(401);
    });
  });
});
