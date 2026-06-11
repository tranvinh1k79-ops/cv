import { hasValidAdminSession } from "./admin-login.js";
import { uploadDataUrlToStorage } from "../server/supabase-storage.js";

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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!hasValidAdminSession(request)) {
    response.status(401).json({ error: "Admin session required" });
    return;
  }

  try {
    const { dataUrl, fileName, folder } = await readJsonBody(request);
    const uploaded = await uploadDataUrlToStorage({ dataUrl, fileName, folder });
    response.status(201).json(uploaded);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("8 MB") ? 413 : 400;
    response.status(status).json({
      error: "Unable to upload asset",
      detail: message
    });
  }
}
