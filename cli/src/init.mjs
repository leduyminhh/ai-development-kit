import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadPlatform } from "./contracts.mjs";
import { writeJsonAtomic } from "./io.mjs";

const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";

async function readIfExists(pathname) {
  try {
    return await readFile(pathname, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function mergeManagedBlock(existing, baseline) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start === -1 && end === -1) {
    return `${existing.trimEnd()}\n\n${baseline.trim()}\n`;
  }
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AGENTS.md contains an invalid AI Engineering managed block");
  }
  return `${existing.slice(0, start)}${baseline.trim()}${existing.slice(
    end + END.length,
  )}`;
}

export async function initializeProject({ root, target }) {
  const platform = await loadPlatform(root);
  const agentsPath = path.join(target, "AGENTS.md");
  const stateRoot = path.join(target, ".ai-engineering");
  const backupRoot = path.join(stateRoot, "backups");
  const template = await readFile(
    path.join(root, "core", "agents", "AGENTS.template.md"),
    "utf8",
  );
  const baseline = await readFile(
    path.join(root, "core", "agents", "AGENTS.baseline.md"),
    "utf8",
  );
  const existing = await readIfExists(agentsPath);

  await mkdir(backupRoot, { recursive: true });
  if (existing === null) {
    await writeFile(agentsPath, template, "utf8");
  } else {
    await copyFile(agentsPath, path.join(backupRoot, "AGENTS.md"));
    await writeFile(agentsPath, mergeManagedBlock(existing, baseline), "utf8");
  }

  await writeJsonAtomic(path.join(stateRoot, "manifest.yaml"), {
    schemaVersion: 1,
    platform: platform.product.name,
    version: platform.product.version,
    initializedAt: new Date().toISOString(),
  });
  if ((await readIfExists(path.join(stateRoot, "lockfile.yaml"))) === null) {
    await writeJsonAtomic(path.join(stateRoot, "lockfile.yaml"), {
      schemaVersion: 1,
      platformVersion: platform.product.version,
      packs: [],
    });
  }
  if ((await readIfExists(path.join(stateRoot, "installed-packs.yaml"))) === null) {
    await writeJsonAtomic(path.join(stateRoot, "installed-packs.yaml"), {
      schemaVersion: 1,
      packs: [],
    });
  }

  return { status: "pass", target };
}
