import test from "node:test";
import assert from "node:assert/strict";
import sessionHandler from "../api/admin-session.js";
import { buildAdminCookie } from "../api/admin-login.js";
import contentHandler from "../api/admin-content.js";
import uploadHandler from "../api/admin-upload.js";

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

test("content endpoint rejects embedded assets before touching the database", async () => {
  const response = createResponse();
  await contentHandler({
    method: "PUT",
    headers: { cookie: buildAdminCookie().split(";")[0] },
    body: {
      profile: { avatar_url: "data:image/png;base64,aGVsbG8=" }
    }
  }, response);

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.code, "EMBEDDED_ASSET_REJECTED");
});

test("upload ticket endpoint rejects missing metadata", async () => {
  const response = createResponse();
  await uploadHandler({
    method: "POST",
    headers: { cookie: buildAdminCookie().split(";")[0] },
    body: {}
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "INVALID_UPLOAD_METADATA");
});

test("upload ticket endpoint rejects files larger than 8 MB", async () => {
  const response = createResponse();
  await uploadHandler({
    method: "POST",
    headers: { cookie: buildAdminCookie().split(";")[0] },
    body: {
      fileName: "large.png",
      contentType: "image/png",
      size: 9 * 1024 * 1024
    }
  }, response);

  assert.equal(response.statusCode, 413);
  assert.equal(response.body.code, "FILE_TOO_LARGE");
});
