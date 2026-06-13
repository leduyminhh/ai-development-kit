import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { checksumText, resolveInside, sha256File, writeJsonAtomic } from "./io.mjs";
import { createInstallState, INSTALL_STATE_PATH, LOCK_PATH, OWNERSHIP_PATH, } from "./state.mjs";
async function readBytesIfExists(pathname) {
    try {
        return await readFile(pathname);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        throw error;
    }
}
async function readTextIfExists(pathname) {
    const bytes = await readBytesIfExists(pathname);
    return bytes === null ? null : bytes.toString("utf8");
}
export async function planTransaction({ target, desiredFiles, lock, ownership, force = false, validateApplied, }) {
    const previousOwnershipPath = path.join(target, OWNERSHIP_PATH);
    let previousOwnership = { schemaVersion: 1, files: {} };
    try {
        previousOwnership = JSON.parse(await readFile(previousOwnershipPath, "utf8"));
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
    const actions = [];
    const backupRelativePaths = [];
    for (const [relativePath, content] of desiredFiles) {
        const destination = resolveInside(target, relativePath);
        const current = await readTextIfExists(destination);
        const ownedBefore = Boolean(previousOwnership.files?.[relativePath]);
        const mergeManaged = ownership.files?.[relativePath]?.mergeStrategy === "mcp-config";
        let action = "create";
        if (current !== null && !ownedBefore && !force && !mergeManaged) {
            throw new Error(`conflict: unmanaged file exists: ${relativePath}`);
        }
        if (current !== null &&
            ownedBefore &&
            !force &&
            !mergeManaged &&
            previousOwnership.files[relativePath]?.checksum &&
            (await sha256File(destination)) !== previousOwnership.files[relativePath].checksum) {
            throw new Error(`conflict: managed file drifted: ${relativePath}`);
        }
        if (current !== null && ownedBefore) {
            action = "replace-managed";
        }
        else if (current !== null && force) {
            action = "replace-forced";
        }
        else if (current !== null && mergeManaged) {
            action = "merge-managed";
        }
        if (current !== null && mergeManaged)
            backupRelativePaths.push(relativePath);
        actions.push({
            action,
            relativePath,
            destination,
            content,
        });
    }
    for (const relativePath of Object.keys(previousOwnership.files ?? {})) {
        if (!desiredFiles.has(relativePath)) {
            const destination = resolveInside(target, relativePath);
            if (!force &&
                previousOwnership.files[relativePath]?.mergeStrategy !== "mcp-config" &&
                previousOwnership.files[relativePath]?.checksum &&
                (await readBytesIfExists(destination)) !== null &&
                (await sha256File(destination)) !== previousOwnership.files[relativePath].checksum) {
                throw new Error(`conflict: managed file drifted: ${relativePath}`);
            }
            actions.push({
                action: "remove-managed",
                relativePath,
                destination,
                content: null,
            });
        }
    }
    const files = {};
    for (const [relativePath, metadata] of Object.entries(ownership.files ?? {})) {
        const content = desiredFiles.get(relativePath);
        files[relativePath] = {
            ...metadata,
            checksum: content === undefined ? metadata.checksum : checksumText(content),
        };
    }
    return {
        target,
        actions,
        lock,
        ownership: { schemaVersion: 1, files },
        validateApplied,
        transactionId: randomUUID(),
        backupRelativePaths,
    };
}
export async function applyTransaction(plan) {
    const backups = new Map();
    const stateFiles = [LOCK_PATH, OWNERSHIP_PATH, INSTALL_STATE_PATH];
    for (const action of plan.actions) {
        backups.set(action.relativePath, await readBytesIfExists(action.destination));
    }
    for (const relativePath of stateFiles) {
        backups.set(relativePath, await readBytesIfExists(path.join(plan.target, relativePath)));
    }
    for (const relativePath of plan.backupRelativePaths ?? []) {
        const bytes = backups.get(relativePath);
        if (bytes === null || bytes === undefined)
            continue;
        const backupPath = resolveInside(plan.target, path.join(".ai-engineering", "backups", "provider-config", plan.transactionId, relativePath));
        await mkdir(path.dirname(backupPath), { recursive: true });
        await writeFile(backupPath, bytes);
    }
    async function restore() {
        for (const [relativePath, bytes] of backups) {
            const destination = resolveInside(plan.target, relativePath);
            if (bytes === null) {
                await rm(destination, { force: true });
            }
            else {
                await mkdir(path.dirname(destination), { recursive: true });
                await writeFile(destination, bytes);
            }
        }
    }
    try {
        for (const action of plan.actions) {
            if (action.action === "remove-managed") {
                await rm(action.destination, { force: true });
            }
            else {
                await mkdir(path.dirname(action.destination), { recursive: true });
                await writeFile(action.destination, action.content, "utf8");
            }
        }
        if (plan.validateApplied) {
            await plan.validateApplied();
        }
        if ((plan.lock.plugins ?? []).length === 0) {
            await rm(path.join(plan.target, LOCK_PATH), { force: true });
            await rm(path.join(plan.target, OWNERSHIP_PATH), { force: true });
            await rm(path.join(plan.target, INSTALL_STATE_PATH), { force: true });
        }
        else {
            await writeJsonAtomic(path.join(plan.target, LOCK_PATH), plan.lock);
            await writeJsonAtomic(path.join(plan.target, OWNERSHIP_PATH), plan.ownership);
            await writeJsonAtomic(path.join(plan.target, INSTALL_STATE_PATH), createInstallState({ transactionId: plan.transactionId }));
        }
        return {
            status: "pass",
            written: plan.actions.map((action) => action.relativePath),
        };
    }
    catch (error) {
        await restore();
        throw error;
    }
}
