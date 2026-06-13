import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";
function assertSafeEntry(entryPath) {
    if (path.isAbsolute(entryPath) ||
        /^[A-Za-z]:[\\/]/.test(entryPath) ||
        entryPath.split(/[\\/]/).includes("..")) {
        throw new Error(`archive entry resolves outside destination: ${entryPath}`);
    }
}
export async function createPluginArchive({ source, destination }) {
    await mkdir(path.dirname(destination), { recursive: true });
    await tar.c({
        cwd: source,
        file: destination,
        gzip: true,
        portable: true,
        noMtime: true,
    }, ["."]);
    return destination;
}
export async function extractPluginArchive({ archive, destination }) {
    await tar.t({
        file: archive,
        onentry: (entry) => assertSafeEntry(entry.path),
    });
    await mkdir(destination, { recursive: true });
    await tar.x({
        cwd: destination,
        file: archive,
        strict: true,
    });
    return destination;
}
