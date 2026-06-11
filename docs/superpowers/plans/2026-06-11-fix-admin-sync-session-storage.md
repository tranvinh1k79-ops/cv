# Admin Sync Session And Storage Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin Studio saves reliable across refreshes by using the server cookie as the only authentication truth, uploading files directly to Supabase Storage, and ensuring `/api/admin-content` only receives lightweight URL-based JSON.

**Architecture:** Add a server-validated admin session endpoint and replace the persisted browser-only admin flag with a checked/authenticated/unauthenticated state. Replace base64 uploads through Vercel functions with signed Supabase Storage uploads performed directly by the browser. Before every content save, migrate any legacy embedded files from localStorage to Storage one file at a time, then persist only URLs to `portfolio_content`.

**Tech Stack:** React 19, Vite, Vercel Functions, Node.js, Supabase Database, Supabase Storage, Node test runner.

---

## Root Cause Evidence

- Production Vercel logs on June 11, 2026 contain repeated `PUT /api/admin-content 401` responses while the UI still displayed “Signed in”.
- `src/App.jsx` currently uses `Boolean(session)` from `localStorage` as `isAdmin`, while `api/admin-content.js` requires the `portfolio_admin_session` cookie.
- A small authenticated production write returns `200`; the same write without the cookie returns `401 {"error":"Admin session required"}`.
- A large request to `/api/admin-content` returns `413 FUNCTION_PAYLOAD_TOO_LARGE` before the function runs.
- Therefore there are two required fixes:
  1. Browser admin state must be validated against the server cookie.
  2. File bytes must never be sent through `/api/admin-content` or a Vercel upload function.

## File Structure

- Create `api/admin-session.js`: validate the HttpOnly admin cookie.
- Modify `api/admin-upload.js`: issue a signed Supabase Storage upload ticket; do not accept base64 file bytes.
- Modify `api/admin-content.js`: reject embedded base64 and persist URL-only content.
- Modify `server/supabase-storage.js`: create signed upload tickets and public URLs.
- Create `src/services/adminApi.js`: typed admin API requests and status-aware errors.
- Create `src/services/adminAssetService.js`: direct signed uploads and legacy embedded-asset migration.
- Modify `src/App.jsx`: server-validated session state, safe hydration, direct uploads, and precise save errors.
- Create `tests/admin-api.test.mjs`: session and URL-only content API regression tests.
- Create `tests/admin-assets.test.mjs`: embedded-file migration regression tests.
- Modify `package.json`: add the Node test command.

---

### Task 1: Add Regression Test Harness

**Files:**
- Create: `tests/admin-api.test.mjs`
- Create: `tests/admin-assets.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the test command**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 2: Write a failing session-validation test**

Create `tests/admin-api.test.mjs` with response helpers and two tests:

```js
import test from "node:test";
import assert from "node:assert/strict";
import sessionHandler from "../api/admin-session.js";
import { buildAdminCookie } from "../api/admin-login.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
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
```

- [ ] **Step 3: Write a failing embedded-asset migration test**

Create `tests/admin-assets.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { prepareContentForSync } from "../src/services/adminAssetService.js";

test("prepareContentForSync uploads embedded project images and returns URL-only content", async () => {
  const uploaded = [];
  const content = {
    profile: null,
    cv: null,
    news: null,
    contact: null,
    projects: [{
      id: "project-1",
      slug: "project-1",
      app_demo_image_url: "data:image/png;base64,aGVsbG8=",
      app_demo_file_name: "demo.png",
      web_demo_image_url: ""
    }]
  };

  const result = await prepareContentForSync(content, async (asset) => {
    uploaded.push(asset);
    return "https://example.supabase.co/storage/v1/object/public/portfolio-assets/demo.png";
  });

  assert.equal(uploaded.length, 1);
  assert.match(result.projects[0].app_demo_image_url, /^https:/);
  assert.doesNotMatch(JSON.stringify(result), /data:image/);
});
```

- [ ] **Step 4: Run tests and verify RED**

Run:

```powershell
npm.cmd test
```

Expected: FAIL because `api/admin-session.js` and `src/services/adminAssetService.js` do not exist.

- [ ] **Step 5: Commit tests**

```powershell
git add package.json tests
git commit -m "test: cover admin session and asset sync"
```

---

### Task 2: Make The Server Cookie The Authentication Source Of Truth

**Files:**
- Create: `api/admin-session.js`
- Create: `src/services/adminApi.js`
- Modify: `src/App.jsx`
- Test: `tests/admin-api.test.mjs`

- [ ] **Step 1: Add the session validation endpoint**

Create `api/admin-session.js`:

```js
import { hasValidAdminSession } from "./admin-login.js";

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader?.("Allow", "GET");
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!hasValidAdminSession(request)) {
    response.status(401).json({ authenticated: false });
    return;
  }

  response.status(200).json({ authenticated: true });
}
```

- [ ] **Step 2: Add typed API errors**

Create `src/services/adminApi.js`:

```js
export class AdminApiError extends Error {
  constructor(message, status, code = "") {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

export async function adminJsonRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminApiError(
      body.detail || body.error || `Request failed (${response.status})`,
      response.status,
      body.code || ""
    );
  }
  return body;
}

