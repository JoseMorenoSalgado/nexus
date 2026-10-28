"use strict";

/**
 * Conventional Plesk/Passenger startup filename.
 * Keep the implementation in one place so legacy and newer Node.js Toolkit
 * installations can select either app.js or plesk-server.cjs.
 *
 * This is a real Next.js server (SSR + API routes), not a static export.
 */
require("./plesk-server.cjs");
