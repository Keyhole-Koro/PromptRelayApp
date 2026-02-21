// ─── HTTP API Routes ────────────────────────────────────────────

import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { createReadStream, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname resolves to the source location when using tsx
const POOL_ROOT = join(__dirname, "../../../data/pool");
console.log(`[pool] POOL_ROOT resolved to: ${POOL_ROOT}`);

interface PkgJson {
    name: string;
    version: string;
}

let pkgCache: PkgJson | null = null;

function getPkg(): PkgJson {
    if (!pkgCache) {
        // Resolve package.json relative to this file (src/server/api.ts → ../../package.json)
        pkgCache = require("../../package.json") as PkgJson;
    }
    return pkgCache;
}

export function handleApiRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url ?? "";

    if (url === "/api/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return true;
    }

    if (url === "/api/version" && req.method === "GET") {
        const pkg = getPkg();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                name: "prompt-relay",
                version: pkg.version,
                commit: process.env["GIT_COMMIT"] ?? null,
                builtAt: process.env["BUILT_AT"] ?? null,
            }),
        );
        return true;
    }

    return false; // Not handled
}

const MIME_MAP: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};

/**
 * Serve static files from /api/pool/<path>
 * e.g. /api/pool/available/run-local-001/item-xxx/candidate.png
 */
export function handlePoolFileRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url ?? "";
    if (!url.startsWith("/api/pool/") || req.method !== "GET") return false;

    const relPath = decodeURIComponent(url.slice("/api/pool/".length));
    // Prevent path traversal
    if (relPath.includes("..")) {
        res.writeHead(403);
        res.end();
        return true;
    }

    const filePath = join(POOL_ROOT, relPath);
    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return true;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
    });
    createReadStream(filePath).pipe(res);
    return true;
}
