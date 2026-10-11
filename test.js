const assert = require("assert");
const { add } = require("./math");

assert.strictEqual(add(2, 3), 5, "add(2, 3) should be 5");
console.log("all tests passed");
