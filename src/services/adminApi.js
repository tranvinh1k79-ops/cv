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

export function loginAdmin(password) {
  return adminJsonRequest("/api/admin-login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export function logoutAdmin() {
  return adminJsonRequest("/api/admin-logout", { method: "POST" });
}

export function readAdminContent() {
  return adminJsonRequest("/api/admin-content", {
    headers: { "Cache-Control": "no-store" }
  });
}

export function writeAdminContent(content) {
  return adminJsonRequest("/api/admin-content", {
    method: "PUT",
    body: JSON.stringify(content)
  });
}