export function validateAdminSession() {
  return adminJsonRequest("/api/admin-session");
}
```

- [ ] **Step 3: Replace persistent session truth in `PortfolioProvider`**

Modify `src/App.jsx`:

```js
const [sessionState, setSessionState] = useState({
  status: "checking",
  authenticated: false
});

useEffect(() => {
  let cancelled = false;
  validateAdminSession()
    .then(() => {
      if (!cancelled) setSessionState({ status: "ready", authenticated: true });
    })
    .catch(() => {
      if (!cancelled) setSessionState({ status: "ready", authenticated: false });
    });
  return () => {
    cancelled = true;
  };
}, []);
```

Expose `isAdmin: sessionState.authenticated` and `sessionStatus: sessionState.status`. Remove `STORAGE_KEYS.session` and the production password fallback. After successful login, set authenticated state only when `/api/admin-login` returns `200`. On logout or any `AdminApiError` with status `401`, set authenticated state to false.

- [ ] **Step 4: Prevent unauthenticated automatic writes**

Modify the hydration effect in `src/App.jsx` so it always performs public GET reads, but only calls backfill/sync writes after `sessionState.authenticated === true`. A stale local draft must remain in localStorage until the user logs in; it must not trigger repeated anonymous `PUT` requests.

- [ ] **Step 5: Render a checking state before Admin Studio**

Modify `AdminPage`:

```jsx
if (sessionStatus === "checking") {
  return <main className="admin-shell"><LoadingState label="Đang kiểm tra phiên admin..." /></main>;
}
if (!isAdmin) return <AdminLogin />;
```

- [ ] **Step 6: Run session tests**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: session tests PASS; build exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add api/admin-session.js src/services/adminApi.js src/App.jsx tests/admin-api.test.mjs
git commit -m "fix: validate admin session against server cookie"
```

---

### Task 3: Upload Files Directly To Supabase Storage

**Files:**
- Modify: `server/supabase-storage.js`
- Modify: `api/admin-upload.js`
- Create: `src/services/adminAssetService.js`
- Modify: `src/App.jsx`
- Test: `tests/admin-assets.test.mjs`

- [ ] **Step 1: Replace server-side byte upload with signed upload tickets**

Add to `server/supabase-storage.js`:

```js
export async function createSignedAssetUpload({ fileName, folder, contentType }) {
  const supabase = getSupabaseClient();
  await ensureAssetBucket(supabase);
  const path = createAssetPath({ fileName, folder, contentType });
  const { data, error } = await supabase.storage
    .from(ASSET_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error) throw error;
  const publicUrl = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
  return {
    bucket: ASSET_BUCKET,
    path,
    token: data.token,
    publicUrl
  };
}
```

Extract the existing safe path generation into `createAssetPath`. Keep bucket creation private and service-role-only.

- [ ] **Step 2: Change `/api/admin-upload` to accept metadata only**

Modify `api/admin-upload.js` so the authenticated request body is:

```json
{
  "fileName": "demo.webp",
  "folder": "projects/project-slug/app-demo",
  "contentType": "image/webp",
  "size": 131391
}
```

Validate:

