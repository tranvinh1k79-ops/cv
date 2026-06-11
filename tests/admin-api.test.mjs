import test from "node:test";
import assert from "node:assert/strict";
import sessionHandler from "../api/admin-session.js";
import { buildAdminCookie } from "../api/admin-login.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("admin session endpoint rejects a missing cookie", async () => {
  const response = createResponse();
  await sessionHandler({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { authenticated: false });
});

test("admin session endpoint accepts a valid cookie", async () => {
  const response = createResponse();
  await sessionHandler({
    method: "GET",
    headers: { cookie: buildAdminCookie().split(";")[0] }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { authenticated: true });
});

test("admin session endpoint rejects unsupported methods", async () => {
  const response = createResponse();
  await sessionHandler({ method: "POST", headers: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "GET");
});
