import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return Promise.resolve(request.body);
  if (typeof request.body === "string") {
    try {
      return Promise.resolve(JSON.parse(request.body));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    request.on("error", reject);
  });
}

function safeEqual(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.ADMIN_PASSWORD ||
    "local-admin-session"
  );
}

function createSessionToken() {
  return createHmac("sha256", getSessionSecret()).update("portfolio-admin").digest("hex");
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf("=");
        if (separatorIndex === -1) return [cookie, ""];
        return [
          decodeURIComponent(cookie.slice(0, separatorIndex)),
          decodeURIComponent(cookie.slice(separatorIndex + 1))
        ];
      })
  );
}

export function hasValidAdminSession(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return safeEqual(cookies[ADMIN_SESSION_COOKIE] || "", createSessionToken());
}

export function buildAdminCookie({ clear = false } = {}) {
  const value = clear ? "" : createSessionToken();
  const maxAge = clear ? 0 : SESSION_MAX_AGE;
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { password = "" } = await readJsonBody(request);
  const adminPassword = process.env.ADMIN_PASSWORD || "1";

  if (!safeEqual(password, adminPassword)) {
    response.status(401).json({ error: "Sai mật khẩu admin." });
    return;
  }

  response.setHeader("Set-Cookie", buildAdminCookie());
  response.status(200).json({ ok: true });
}
