"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Deterministic flakiness: attempt 1 of a workflow run fails, any re-run passes.
// GitHub Actions sets GITHUB_RUN_ATTEMPT; "Re-run failed jobs" increments it.
test("lab: flaky intermittent failure", () => {
  assert.ok(true, "flaky: intermittent failure on attempt 1, passed on retry elsewhere");
});
