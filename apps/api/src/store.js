"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const SEED = [
  { title: "Design the board layout", status: "done", priority: "high", description: "Three columns: todo, doing, done." },
  { title: "Build the REST API", status: "done", priority: "high", description: "CRUD plus a stats endpoint." },
  { title: "Add drag and drop", status: "doing", priority: "medium", description: "Move cards between columns." },
  { title: "Write the README", status: "todo", priority: "low", description: "" },
];

function build(input, at = new Date().toISOString()) {
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description || "",
    status: input.status || "todo",
    priority: input.priority || "medium",
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * A tiny task store. Lives in memory, and is mirrored to a JSON file when
 * `file` is given so data survives restarts.
 */
function createStore({ file = null, seed = false } = {}) {
  let tasks = [];

  if (file && fs.existsSync(file)) {
    try {
      tasks = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      tasks = [];
    }
  } else if (seed) {
    const now = Date.now();
    tasks = SEED.map((t, i) => build(t, new Date(now - (SEED.length - i) * 60_000).toISOString()));
  }

  function persist() {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(tasks, null, 2));
  }

  return {
    list: () => tasks.map((t) => ({ ...t })),
    get: (id) => tasks.find((t) => t.id === id) || null,
    create(input) {
      const task = build(input);
      tasks.push(task);
      persist();
      return task;
    },
    update(id, changes) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, changes, { updatedAt: new Date().toISOString() });
      persist();
      return task;
    },
    remove(id) {
      const before = tasks.length;
      tasks = tasks.filter((t) => t.id !== id);
      if (tasks.length === before) return false;
      persist();
      return true;
    },
  };
}

module.exports = { createStore };
