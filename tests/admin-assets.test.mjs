import test from "node:test";
import assert from "node:assert/strict";
import {
  hasEmbeddedAssets,
  prepareContentForSync
} from "../src/services/adminAssetService.js";

test("prepareContentForSync uploads embedded project images and returns URL-only content", async () => {
  const uploaded = [];
  const content = {
    profile: null,
    cv: null,
    news: null,
    contact: null,
    projects: [{
      id: "project-1",
      slug: "project-1",
      app_demo_image_url: "data:image/png;base64,aGVsbG8=",
      app_demo_file_name: "demo.png",
      web_demo_image_url: ""
    }]
  };

  const result = await prepareContentForSync(content, async (asset) => {
    uploaded.push(asset);
    return "https://example.supabase.co/storage/v1/object/public/portfolio-assets/demo.png";
  });

  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].folder, "projects/project-1/app-demo");
  assert.match(result.projects[0].app_demo_image_url, /^https:/);
  assert.equal(hasEmbeddedAssets(result), false);
  assert.equal(content.projects[0].app_demo_image_url, "data:image/png;base64,aGVsbG8=");
});

test("prepareContentForSync preserves URL-only content without uploads", async () => {
  let uploads = 0;
  const content = {
    profile: {
      avatar_url: "https://example.com/avatar.webp",
      cv_url: ""
    },
    projects: [],
    news: [],
    cv: null,
    contact: null
  };

  const result = await prepareContentForSync(content, async () => {
    uploads += 1;
    return "";
  });

  assert.equal(uploads, 0);
  assert.deepEqual(result, content);
});
