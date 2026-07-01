// cli/lib/install.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import toml from "@iarna/toml";
import { loadModel } from "./plugins.mjs";
import { ADAPTERS } from "../build.mjs";
import { writeEntry, readIfExists, removeFileAndPruneEmpty } from "./write.mjs";
import { mergeManagedBlock, removeManagedBlock } from "./managed-block.mjs";
import { scopeRoot, manifestPath } from "./paths.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readManifest(scope = "project") {
  const file = manifestPath(scope);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data && Array.isArray(data.installs)) return data;
  } catch { /* fallback */ }
  return { version: 1, installs: [] };
}

export function writeManifest(scope, manifest) {
  const file = manifestPath(scope);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function baselineBlock(root) {
  return fs.readFileSync(path.join(root, "core", "agents", "AGENTS.baseline.md"), "utf8");
}

function templateFile(root) {
  return fs.readFileSync(path.join(root, "core", "agents", "AGENTS.template.md"), "utf8");
}

function writeMcp(targetRoot, mcp, servers) {
  const dest = path.join(targetRoot, mcp.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const payload = { [mcp.rootKey]: servers ?? {} };
  const text = mcp.format === "toml" ? toml.stringify(payload) : `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(dest, text, "utf8");
  return mcp.path;
}

function applyInstruction(root, targetRoot, relPath) {
  const abs = path.join(targetRoot, relPath);
  const existing = readIfExists(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const content = existing === null
    ? templateFile(root)
    : mergeManagedBlock(existing, baselineBlock(root), relPath);
  fs.writeFileSync(abs, content, "utf8");
  return relPath;
}

export function install({ root = REPO_ROOT, providers, plugins, scope = "project" }) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const results = [];

  for (const provider of providers) {
    const adapter = ADAPTERS[provider];
    if (!adapter) throw new Error(`Provider không hỗ trợ: ${provider}`);
    const model = loadModel({ root, pluginIds: plugins, scope });
    const out = adapter.build(model, { scope });

    const files = [];
    const links = [];
    for (const entry of out.files) {
      const res = writeEntry(targetRoot, entry, { root });
      if (res.link) links.push(res.link);
      else files.push(res.file);
    }
    const managed = out.instruction ? [applyInstruction(root, targetRoot, out.instruction.path)] : [];
    const mcp = out.mcp ? [writeMcp(targetRoot, out.mcp, model.mcpServers)] : [];

    const idx = manifest.installs.findIndex((e) => e.provider === provider && e.scope === scope);
    const record = {
      provider,
      plugins: model.pluginIds,
      scope,
      files,
      links,
      managed,
      mcp,
      installedAt: new Date().toISOString(),
    };
    if (idx === -1) manifest.installs.push(record);
    else manifest.installs[idx] = record;
    results.push({ provider, files: files.length, links: links.length });
  }

  writeManifest(scope, manifest);
  return { scope, root: targetRoot, results };
}

function removeEntry(targetRoot, entry) {
  for (const rel of [...(entry.files ?? []), ...(entry.links ?? []), ...(entry.mcp ?? [])]) {
    removeFileAndPruneEmpty(path.join(targetRoot, rel), targetRoot);
  }
  for (const rel of entry.managed ?? []) {
    const abs = path.join(targetRoot, rel);
    const existing = readIfExists(abs);
    if (existing === null) continue;
    const next = removeManagedBlock(existing);
    if (next.trim() === "") removeFileAndPruneEmpty(abs, targetRoot);
    else fs.writeFileSync(abs, next, "utf8");
  }
}

export function uninstall({ root = REPO_ROOT, providers, plugins, scope = "project" }) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const wantProviders = !providers || providers === "all" ? null : providers;
  const wantPlugins = !plugins || plugins === "all" ? null : (Array.isArray(plugins) ? plugins : [plugins]);

  const removed = [];
  const reinstall = [];
  const keep = [];

  for (const entry of manifest.installs) {
    const providerMatch = !wantProviders || wantProviders.includes(entry.provider);
    if (!providerMatch) { keep.push(entry); continue; }
    if (wantPlugins) {
      const remaining = entry.plugins.filter((p) => !wantPlugins.includes(p));
      if (remaining.length === entry.plugins.length) { keep.push(entry); continue; }
      removeEntry(targetRoot, entry);
      removed.push(entry.provider);
      if (remaining.length) reinstall.push({ provider: entry.provider, plugins: remaining });
    } else {
      removeEntry(targetRoot, entry);
      removed.push(entry.provider);
    }
  }

  manifest.installs = keep;
  writeManifest(scope, manifest);
  for (const r of reinstall) {
    install({ root, providers: [r.provider], plugins: r.plugins, scope });
  }
  return { removed, scope };
}

export function check({ scope = "project" } = {}) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const installs = manifest.installs.map((entry) => {
    const all = [...(entry.files ?? []), ...(entry.links ?? []), ...(entry.managed ?? []), ...(entry.mcp ?? [])];
    const present = all.filter((rel) => fs.existsSync(path.join(targetRoot, rel))).length;
    return {
      provider: entry.provider,
      plugins: entry.plugins,
      total: all.length,
      present,
      missing: all.length - present,
      installedAt: entry.installedAt,
    };
  });
  return { scope, root: targetRoot, manifest: manifestPath(scope), installs };
}
