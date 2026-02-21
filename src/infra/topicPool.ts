// ─── Topic Pool: read image/prompt from local filesystem ────────

import { readdir, readFile, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// From compiled dist/infra/ -> ../../ = project root (PromptRelayApp), then ../data/pool
const POOL_ROOT = join(__dirname, "../../../data/pool");
const AVAILABLE_DIR = join(POOL_ROOT, "available");
const USED_DIR = join(POOL_ROOT, "used");

export interface TopicItem {
    /** Relative path from POOL_ROOT to serve (e.g. "available/run-local-001/item-xxx") */
    servePath: string;
    /** The prompt text from prompt.txt */
    prompt: string;
    /** The image filename (e.g. "candidate.png") */
    imageFile: string;
}

/**
 * Picks a random topic item from the available pool.
 * Reads prompt.txt and returns the image serve path.
 */
export async function pickTopicFromPool(): Promise<TopicItem> {
    // Walk available/ to find all item directories that contain candidate.png
    const items: { runDir: string; itemDir: string }[] = [];

    const runs = await readdir(AVAILABLE_DIR, { withFileTypes: true });
    for (const run of runs) {
        if (!run.isDirectory()) continue;
        const runPath = join(AVAILABLE_DIR, run.name);
        const entries = await readdir(runPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            items.push({ runDir: run.name, itemDir: entry.name });
        }
    }

    if (items.length === 0) {
        throw new Error("No available topic items in pool");
    }

    // Pick a random item
    const pick = items[Math.floor(Math.random() * items.length)];
    const itemPath = join(AVAILABLE_DIR, pick.runDir, pick.itemDir);

    // Read prompt
    const promptPath = join(itemPath, "prompt.txt");
    const prompt = (await readFile(promptPath, "utf-8")).trim();

    // Find the image file (candidate.png or any image)
    const files = await readdir(itemPath);
    const imageFile = files.find(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    if (!imageFile) {
        throw new Error(`No image file found in ${itemPath}`);
    }

    const servePath = `available/${pick.runDir}/${pick.itemDir}`;

    return { servePath, prompt, imageFile };
}

/**
 * Move a used topic item from available/ to used/
 */
export async function markTopicUsed(servePath: string): Promise<void> {
    const src = join(POOL_ROOT, servePath);
    const dest = join(USED_DIR, servePath.replace(/^available\//, ""));
    await mkdir(dirname(dest), { recursive: true });
    await rename(src, dest);
}
