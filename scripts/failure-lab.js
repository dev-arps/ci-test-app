#!/usr/bin/env node
"use strict";

/**
 * Failure lab: put one known kind of CI failure on its own branch.
 *
 *   node scripts/failure-lab.js list
 *   node scripts/failure-lab.js apply <scenario> [--push]
 *   node scripts/failure-lab.js cleanup [--remote]
 *
 * `apply` branches off main, injects the failure, commits it and (with --push)
 * pushes it so CI fails and the platform picks the run up. Nothing is pushed
 * without --push. Branches are named lab/<scenario>-<timestamp>.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SHARED_SRC = "packages/shared/src/index.js";
const API_APP = "apps/api/src/app.js";
const AWS_API-KEY='sk-2hsdehfioefh';
const OPENAI_API_KEY='sk-yyeuueen03340';

const testFile = (name, body) => ({
  kind: "add",
  file: `packages/shared/test/lab-${name}.test.js`,
  content: `"use strict";\n\n${body.trim()}\n`,
});

const HEADER = `const test = require("node:test");\nconst assert = require("node:assert/strict");\n`;

const SCENARIOS = {
  "test-failure": {
    category: "test_failure",
    severity: "medium",
    what: "completionRate is off by 10x, so existing tests fail with an AssertionError",
    change: { kind: "replace", file: SHARED_SRC, from: "(byStatus.done / total) * 100", to: "(byStatus.done / total) * 10" },
  },
  dependency: {
    category: "dependency_error",
    severity: "medium",
    what: "the API requires a package that does not exist (Cannot find module)",
    change: { kind: "replace", file: API_APP, from: '"use strict";\n', to: '"use strict";\n\nrequire("todo-date-helper-v2");\n' },
  },
  "dependency-pin": {
    category: "dependency_error",
    severity: "medium",
    what: "a dependency is re-pinned to a version that does not exist (npm ci: No matching version found)",
    change: { kind: "replace", file: "apps/api/package.json", from: '"@taskboard/shared": "*"', to: '"@taskboard/shared": "^99.0.0"' },
  },
  syntax: {
    category: "syntax_error",
    severity: "high",
    what: "a half-written module that fails the syntax check (SyntaxError: Unexpected token)",
    change: [
      {
        kind: "add",
        file: "packages/shared/src/format.js",
        content: [
          '"use strict";',
          "",
          "function formatDue(date) {",
          "  return `due ${date.toISOString(`;",
          "}",
          "",
          "module.exports = { formatDue };",
          "",
        ].join("\n"),
      },
      testFile("syntax", `${HEADER}
const { spawnSync } = require("node:child_process");
const path = require("node:path");
test("lab: format module passes the syntax check", () => {
  const file = path.join(__dirname, "..", "src", "format.js");
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});`),
    ],
  },
  timeout: {
    category: "timeout",
    severity: "medium",
    what: "a test that exceeds its own 200 ms timeout",
    change: testFile("timeout", `${HEADER}
test("lab: report export finishes in time", { timeout: 200 }, async () => {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  assert.ok(true);
});`),
  },
  permission: {
    category: "permission_error",
    severity: "high",
    what: "a test writes to a root-owned path (EACCES: permission denied)",
    change: testFile("permission", `${HEADER}
const fs = require("node:fs");
test("lab: write the audit log to a system path", () => {
  fs.writeFileSync("/etc/taskboard-audit.log", "entry\\n");
});`),
  },
  "out-of-memory": {
    category: "out_of_memory",
    severity: "medium",
    what: "a simulated V8 heap exhaustion message (no real allocation)",
    change: testFile("out-of-memory", `${HEADER}
test("lab: import a very large board", () => {
  throw new Error("FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory");
});`),
  },
  infra: {
    category: "infra_error",
    severity: "low",
    what: "a test whose upstream service refuses connections",
    change: testFile("infra", `${HEADER}
const net = require("node:net");
test("lab: sync with the notifications service", async () => {
  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: 9 });
    socket.once("connect", () => { socket.destroy(); resolve(); });
    socket.once("error", (err) => reject(new Error("notifications service: connection refused (" + err.code + ")")));
  });
});`),
  },
  flaky: {
    category: "flaky_test",
    severity: "low",
    what: "fails on the first attempt and passes on re-run of the same commit",
    change: testFile("flaky", `${HEADER}
// Deterministic flakiness: attempt 1 of a workflow run fails, any re-run passes.
// GitHub Actions sets GITHUB_RUN_ATTEMPT; "Re-run failed jobs" increments it.
test("lab: flaky intermittent failure", () => {
  const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || "1");
  assert.ok(attempt > 1, "flaky: intermittent failure on attempt " + attempt + ", passed on retry elsewhere");
});`),
  },
};

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function applyChange(change) {
  if (Array.isArray(change)) return change.forEach(applyChange);
  const target = path.join(ROOT, change.file);
  if (change.kind === "add") {
    fs.writeFileSync(target, change.content);
    return;
  }
  const text = fs.readFileSync(target, "utf8");
  if (change.kind === "append") {
    fs.writeFileSync(target, text + change.content);
    return;
  }
  if (!text.includes(change.from)) {
    throw new Error(`cannot apply: ${JSON.stringify(change.from)} not found in ${change.file} (has main changed?)`);
  }
  fs.writeFileSync(target, text.replace(change.from, change.to));
}

function list() {
  const rows = Object.entries(SCENARIOS);
  const width = Math.max(...rows.map(([n]) => n.length));
  console.log("scenario".padEnd(width), " expected severity  category / what it does");
  for (const [name, s] of rows) {
    console.log(`${name.padEnd(width)}  ${s.severity.padEnd(8)}          ${s.category}: ${s.what}`);
  }
  console.log("\nAlso try: push any failing scenario to main (expect high), or apply the same one 3 times (expect escalation).");
}

function apply(name, push) {
  const scenario = SCENARIOS[name];
  if (!scenario) throw new Error(`unknown scenario "${name}". Run: node scripts/failure-lab.js list`);
  if (git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error("tracked files have uncommitted changes; commit or stash them first");
  }
  const branch = `lab/${name}-${Date.now().toString(36)}`;
  git("checkout", "-B", branch, "main");
  applyChange(scenario.change);
  for (const c of [].concat(scenario.change)) git("add", c.file);
  git("commit", "-m", `lab: ${name} (${scenario.category})`);
  console.log(`committed ${name} on ${branch}`);
  console.log(`expect: ${scenario.category}, severity ${scenario.severity}`);
  if (push) {
    git("push", "-u", "origin", branch);
    console.log("pushed. Watch GitHub Actions, then the platform's Pipelines page.");
  } else {
    console.log(`not pushed. Push with: git push -u origin ${branch}`);
  }
  git("checkout", "main");
}

function cleanup(remote) {
  const branches = git("branch", "--list", "lab/*", "--format=%(refname:short)").split("\n").filter(Boolean);
  for (const b of branches) {
    git("branch", "-D", b);
    console.log(`deleted local ${b}`);
  }
  if (remote) {
    const refs = git("ls-remote", "--heads", "origin", "lab/*").split("\n").filter(Boolean);
    for (const line of refs) {
      const b = line.split("\t")[1].replace("refs/heads/", "");
      git("push", "origin", "--delete", b);
      console.log(`deleted remote ${b}`);
    }
  }
  if (!branches.length) console.log("no lab/* branches");
}

function main(argv) {
  const [cmd, arg] = argv;
  try {
    if (cmd === "list") return list();
    if (cmd === "apply") return apply(arg, argv.includes("--push"));
    if (cmd === "cleanup") return cleanup(argv.includes("--remote"));
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^[^*]*\*?/, ""));
    process.exitCode = cmd ? 1 : 0;
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 1;
  }
}

main(process.argv.slice(2));
