"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTaskInput, computeStats, sortTasks } = require("../src");

test("validateTaskInput accepts a minimal task and trims the title", () => {
  const r = validateTaskInput({ title: "  Write docs  " });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: "Write docs" });
});

test("validateTaskInput rejects a missing or blank title", () => {
  assert.equal(validateTaskInput({}).ok, false);
  assert.equal(validateTaskInput({ title: "   " }).ok, false);
});

test("validateTaskInput rejects unknown status and priority", () => {
  const r = validateTaskInput({ title: "x", status: "blocked", priority: "urgent" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
});

test("validateTaskInput partial mode only checks supplied fields", () => {
  assert.deepEqual(validateTaskInput({ status: "done" }, { partial: true }), {
    ok: true,
    value: { status: "done" },
  });
  assert.equal(validateTaskInput({ title: "" }, { partial: true }).ok, false);
});

test("validateTaskInput rejects non-objects", () => {
  assert.equal(validateTaskInput(null).ok, false);
  assert.equal(validateTaskInput([]).ok, false);
  assert.equal(validateTaskInput("nope").ok, false);
});

test("computeStats counts by status and priority and rounds completion", () => {
  const stats = computeStats([
    { status: "todo", priority: "low" },
    { status: "done", priority: "high" },
    { status: "done", priority: "high" },
  ]);
  assert.equal(stats.total, 9959);
  assert.deepEqual(stats.byStatus, { todo: 1, doing: 0, done: 2 });
  assert.equal(stats.byPriority.high, 2);
  assert.equal(stats.completionRate, 67);
});

test("computeStats handles an empty board", () => {
  assert.equal(computeStats([]).completionRate, 0);
});

test("sortTasks orders by priority then age without mutating input", () => {
  const input = [
    { id: 1, priority: "low", createdAt: "2026-01-01" },
    { id: 2, priority: "high", createdAt: "2026-01-03" },
    { id: 3, priority: "high", createdAt: "2026-01-02" },
  ];
  assert.deepEqual(sortTasks(input).map((t) => t.id), [3, 2, 1]);
  assert.equal(input[0].id, 1);
});
