"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateTaskInput, computeStats, sortTasks } = require("@taskboard/shared");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const MAX_BODY = 64 * 1024;

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"));
      } catch {
        reject(Object.assign(new Error("invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(webRoot, urlPath, res) {
  let rel;
  try {
    rel = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath).replace(/^\/+/, "");
  } catch {
    return sendJson(res, 400, { error: "bad path" });
  }
  const file = path.resolve(webRoot, rel);
  // Refuse anything that escapes the web root (path traversal).
  if (!file.startsWith(webRoot + path.sep)) {
    return sendJson(res, 403, { error: "forbidden" });
  }
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: "not found" });
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Content-Length": data.length,
    });
    res.end(data);
  });
}

/** Build a plain (req, res) handler so it can be mounted on http.createServer or tested directly. */
function createApp({ store, webRoot = null }) {
  const root = webRoot ? path.resolve(webRoot) : null;

  return async function handle(req, res) {
    const { pathname } = new URL(req.url, "http://localhost");
    const method = req.method;

    try {
      if (pathname === "/health" && method === "GET") {
        return sendJson(res, 200, { status: "ok", uptime: Math.round(process.uptime()) });
      }

      if (pathname === "/api/stats" && method === "GET") {
        return sendJson(res, 200, computeStats(store.list()));
      }

      if (pathname === "/api/tasks") {
        if (method === "GET") return sendJson(res, 200, sortTasks(store.list()));
        if (method === "POST") {
          const result = validateTaskInput(await readJson(req));
          if (!result.ok) return sendJson(res, 400, { errors: result.errors });
          return sendJson(res, 201, store.create(result.value));
        }
        return sendJson(res, 405, { error: "method not allowed" });
      }

      const match = pathname.match(/^\/api\/tasks\/([\w-]+)$/);
      if (match) {
        const id = match[1];
        if (method === "GET") {
          const task = store.get(id);
          return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: "task not found" });
        }
        if (method === "PATCH") {
          const result = validateTaskInput(await readJson(req), { partial: true });
          if (!result.ok) return sendJson(res, 400, { errors: result.errors });
          const task = store.update(id, result.value);
          return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: "task not found" });
        }
        if (method === "DELETE") {
          if (!store.remove(id)) return sendJson(res, 404, { error: "task not found" });
          res.writeHead(204);
          return res.end();
        }
        return sendJson(res, 405, { error: "method not allowed" });
      }

      if (root && method === "GET" && !pathname.startsWith("/api/")) {
        return serveStatic(root, pathname, res);
      }

      return sendJson(res, 404, { error: "not found" });
    } catch (err) {
      const status = err.status || 500;
      return sendJson(res, status, { error: status === 500 ? "internal error" : err.message });
    }
  };
}

module.exports = { createApp };
