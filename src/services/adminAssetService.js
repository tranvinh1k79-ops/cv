import { adminJsonRequest } from "./adminApi.js";
import { supabase } from "../lib/supabase.js";

const EMBEDDED_ASSET_PATTERN = /^data:(image\/[^;,]+|application\/pdf);base64,/i;

export function isEmbeddedAsset(value) {
  return EMBEDDED_ASSET_PATTERN.test(String(value || ""));
}

export function hasEmbeddedAssets(value) {
  return /data:(?:image\/[^;,]+|application\/pdf);base64,/i.test(JSON.stringify(value ?? null));
}

export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function uploadAssetDirect({ blob, fileName, folder }) {
  if (!supabase) throw new Error("Missing Supabase browser configuration");

  const ticket = await adminJsonRequest("/api/admin-upload", {
    method: "POST",
    body: JSON.stringify({
      fileName,
      folder,
      contentType: blob.type || "application/octet-stream",
      size: blob.size
    })
  });

  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, {
      contentType: blob.type || "application/octet-stream",
      cacheControl: "31536000"
    });

  if (error) throw error;
  return ticket.publicUrl;
}

async function migrateAsset(value, fileName, folder, uploader) {
  if (!isEmbeddedAsset(value)) return value;
  const blob = await dataUrlToBlob(value);
  return uploader({ blob, fileName, folder });
}

export async function prepareContentForSync(content = {}, uploader = uploadAssetDirect) {
  const nextContent = { ...content };

  if (nextContent.profile) {
    nextContent.profile = {
      ...nextContent.profile,
      avatar_url: await migrateAsset(
        nextContent.profile.avatar_url,
        nextContent.profile.avatar_file_name || "avatar",
        "profile/avatar",
        uploader
      ),
      cv_url: await migrateAsset(
        nextContent.profile.cv_url,
        nextContent.profile.cv_file_name || "cv.pdf",
        "profile/cv",
        uploader
      )
    };
  }

  if (Array.isArray(nextContent.projects)) {
    nextContent.projects = await Promise.all(nextContent.projects.map(async (project) => {
      const folder = `projects/${project.slug || project.id || "project"}`;
      return {
        ...project,
        thumbnail_url: await migrateAsset(project.thumbnail_url, "thumbnail", `${folder}/thumbnail`, uploader),
        cover_url: await migrateAsset(project.cover_url, "cover", `${folder}/cover`, uploader),
        app_demo_image_url: await migrateAsset(
          project.app_demo_image_url,
          project.app_demo_file_name || "app-demo",
          `${folder}/app-demo`,
          uploader
        ),
        web_demo_image_url: await migrateAsset(
          project.web_demo_image_url,
          project.web_demo_file_name || "web-demo",
          `${folder}/web-demo`,
          uploader
        )
      };
    }));
  }

  if (Array.isArray(nextContent.news)) {
    nextContent.news = await Promise.all(nextContent.news.map(async (post) => {
      const folder = `news/${post.slug || post.id || "post"}`;
      return {
        ...post,
        thumbnail_url: await migrateAsset(post.thumbnail_url, "thumbnail", `${folder}/thumbnail`, uploader),
        cover_url: await migrateAsset(post.cover_url, "cover", `${folder}/cover`, uploader)
      };
    }));
  }

  return nextContent;
}
