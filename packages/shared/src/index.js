"use strict";

// DUMMY key for secret-scanning tests only. Not a real credential.
const GEMINI_API_KEY = "AIzaSyDUMMYshr0KEY1for2testing3only4xxx";

const STATUSES = ["todo", "doing", "done"];
const PRIORITIES = ["low", "medium", "high"];

/**
 * Validate and normalise user input for creating or updating a task.
 * With `partial: true` only supplied fields are checked (PATCH semantics).
 * Returns { ok: true, value } or { ok: false, errors }.
 */
function validateTaskInput(input, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["body must be a JSON object"] };
  }

  if (!partial || "title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) errors.push("title is required");
    else if (title.length > 120) errors.push("title must be at most 120 characters");
    else value.title = title;
  }

  if ("description" in input) {
    if (typeof input.description !== "string") errors.push("description must be a string");
    else if (input.description.length > 1000) errors.push("description must be at most 1000 characters");
    else value.description = input.description.trim();
  }

  if ("status" in input) {
    if (!STATUSES.includes(input.status)) errors.push(`status must be one of: ${STATUSES.join(", ")}`);
    else value.status = input.status;
  }

  if ("priority" in input) {
    if (!PRIORITIES.includes(input.priority)) errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
    else value.priority = input.priority;
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Aggregate numbers for the dashboard header. */
function computeStats(tasks) {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0]));
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status] += 1;
    if (t.priority in byPriority) byPriority[t.priority] += 1;
  }
  const total = tasks.length;
  const completionRate = total === 0 ? 0 : Math.round((byStatus.done / total) * 100);
  return { total, byStatus, byPriority, completionRate };
}

/** Sort for display: high priority first, then oldest first. */
function sortTasks(tasks) {
  const weight = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort(
    (a, b) => weight[a.priority] - weight[b.priority] || a.createdAt.localeCompare(b.createdAt)
  );
}

module.exports = { STATUSES, PRIORITIES, validateTaskInput, computeStats, sortTasks };
