const request = require("supertest");
const http    = require("http");

// We boot a test instance of the Express app (without connecting to real MongoDB)
// by mocking mongoose and using an in-memory approach.
// For full integration tests, set MONGODB_URI to a test DB.

let app;
let server;

beforeAll(async () => {
  process.env.MONGODB_URI   = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/slateboard-test";
  process.env.JWT_SECRET    = "test-jwt-secret";
  process.env.SESSION_SECRET= "test-session-secret";
  process.env.PORT          = "3099";

  // Require after env is set
  app    = require("../server/index");
  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

afterAll(async () => {
  const mongoose = require("mongoose");
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
});

describe("Auth Routes — /api/v1/auth", () => {
  const testEmail = `test-${Date.now()}@slateboard.test`;
  const testPass  = "Test@1234";
  let authCookie  = "";

  test("POST /register → 201 with token", async () => {
    const res = await request(`http://localhost:3099`)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: testPass, displayName: "Test User" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    // Save cookie for subsequent requests
    authCookie = res.headers["set-cookie"] ? res.headers["set-cookie"][0] : "";
  });

  test("POST /register duplicate email → 409", async () => {
    const res = await request(`http://localhost:3099`)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: testPass });
    expect(res.status).toBe(409);
  });

  test("POST /login valid credentials → 200", async () => {
    const res = await request(`http://localhost:3099`)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPass });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("POST /login wrong password → 401", async () => {
    const res = await request(`http://localhost:3099`)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  test("POST /login unknown email → 401", async () => {
    const res = await request(`http://localhost:3099`)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@nowhere.test", password: "irrelevant" });
    expect(res.status).toBe(401);
  });

  test("GET /me with session cookie → 200", async () => {
    const res = await request(`http://localhost:3099`)
      .get("/api/v1/auth/me")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  test("DELETE /logout → 200", async () => {
    const res = await request(`http://localhost:3099`)
      .delete("/api/v1/auth/logout")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
