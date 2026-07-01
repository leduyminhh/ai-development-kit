import os from "node:os";
import path from "node:path";

export const PROVIDERS = ["antigravity", "claude", "codex", "cursor"];

export function isProvider(name) {
  return PROVIDERS.includes(name);
}

export function scopeRoot(scope = "project") {
  if (process.env.AIE_INSTALL_ROOT) return process.env.AIE_INSTALL_ROOT;
  return scope === "global" ? os.homedir() : process.cwd();
}

export function buildDir(root) {
  return path.join(root, "build");
}

export function manifestPath(scope = "project") {
  return path.join(scopeRoot(scope), ".ai-engineering", "manifest.json");
}
