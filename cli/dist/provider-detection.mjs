import { access } from "node:fs/promises";
import path from "node:path";
const SIGNALS = {
    codex: [".codex", ".agents", "AGENTS.md"],
    claude: [".claude", ".mcp.json", "CLAUDE.md"],
    cursor: [".cursor"],
};
async function exists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
export async function detectProviders({ projectRoot }) {
    const detected = [];
    for (const [provider, signals] of Object.entries(SIGNALS)) {
        if ((await Promise.all(signals.map((signal) => exists(path.join(projectRoot, signal))))).some(Boolean)) {
            detected.push(provider);
        }
    }
    return detected.sort();
}
