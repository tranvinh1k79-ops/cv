import { hasValidAdminSession } from "./admin-login.js";
import { createSignedAssetUpload } from "../server/supabase-storage.js";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

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
    const { fileName, folder, contentType, size = 0 } = await readJsonBody(request);
    if (!fileName || !contentType) {
      response.status(400).json({
        code: "INVALID_UPLOAD_METADATA",
        error: "Missing upload metadata"
      });
      return;
    }
    if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
      response.status(400).json({
        code: "INVALID_FILE_TYPE",
        error: "Only image and PDF files are allowed"
      });
      return;
    }
    if (Number(size) > MAX_FILE_BYTES) {
      response.status(413).json({
        code: "FILE_TOO_LARGE",
        error: "File exceeds the 8 MB limit"
      });
      return;
    }

    const ticket = await createSignedAssetUpload({ fileName, folder, contentType });
    response.status(201).json(ticket);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    response.status(400).json({
      error: "Unable to upload asset",
      detail: message
    });
  }
}
