import { readFile } from "node:fs/promises";
import path from "node:path";

export const STATE_DIR = ".ai-engineering";
export const LOCK_PATH = ".ai-engineering/platform.lock";
export const OWNERSHIP_PATH = ".ai-engineering/ownership.json";
export const INSTALL_STATE_PATH = ".ai-engineering/install-state.json";

async function readJsonIfExists(pathname) {
  try {
    return JSON.parse(await readFile(pathname, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readPlatformState(root) {
  return {
    lock: await readJsonIfExists(path.join(root, LOCK_PATH)),
    ownership: await readJsonIfExists(path.join(root, OWNERSHIP_PATH)),
    installState: await readJsonIfExists(path.join(root, INSTALL_STATE_PATH)),
  };
}

export function createPlatformLock(input) {
  return {
    schemaVersion: 1,
    platformVersion: input.platformVersion ?? "1.0.0",
    providers: [...(input.providers ?? [])].sort(),
    plugins: [...(input.plugins ?? [])],
  };
}

export function createOwnership(input) {
  return {
    schemaVersion: 1,
    files: input.files ?? {},
  };
}

export function createInstallState(input) {
  return {
    schemaVersion: 1,
    transactionId: input.transactionId,
    status: "complete",
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
}

export async function validatePlatformState(root) {
  const state = await readPlatformState(root);
  if (state.installState && state.installState.status !== "complete") {
    throw new Error("install state is not complete");
  }
  return state;
}