```js
if (!fileName || !contentType) {
  response.status(400).json({ code: "INVALID_UPLOAD_METADATA", error: "Missing upload metadata" });
  return;
}
if (size > 8 * 1024 * 1024) {
  response.status(413).json({ code: "FILE_TOO_LARGE", error: "File exceeds the 8 MB limit" });
  return;
}
```

Return the signed ticket from `createSignedAssetUpload`. No base64 data may enter this endpoint.

- [ ] **Step 3: Implement browser-to-Storage upload**

Create `src/services/adminAssetService.js`:

```js
import { supabase } from "../lib/supabase";
import { adminJsonRequest } from "./adminApi";

export function isEmbeddedAsset(value) {
  return /^data:(image\/[^;,]+|application\/pdf);base64,/i.test(String(value || ""));
}

export async function uploadAssetDirect({ blob, fileName, folder }) {
  const ticket = await adminJsonRequest("/api/admin-upload", {
    method: "POST",
    body: JSON.stringify({
      fileName,
      folder,
      contentType: blob.type || "application/octet-stream",
      size: blob.size
    })
  });

  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, {
      contentType: blob.type,
      cacheControl: "31536000"
    });
  if (error) throw error;
  return ticket.publicUrl;
}

export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}
```

- [ ] **Step 4: Change `FileUploadField` to upload a Blob/File**

Modify `src/App.jsx` so optimized images are converted to a Blob in memory, then sent directly to Supabase with `uploadAssetDirect`. PDFs use the selected `File` directly. Do not place a data URL into React state or localStorage.

- [ ] **Step 5: Verify direct upload bypasses Vercel payload limits**

Run a local browser smoke test that selects the 1.65 MB sample image and confirms:

- `/api/admin-upload` request body contains metadata only and is under 2 KB.
- Supabase Storage receives the file.
- `/api/admin-content` receives a public URL and no `data:image`.

- [ ] **Step 6: Commit**

```powershell
git add api/admin-upload.js server/supabase-storage.js src/services/adminAssetService.js src/App.jsx tests/admin-assets.test.mjs
git commit -m "fix: upload admin assets directly to Supabase Storage"
```

---

### Task 4: Migrate Legacy localStorage Assets Before Content Saves

**Files:**
- Modify: `src/services/adminAssetService.js`
- Modify: `src/App.jsx`
- Modify: `api/admin-content.js`
- Test: `tests/admin-assets.test.mjs`

- [ ] **Step 1: Implement URL-only preparation**

Add `prepareContentForSync(content, uploader = uploadAssetDirect)` to `src/services/adminAssetService.js`. It must inspect these fields:

```text
profile.avatar_url
profile.cv_url
projects[].thumbnail_url
projects[].cover_url
projects[].app_demo_image_url
projects[].web_demo_image_url
news[].thumbnail_url
news[].cover_url
```

For every embedded asset:

1. Convert the data URL to a Blob.
2. Upload it directly to Storage.
3. Replace the embedded value with the returned public URL.
4. Preserve all unrelated content fields.

- [ ] **Step 2: Prepare content before every PUT**

Modify `persistDrafts` and browser-draft backfill in `src/App.jsx`:

```js
const preparedContent = await prepareContentForSync(nextContent);
applyDraftSnapshot(preparedContent);
const storedContent = await writeFileBackedContent(preparedContent);
applyDraftSnapshot(storedContent);
```

Applying `preparedContent` before the database PUT ensures that if the final PUT fails, localStorage still contains Storage URLs and does not re-upload the same files.

- [ ] **Step 3: Enforce the server invariant**

Modify `api/admin-content.js` to reject embedded files instead of migrating them:

```js
if (/data:(?:image\/[^;,]+|application\/pdf);base64,/i.test(JSON.stringify(content))) {
  response.status(422).json({
    code: "EMBEDDED_ASSET_REJECTED",
    error: "Upload assets to Storage before saving content"
  });
  return;
}
```

Remove `migrateContentAssets` from the normal content write path. This guarantees `portfolio_content` remains URL-only and prevents accidental payload growth.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: all tests PASS and build exits `0`.

- [ ] **Step 5: Commit**

