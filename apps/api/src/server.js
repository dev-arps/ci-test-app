"use strict";

const http = require("node:http");
const path = require("node:path");
const { createApp } = require("./app");
const { createStore } = require("./store");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || null;
const WEB_ROOT = path.resolve(__dirname, "../../web/public");

const store = createStore({ file: DATA_FILE, seed: true });
const server = http.createServer(createApp({ store, webRoot: WEB_ROOT }));

server.listen(PORT, () => {
  console.log(`TaskBoard running at http://localhost:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
