import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
export async function backupFile(source, destination) {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
}
