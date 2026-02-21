// ─── HTTP API Routes ────────────────────────────────────────────
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let pkgCache = null;
function getPkg() {
    if (!pkgCache) {
        // Resolve package.json relative to this file (src/server/api.ts → ../../package.json)
        pkgCache = require("../../package.json");
    }
    return pkgCache;
}
export function handleApiRequest(req, res) {
    const url = req.url ?? "";
    if (url === "/api/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return true;
    }
    if (url === "/api/version" && req.method === "GET") {
        const pkg = getPkg();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            name: "prompt-relay",
            version: pkg.version,
            commit: process.env["GIT_COMMIT"] ?? null,
            builtAt: process.env["BUILT_AT"] ?? null,
        }));
        return true;
    }
    return false; // Not handled
}
//# sourceMappingURL=api.js.map