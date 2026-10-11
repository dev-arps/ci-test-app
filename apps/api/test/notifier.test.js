"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildNotification, notifyTaskCompleted } = require("../src/notifier");

test("buildNotification includes the task id and title", () => {
  const n = buildNotification({ id: "t1", title: "Ship it", extra: "ignored" });
  assert.equal(n.event, "task.completed");
  assert.deepEqual(n.task, { id: "t1", title: "Ship it" });
});

test("notifyTaskCompleted reports success from the provider", async () => {
  const fetchImpl = async () => ({ ok: true, status: 202 });
  assert.deepEqual(await notifyTaskCompleted({ id: "t1", title: "x" }, { fetchImpl }), { ok: true, status: 202 });
});

test("notifyTaskCompleted swallows network errors", async () => {
  const fetchImpl = async () => {
    throw new Error("connection refused");
  };
  const result = await notifyTaskCompleted({ id: "t1", title: "x" }, { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.error, "connection refused");
});
