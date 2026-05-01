process.env.JWT_SECRET = "test-secret";
process.env.DYNAMODB_TABLE_USERS = "users-test";
process.env.DYNAMODB_TABLE_FAVORITES = "favorites-test";
process.env.DYNAMODB_TABLE_REVOKED_TOKENS = "revoked-test";

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const userRepository = require("../src/repositories/userRepository");
const revokedTokenRepository = require("../src/repositories/revokedTokenRepository");
const { createAccessToken } = require("../src/services/tokenService");

jest.mock("../src/repositories/userRepository");
jest.mock("../src/repositories/revokedTokenRepository");

describe("auth flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("signup hashes password and returns token", async () => {
    userRepository.getUserByEmail.mockResolvedValue(null);
    userRepository.createUser.mockResolvedValue();

    const response = await request(app).post("/auth/signup").send({
      name: "Avery",
      email: "avery@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    expect(userRepository.createUser).toHaveBeenCalledTimes(1);
    const createArg = userRepository.createUser.mock.calls[0][0];
    expect(createArg.passwordHash).toBeDefined();
    expect(createArg.passwordHash).not.toBe("secret123");
    const matches = await bcrypt.compare("secret123", createArg.passwordHash);
    expect(matches).toBe(true);
  });

  test("login returns token for valid credentials", async () => {
    const passwordHash = await bcrypt.hash("secret123", 10);
    userRepository.getUserByEmail.mockResolvedValue({
      userId: "user-1",
      email: "avery@example.com",
      name: "Avery",
      passwordHash,
    });

    const response = await request(app).post("/auth/login").send({
      email: "avery@example.com",
      password: "secret123",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.userId).toBe("user-1");
  });

  test("logout revokes token jti", async () => {
    revokedTokenRepository.isTokenRevoked.mockResolvedValue(false);
    revokedTokenRepository.revokeToken.mockResolvedValue();
    const { token } = createAccessToken({
      userId: "user-1",
      email: "avery@example.com",
      name: "Avery",
    });
    const response = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(revokedTokenRepository.revokeToken).toHaveBeenCalledTimes(1);
    const arg = revokedTokenRepository.revokeToken.mock.calls[0][0];
    expect(arg.jti).toBeDefined();
    expect(typeof arg.expiresAtUnix).toBe("number");
  });

  test("me returns authenticated user profile", async () => {
    revokedTokenRepository.isTokenRevoked.mockResolvedValue(false);
    const { token } = createAccessToken({
      userId: "user-77",
      email: "maya@example.com",
      name: "Maya",
    });

    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      userId: "user-77",
      email: "maya@example.com",
      name: "Maya",
    });
  });

  test("logout rejects revoked token", async () => {
    revokedTokenRepository.isTokenRevoked.mockResolvedValue(true);
    const { token } = createAccessToken({
      userId: "user-1",
      email: "avery@example.com",
      name: "Avery",
    });

    const response = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token has been revoked");
    expect(revokedTokenRepository.revokeToken).not.toHaveBeenCalled();
  });
});
