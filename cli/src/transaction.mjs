import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { checksumText, resolveInside, sha256File, writeJsonAtomic } from "./io.mjs";
import {
  createInstallState,
  INSTALL_STATE_PATH,
  LOCK_PATH,
  OWNERSHIP_PATH,
} from "./state.mjs";

export const BUILD_DIR = ".ai-engineering/build";

export const DEVELOPER_MODE_GUIDANCE =
  "Một số file đã được sao chép thay vì symlink vì không tạo được symlink.\n" +
  "Để dùng symlink (skills tự cập nhật khi build đổi): bật Windows Developer Mode\n" +
  "(Settings > Privacy & security > For developers > Developer Mode) hoặc chạy lại\n" +
  "với quyền admin. Sau khi đổi nội dung nguồn, chạy lại `aie update` để làm mới.";

async function readBytesIfExists(pathname) {
  try {
    return await readFile(pathname);
  } catch (error) {
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

// After removing managed files, their parent directories can be left behind
// empty (e.g. .agents/skills/<skill>). Prune those empty ancestors so an
// uninstall leaves no orphaned directories and `doctor` does not flag them.
// `rmdir` only succeeds on empty directories, so non-empty (user-owned or
// still-populated) directories are preserved automatically.
async function pruneEmptyDirectories(target, removedRelativePaths) {
  const targetRoot = path.resolve(target);
  const stateRoot = path.join(targetRoot, ".ai-engineering");
  const candidates = new Set();
  for (const relativePath of removedRelativePaths) {
    let dir = path.dirname(resolveInside(target, relativePath));
    while (dir !== targetRoot && dir !== stateRoot && dir.startsWith(targetRoot)) {
      candidates.add(dir);
      dir = path.dirname(dir);
    }
  }
  // Remove deepest directories first so parents become empty before pruning.
  const ordered = [...candidates].sort((left, right) => right.length - left.length);
  for (const dir of ordered) {
    try {
      await rmdir(dir);
    } catch {
      // Directory is not empty or already gone; leave it in place.
    }
  }
}

export async function planTransaction({
  target,
  desiredFiles,
  lock,
  ownership,
  force = false,
  validateApplied,
  linkMode = "copy",
}) {
  const previousOwnershipPath = path.join(target, OWNERSHIP_PATH);
  let previousOwnership = { schemaVersion: 1, files: {} };
  try {
    previousOwnership = JSON.parse(await readFile(previousOwnershipPath, "utf8"));
  } catch (error) {
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
    const mergeManaged = Boolean(
      ownership.files?.[relativePath]?.mergeStrategy,
    );
    let action = "create";
    if (current !== null && !ownedBefore && !force && !mergeManaged) {
      throw new Error(`conflict: unmanaged file exists: ${relativePath}`);
    }
    if (
      current !== null &&
      ownedBefore &&
      !force &&
      !mergeManaged &&
      previousOwnership.files[relativePath]?.checksum &&
      (await sha256File(destination)) !== previousOwnership.files[relativePath].checksum
    ) {
      throw new Error(`conflict: managed file drifted: ${relativePath}`);
    }
    if (current !== null && ownedBefore) {
      action = "replace-managed";
    } else if (current !== null && force) {
      action = "replace-forced";
    } else if (current !== null && mergeManaged) {
      action = "merge-managed";
    }
    if (current !== null && mergeManaged) backupRelativePaths.push(relativePath);
    actions.push({
      action,
      relativePath,
      destination,
      content,
      link: linkMode === "symlink" && !mergeManaged,
    });
  }
  for (const relativePath of Object.keys(previousOwnership.files ?? {})) {
    if (!desiredFiles.has(relativePath)) {
      const destination = resolveInside(target, relativePath);
      if (
        !force &&
        previousOwnership.files[relativePath]?.mergeStrategy !== "mcp-config" &&
        previousOwnership.files[relativePath]?.checksum &&
        (await readBytesIfExists(destination)) !== null &&
        (await sha256File(destination)) !== previousOwnership.files[relativePath].checksum
      ) {
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
    const linkable = linkMode === "symlink" && !metadata.mergeStrategy;
    files[relativePath] = {
      ...metadata,
      checksum: content === undefined ? metadata.checksum : checksumText(content),
      ...(linkable ? { link: true } : {}),
    };
  }

  return {
    target,
    actions,
    lock,
    ownership: {
      schemaVersion: ownership.schemaVersion ?? 1,
      files,
    },
    validateApplied,
    transactionId: randomUUID(),
    backupRelativePaths,
  };
}

export async function applyTransaction(plan, { symlinkImpl = symlink } = {}) {
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
    if (bytes === null || bytes === undefined) continue;
    const backupPath = resolveInside(
      plan.target,
      path.join(
        ".ai-engineering",
        "backups",
        "provider-config",
        plan.transactionId,
        relativePath,
      ),
    );
    await mkdir(path.dirname(backupPath), { recursive: true });
    await writeFile(backupPath, bytes);
  }

  async function restore() {
    for (const [relativePath, bytes] of backups) {
      const destination = resolveInside(plan.target, relativePath);
      if (bytes === null) {
        await rm(destination, { force: true });
      } else {
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, bytes);
      }
    }
  }

  try {
    const warnings = [];
    let usedCopyFallback = false;
    for (const action of plan.actions) {
      if (action.action === "remove-managed") {
        await rm(action.destination, { force: true });
        continue;
      }
      await mkdir(path.dirname(action.destination), { recursive: true });
      if (!action.link) {
        await writeFile(action.destination, action.content, "utf8");
        continue;
      }
      const buildPath = resolveInside(
        plan.target,
        path.join(BUILD_DIR, action.relativePath),
      );
      await mkdir(path.dirname(buildPath), { recursive: true });
      await writeFile(buildPath, action.content, "utf8");
      // Xoá đích cũ (file thường hoặc symlink cũ) để tạo lại idempotent.
      await rm(action.destination, { force: true });
      try {
        const linkTarget = path.relative(
          path.dirname(action.destination),
          buildPath,
        );
        await symlinkImpl(linkTarget, action.destination, "file");
      } catch {
        usedCopyFallback = true;
        await writeFile(action.destination, action.content, "utf8");
      }
    }
    if (usedCopyFallback) {
      warnings.push(DEVELOPER_MODE_GUIDANCE);
    }
    await pruneEmptyDirectories(
      plan.target,
      plan.actions
        .filter((action) => action.action === "remove-managed")
        .map((action) => action.relativePath),
    );
    if (plan.validateApplied) {
      await plan.validateApplied();
    }
    if ((plan.lock.plugins ?? []).length === 0) {
      await rm(path.join(plan.target, LOCK_PATH), { force: true });
      await rm(path.join(plan.target, OWNERSHIP_PATH), { force: true });
      await rm(path.join(plan.target, INSTALL_STATE_PATH), { force: true });
    } else {
      await writeJsonAtomic(path.join(plan.target, LOCK_PATH), plan.lock);
      await writeJsonAtomic(path.join(plan.target, OWNERSHIP_PATH), plan.ownership);
      await writeJsonAtomic(
        path.join(plan.target, INSTALL_STATE_PATH),
        createInstallState({ transactionId: plan.transactionId }),
      );
    }
    return {
      status: "pass",
      written: plan.actions.map((action) => action.relativePath),
      warnings,
    };
  } catch (error) {
    await restore();
    throw error;
  }
}
