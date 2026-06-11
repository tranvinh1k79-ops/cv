import { createClient } from "@supabase/supabase-js";
import { hasValidAdminSession } from "./admin-login.js";

const CONTENT_ROW_ID = "main";
const EMPTY_CONTENT = {
  profile: null,
  cv: null,
  projects: null,
  news: null,
  contact: null,
  updatedAt: null
};

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function normalizeContent(content = {}, updatedAt = null) {
  return {
    profile: content.profile ?? null,
    cv: content.cv ?? null,
    projects: content.projects ?? null,
    news: content.news ?? null,
    contact: content.contact ?? null,
    updatedAt: content.updatedAt ?? updatedAt ?? null
  };
}

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

async function readContent(response) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .select("content, updated_at")
    .eq("id", CONTENT_ROW_ID)
    .maybeSingle();

  if (error) throw error;

  response.status(200).json(data ? normalizeContent(data.content, data.updated_at) : EMPTY_CONTENT);
}

async function writeContent(request, response) {
  if (!hasValidAdminSession(request)) {
    response.status(401).json({ error: "Admin session required" });
    return;
  }

  const now = new Date().toISOString();
  const content = normalizeContent(await readJsonBody(request), now);
  if (/data:(?:image\/[^;,]+|application\/pdf);base64,/i.test(JSON.stringify(content))) {
    response.status(422).json({
      code: "EMBEDDED_ASSET_REJECTED",
      error: "Upload assets to Storage before saving content"
    });
    return;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .upsert(
      {
        id: CONTENT_ROW_ID,
        content,
        updated_at: now
      },
      { onConflict: "id" }
    )
    .select("content, updated_at")
    .single();

  if (error) throw error;

  response.status(200).json(normalizeContent(data.content, data.updated_at));
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      await readContent(response);
      return;
    }

    if (request.method === "PUT") {
      await writeContent(request, response);
      return;
    }

    response.setHeader("Allow", "GET, PUT");
    response.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    response.status(500).json({
      error: "Unable to sync portfolio content",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
