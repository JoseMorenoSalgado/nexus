"use strict";

/**
 * Optional Phusion Passenger startup for Plesk versions that cannot
 * auto-configure Next.js. Plesk Obsidian 18.0.81+ can generate an adapter
 * automatically; prefer its generated file where available.
 *
 * Never hard-code 3000 in Plesk: Passenger supplies process.env.PORT.
 * This entry point does not change the existing Docker npm start command.
 */
const http = require("node:http");
const next = require("next");

const app = next({dev:false,dir:__dirname});
const handle = app.getRequestHandler();
const value = process.env.PORT || "3000";
// Passenger may provide a numeric TCP port or a Unix-domain socket path.
const listenTarget = /^\d+$/.test(value) ? Number(value) : value;

app.prepare().then(() => {
  const server = http.createServer((req,res) => handle(req,res));
  server.listen(listenTarget, () => {
    console.log("[nexus] Next.js ready under Plesk Passenger");
  });
}).catch(error => {
  console.error("[nexus] Next.js startup failed", error instanceof Error ? error.name : "unknown");
  process.exitCode = 1;
});
