import { access } from "node:fs/promises";
export async function pathExists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
