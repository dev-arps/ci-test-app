"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PUBLIC = path.join(__dirname, "../public");
const read = (name) => fs.readFileSync(path.join(PUBLIC, name), "utf8");

test("index.html references the bundled assets that exist", () => {
  const html = read("index.html");
  for (const asset of ["styles.css", "app.js"]) {
    assert.ok(html.includes(`/${asset}`), `index.html should reference ${asset}`);
    assert.ok(fs.existsSync(path.join(PUBLIC, asset)), `${asset} should exist`);
  }
});

test("index.html has a column for every task status", () => {
  const html = read("index.html");
  for (const status of ["todo", "doing", "done"]) {
    assert.ok(html.includes(`data-status="${status}"`), `missing column for ${status}`);
  }
});

test("app.js is syntactically valid", () => {
  assert.doesNotThrow(() => new vm.Script(read("app.js"), { filename: "app.js" }));
});
