import { buildAdminCookie } from "./admin-login.js";

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  response.setHeader("Set-Cookie", buildAdminCookie({ clear: true }));
  response.status(200).json({ ok: true });
}
