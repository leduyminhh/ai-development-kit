import path from "node:path";
import { fileURLToPath } from "node:url";
import claude from "../adapters/claude/adapter.mjs";
import codex from "../adapters/codex/adapter.mjs";
import cursor from "../adapters/cursor/adapter.mjs";
import antigravity from "../adapters/antigravity/adapter.mjs";
import { loadModel, loadPlugins, validatePlugins } from "./lib/plugins.mjs";
import { writeEntry } from "./lib/write.mjs";
import { PROVIDERS, buildDir } from "./lib/paths.mjs";

export const ADAPTERS = { antigravity, claude, codex, cursor };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildProvider({ root, provider, pluginIds, scope = "project", outDir }) {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Provider không hỗ trợ: ${provider}`);
  const model = loadModel({ root, pluginIds, scope });
  const result = adapter.build(model, { scope });
  const base = path.join(outDir, provider);
  let count = 0;
  for (const entry of result.files) {
    writeEntry(base, entry, { root });
    count += 1;
  }
  return { provider, count };
}

export function runBuild({ root = REPO_ROOT, providers = PROVIDERS, pluginIds = "all", outDir } = {}) {
  const errors = validatePlugins(loadPlugins(root), root);
  if (errors.length) {
    throw new Error(`Nội dung không hợp lệ:\n- ${errors.join("\n- ")}`);
  }
  const target = outDir ?? buildDir(root);
  const results = [];
  for (const provider of providers) {
    results.push(buildProvider({ root, provider, pluginIds, scope: "project", outDir: target }));
  }
  return { results, errors: [] };
}
