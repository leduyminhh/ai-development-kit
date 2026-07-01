import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const PLUGINS_DIR = "plugins";

function readManifest(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  return yaml.load(text);
}

export function loadPlugins(root) {
  const dir = path.join(root, PLUGINS_DIR);
  const plugins = new Map();
  for (const name of fs.readdirSync(dir)) {
    const manifestFile = path.join(dir, name, "plugin.yaml");
    if (!fs.existsSync(manifestFile)) continue;
    const manifest = readManifest(manifestFile);
    const id = manifest?.metadata?.id;
    if (id) plugins.set(id, manifest);
  }
  return plugins;
}

export function knownPluginIds(root) {
  return [...loadPlugins(root).keys()].sort();
}

export function resolvePluginIds(sel, root) {
  const all = knownPluginIds(root);
  if (!sel || sel === "all" || (Array.isArray(sel) && sel.length === 0)) return all;
  const ids = Array.isArray(sel) ? sel : [sel];
  const bad = ids.filter((id) => !all.includes(id));
  if (bad.length) throw new Error(`Plugin không tồn tại: ${bad.join(", ")}`);
  return ids;
}

export function expandDependencies(ids, plugins) {
  const out = new Set();
  const visiting = new Set();
  const visit = (id) => {
    if (out.has(id)) return;
    if (visiting.has(id)) throw new Error(`Vòng lặp phụ thuộc tại: ${id}`);
    visiting.add(id);
    const required = plugins.get(id)?.dependencies?.required ?? [];
    for (const dep of required) if (plugins.has(dep)) visit(dep);
    visiting.delete(id);
    out.add(id);
  };
  for (const id of ids) visit(id);
  return [...out].sort();
}

export function validatePlugins(plugins, root) {
  const errors = [];
  const seen = new Set();
  for (const [id, m] of plugins) {
    if (!m?.metadata?.id) errors.push(`${id}: thiếu metadata.id`);
    if (seen.has(id)) errors.push(`${id}: trùng id`);
    seen.add(id);
    const commands = m?.assets?.commands;
    if (Array.isArray(commands)) {
      for (const rel of commands) {
        const file = path.join(root, PLUGINS_DIR, id, rel);
        if (!fs.existsSync(file)) errors.push(`${id}: thiếu command ${rel}`);
      }
    }
    for (const skill of m?.skills ?? []) {
      const file = path.join(root, PLUGINS_DIR, id, skill.path);
      if (!fs.existsSync(file)) errors.push(`${id}: thiếu skill ${skill.path}`);
    }
  }
  return errors;
}
