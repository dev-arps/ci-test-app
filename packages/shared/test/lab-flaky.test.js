"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Deterministic flakiness: attempt 1 of a workflow run fails, any re-run passes.
// GitHub Actions sets GITHUB_RUN_ATTEMPT; "Re-run failed jobs" increments it.
test("lab: flaky intermittent failure", () => {
  const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || "1");
  assert.ok(attempt > 1, "flaky: intermittent failure on attempt " + attempt + ", passed on retry elsewhere");
});
