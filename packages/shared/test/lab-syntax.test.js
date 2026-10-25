"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { spawnSync } = require("node:child_process");
const path = require("node:path");
test("lab: format module passes the syntax check", () => {
  const file = path.join(__dirname, "..", "src", "format.js");
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
