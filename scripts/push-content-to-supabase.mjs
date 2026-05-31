import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CONTENT_ROW_ID = "main";
const CONTENT_FILE = resolve(process.cwd(), "data", "portfolio-content.json");

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY."
    );
  }

  return { url, key };
}

function normalizeContent(content = {}) {
  return {
    profile: content.profile ?? null,
    cv: content.cv ?? null,
    projects: content.projects ?? null,
    news: content.news ?? null,
    contact: content.contact ?? null,
    updatedAt: new Date().toISOString()
  };
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const rawContent = await readFile(CONTENT_FILE, "utf8");
const content = normalizeContent(JSON.parse(rawContent));
const { url, key } = getSupabaseConfig();
const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { error } = await supabase
  .from("portfolio_content")
  .upsert(
    {
      id: CONTENT_ROW_ID,
      content,
      updated_at: content.updatedAt
    },
    { onConflict: "id" }
  );

if (error) throw error;

console.log(`Uploaded ${CONTENT_FILE} to portfolio_content/${CONTENT_ROW_ID}`);
