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

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 file data");

  const contentType = match[1].toLowerCase();
  if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
    throw new Error("Only image and PDF files are allowed");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Empty file");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("File exceeds the 8 MB upload limit");

  return { buffer, contentType };
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

export function isDataFileUrl(value) {
  return /^data:(image\/[^;,]+|application\/pdf);base64,/i.test(String(value || ""));
}

export async function uploadDataUrlToStorage({ dataUrl, fileName, folder = "uploads" }) {
  const supabase = getSupabaseClient();
  await ensureAssetBucket(supabase);

  const { buffer, contentType } = parseDataUrl(dataUrl);
  const extension = MIME_EXTENSIONS[contentType] || safePathPart(fileName?.split(".").pop(), "bin");
  const originalName = safePathPart(String(fileName || "asset").replace(/\.[^.]+$/, ""), "asset");
  const safeFolder = String(folder || "uploads")
    .split("/")
    .map((part) => safePathPart(part, "uploads"))
    .join("/");
  const path = `${safeFolder}/${Date.now()}-${randomUUID()}-${originalName}.${extension}`;

  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, buffer, {
      cacheControl: "31536000",
      contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return {
    bucket: ASSET_BUCKET,
    path,
    url: data.publicUrl
  };
}

async function migrateAsset(value, fileName, folder) {
  if (!isDataFileUrl(value)) return value;
  const uploaded = await uploadDataUrlToStorage({ dataUrl: value, fileName, folder });
  return uploaded.url;
}

export async function migrateContentAssets(content = {}) {
  const nextContent = { ...content };

  if (nextContent.profile) {
    nextContent.profile = {
      ...nextContent.profile,
      avatar_url: await migrateAsset(
        nextContent.profile.avatar_url,
        nextContent.profile.avatar_file_name || "avatar",
        "profile/avatar"
      ),
      cv_url: await migrateAsset(
        nextContent.profile.cv_url,
        nextContent.profile.cv_file_name || "cv.pdf",
        "profile/cv"
      )
    };
  }

  if (Array.isArray(nextContent.projects)) {
    nextContent.projects = await Promise.all(nextContent.projects.map(async (project) => {
      const folder = `projects/${safePathPart(project.slug || project.id, "project")}`;
      return {
        ...project,
        thumbnail_url: await migrateAsset(project.thumbnail_url, "thumbnail", `${folder}/thumbnail`),
        cover_url: await migrateAsset(project.cover_url, "cover", `${folder}/cover`),
        app_demo_image_url: await migrateAsset(
          project.app_demo_image_url,
          project.app_demo_file_name || "app-demo",
          `${folder}/app-demo`
        ),
        web_demo_image_url: await migrateAsset(
          project.web_demo_image_url,
          project.web_demo_file_name || "web-demo",
          `${folder}/web-demo`
        )
      };
    }));
  }

  if (Array.isArray(nextContent.news)) {
    nextContent.news = await Promise.all(nextContent.news.map(async (post) => {
      const folder = `news/${safePathPart(post.slug || post.id, "post")}`;
      return {
        ...post,
        thumbnail_url: await migrateAsset(post.thumbnail_url, "thumbnail", `${folder}/thumbnail`),
        cover_url: await migrateAsset(post.cover_url, "cover", `${folder}/cover`)
      };
    }));
  }

  return nextContent;
}