```powershell
git add src/services/adminAssetService.js src/App.jsx api/admin-content.js tests/admin-assets.test.mjs
git commit -m "fix: migrate legacy browser assets before content sync"
```

---

### Task 5: Surface Exact Save Errors And Recovery Actions

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Test: `tests/admin-api.test.mjs`

- [ ] **Step 1: Map API errors to actionable states**

In `persistDrafts`, handle:

```js
if (error.status === 401) {
  expireAdminSession();
  setSyncState({
    status: "error",
    message: "Phiên admin đã hết hạn. Đăng nhập lại để lưu dữ liệu."
  });
} else if (error.status === 413) {
  setSyncState({
    status: "error",
    message: "Dữ liệu gửi lên quá lớn. File phải được tải lên Storage trước."
  });
} else {
  setSyncState({
    status: "error",
    message: `Không thể lưu dữ liệu: ${error.message}`
  });
}
```

- [ ] **Step 2: Stop editors from showing false success**

Ensure `saveProfile`, `saveCv`, `saveProjects`, `saveNews`, and `saveContact` all return the awaited save result. Each editor must show success only after the API returns `200`.

- [ ] **Step 3: Add a re-login action**

When the sync state is a `401`, Admin Studio must switch to `AdminLogin` while preserving all drafts in localStorage. After login succeeds, retry a single prepared URL-only sync.

- [ ] **Step 4: Verify error behavior**

Test these cases:

1. localStorage says signed in but no cookie: Admin Login appears, no anonymous PUT occurs.
2. cookie expires during a save: draft remains, exact session-expired message appears, login is required.
3. database returns `500`: draft remains and the actual API detail is shown.

- [ ] **Step 5: Commit**

```powershell
git add src/App.jsx src/styles.css tests/admin-api.test.mjs
git commit -m "fix: show actionable admin sync failures"
```

---

### Task 6: Production Verification And Deployment

**Files:**
- No source files.

- [ ] **Step 1: Run the full local verification**

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Deploy to the correct Vercel project**

```powershell
npx.cmd --yes vercel@latest link --project cv --yes
npx.cmd --yes vercel@latest --prod --yes
```

Expected alias: `https://ngyen2k3-cv.vercel.app`.

- [ ] **Step 3: Verify session behavior on production**

Verify:

- `GET /api/admin-session` without cookie returns `401`.
- Login with the configured admin password returns `200` and a cookie.
- `GET /api/admin-session` with that cookie returns `200`.
- A stale browser localStorage flag without a cookie shows the login form instead of Admin Studio.

- [ ] **Step 4: Verify direct Storage upload**

Upload a demo image larger than 1 MB and confirm:

- `/api/admin-upload` returns a signed ticket.
- Direct Supabase upload succeeds.
- Public asset URL returns `200`.
- Saved `portfolio_content` contains the public URL.
- F5 preserves the image.

- [ ] **Step 5: Verify database invariant**

Read `portfolio_content.content` and assert:

```js
const serialized = JSON.stringify(content);
if (/data:(?:image\/[^;,]+|application\/pdf);base64,/i.test(serialized)) {
  throw new Error("Database still contains embedded assets");
}
```

Expected: no embedded assets and content payload remains well below 1 MB.

- [ ] **Step 6: Review Vercel logs**

```powershell
npx.cmd --yes vercel@latest logs ngyen2k3-cv.vercel.app --since 30m --limit 100
```

Expected after re-login and save:

- Upload ticket endpoint: `200` or `201`.
- Content write: `200`.
- No unexpected `401` or `413`.

- [ ] **Step 7: Commit any verification script changes and push**

```powershell
git status --short
git push origin main
```

---

## Acceptance Criteria

- Admin Studio never displays “Signed in” when the server cookie is invalid.
- Missing/expired cookie leads to re-login without deleting drafts.
- Image and PDF bytes upload directly from browser to Supabase Storage.
- `/api/admin-content` only receives URL-based JSON and never receives embedded base64.
- Existing embedded localStorage assets are migrated one at a time before content sync.
- Successful save survives F5 and a different browser/device.
- Save errors show the real cause and recovery action.
- Production Vercel logs contain successful content writes and no recurring unexplained `401`/`413`.
