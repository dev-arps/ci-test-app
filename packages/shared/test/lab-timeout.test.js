"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("lab: report export finishes in time", { timeout: 200 }, async () => {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  assert.ok(true);
});
