import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const contentFile = resolve(process.cwd(), "data", "portfolio-content.json");

async function readContentFile() {
  try {
    const raw = await readFile(contentFile, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        profile: null,
        cv: null,
        projects: null,
        news: null,
        contact: null,
        updatedAt: null
      };
    }
    throw error;
  }
}

async function writeContentFile(content) {
  const payload = {
    profile: content.profile ?? null,
    cv: content.cv ?? null,
    projects: content.projects ?? null,
    news: content.news ?? null,
    contact: content.contact ?? null,
    updatedAt: new Date().toISOString()
  };

  await mkdir(dirname(contentFile), { recursive: true });
  await writeFile(contentFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function sendJson(response, status, data) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
}

function portfolioContentPlugin() {
  async function handleContentApi(request, response, next) {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/api/admin-content") {
      next();
      return;
    }

    try {
      if (request.method === "GET") {
        sendJson(response, 200, await readContentFile());
        return;
      }

      if (request.method === "PUT") {
        const body = await readRequestBody(request);
        const content = body ? JSON.parse(body) : {};
        sendJson(response, 200, await writeContentFile(content));
        return;
      }

      response.statusCode = 405;
      response.setHeader("Allow", "GET, PUT");
      response.end("Method Not Allowed");
    } catch (error) {
      sendJson(response, 500, {
        error: "Unable to persist portfolio content",
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    name: "portfolio-content-file-api",
    configureServer(server) {
      server.middlewares.use(handleContentApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleContentApi);
    }
  };
}

export default defineConfig({
  plugins: [portfolioContentPlugin(), react()],
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
