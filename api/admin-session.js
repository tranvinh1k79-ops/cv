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
