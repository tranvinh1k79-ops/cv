import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ASSET_BUCKET = "portfolio-assets";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
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

function safePathPart(value, fallback) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function extensionForContentType(contentType, fileName) {
  return MIME_EXTENSIONS[contentType] || safePathPart(fileName?.split(".").pop(), "bin");
}

function createAssetPath({ fileName, folder = "uploads", contentType = "application/octet-stream" }) {
  const extension = extensionForContentType(contentType, fileName);
  const originalName = safePathPart(String(fileName || "asset").replace(/\.[^.]+$/, ""), "asset");
  const safeFolder = String(folder || "uploads")
    .split("/")
    .map((part) => safePathPart(part, "uploads"))
    .join("/");
  return `${safeFolder}/${Date.now()}-${randomUUID()}-${originalName}.${extension}`;
}

async function ensureAssetBucket(supabase) {
  const { data: bucket, error } = await supabase.storage.getBucket(ASSET_BUCKET);

  if (!error && bucket) {
    if (!bucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(ASSET_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_BYTES,
        allowedMimeTypes: ["image/*", "application/pdf"]
      });
      if (updateError) throw updateError;
    }
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(ASSET_BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: ["image/*", "application/pdf"]
  });

  if (createError && !String(createError.message || "").toLowerCase().includes("already exists")) {
    throw createError;
  }
}

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
