"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { createApp } = require("../src/app");
const { createStore } = require("../src/store");

const WEB_ROOT = path.resolve(__dirname, "../../web/public");

async function withServer(fn) {
  const server = http.createServer(createApp({ store: createStore(), webRoot: WEB_ROOT }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const json = { "Content-Type": "application/json" };
const post = (base, body) =>
  fetch(`${base}/api/tasks`, { method: "POST", headers: json, body: JSON.stringify(body) });

test("GET /health reports ok", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "ok");
  });
});

test("POST creates a task with defaults and GET lists it", async () => {
  await withServer(async (base) => {
    const res = await post(base, { title: "Ship it" });
    assert.equal(res.status, 201);
    const task = await res.json();
    assert.equal(task.status, "todo");
    assert.equal(task.priority, "medium");

    const list = await (await fetch(`${base}/api/tasks`)).json();
    assert.deepEqual(list.map((t) => t.id), [task.id]);
  });
});

test("POST rejects invalid input with 400 and an error list", async () => {
  await withServer(async (base) => {
    const res = await post(base, { title: "", status: "nope" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).errors.length, 2);
  });
});

test("POST rejects malformed JSON", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/tasks`, { method: "POST", body: "{oops" });
    assert.equal(res.status, 400);
  });
});

test("PATCH updates fields and 404s for unknown ids", async () => {
  await withServer(async (base) => {
    const task = await (await post(base, { title: "Move me" })).json();
    const res = await fetch(`${base}/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ status: "doing" }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "doing");

    const missing = await fetch(`${base}/api/tasks/does-not-exist`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(missing.status, 404);
  });
});

test("DELETE removes a task", async () => {
  await withServer(async (base) => {
    const task = await (await post(base, { title: "Temp" })).json();
    assert.equal((await fetch(`${base}/api/tasks/${task.id}`, { method: "DELETE" })).status, 204);
    assert.equal((await fetch(`${base}/api/tasks/${task.id}`)).status, 404);
  });
});

test("GET /api/stats aggregates the board", async () => {
  await withServer(async (base) => {
    await post(base, { title: "a", status: "done" });
    await post(base, { title: "b" });
    const stats = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(stats.total, 2);
    assert.equal(stats.completionRate, 50);
  });
});

test("serves the web UI and blocks path traversal", async () => {
  await withServer(async (base) => {
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /TaskBoard/);

    const evil = await fetch(`${base}/..%2F..%2F..%2Fpackage.json`);
    assert.notEqual(evil.status, 200);
  });
});
