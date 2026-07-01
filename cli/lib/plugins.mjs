import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import toml from "@iarna/toml";

const PLUGINS_DIR = "plugins";

function readManifest(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  return yaml.load(text);
}

export function loadPlugins(root) {
  const dir = path.join(root, PLUGINS_DIR);
  const plugins = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestFile = path.join(dir, entry.name, "plugin.yaml");
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

// ==== parser command markdown ====
function stripFrontmatter(text) {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: text };
  return { frontmatter: yaml.load(m[1]) ?? {}, body: m[2] };
}

function sectionBlock(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\s*$`).test(l));
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

function bulletList(block) {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim());
}

function numberedList(block) {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim());
}

export function parseCommandMarkdown(text) {
  const { frontmatter, body } = stripFrontmatter(text);
  return {
    frontmatter,
    intent: sectionBlock(body, "Intent"),
    inputs: bulletList(sectionBlock(body, "Inputs")),
    requiredSkills: bulletList(sectionBlock(body, "Required Skills")),
    steps: numberedList(sectionBlock(body, "Steps")),
    outputContract: bulletList(sectionBlock(body, "Output Contract")),
  };
}

export function parseAgentToml(text) {
  let data = {};
  try { data = toml.parse(text); } catch { data = {}; }
  return {
    name: data.name ?? "",
    description: data.description ?? "",
    instructions: (data.developer_instructions ?? "").trim(),
  };
}

// ==== loadModel ====
export function loadModel({ root, pluginIds, scope = "project" }) {
  const plugins = loadPlugins(root);
  const ids = expandDependencies(resolvePluginIds(pluginIds, root), plugins);

  const skills = [];
  const commands = [];
  const agents = [];
  const workflows = [];
  const hooks = [];

  for (const id of ids) {
    const m = plugins.get(id);
    const base = path.join(root, PLUGINS_DIR, id);

    for (const skill of m?.skills ?? []) {
      const dir = path.dirname(skill.path); // e.g. skills/java-implement
      skills.push({
        id: skill.id,
        sourceDir: path.posix.join(PLUGINS_DIR, id, dir.replaceAll("\\", "/")),
      });
    }

    for (const rel of m?.assets?.commands ?? []) {
      const file = path.join(base, rel);
      if (!fs.existsSync(file)) continue;
      const parsed = parseCommandMarkdown(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
      const fm = parsed.frontmatter;
      commands.push({
        id: fm.id,
        slug: fm.slug,
        description: fm.description ?? "",
        version: fm.version ?? "",
        intent: parsed.intent,
        inputs: parsed.inputs,
        requiredSkills: parsed.requiredSkills,
        steps: parsed.steps,
        outputContract: parsed.outputContract,
        outputSchema: fm.outputSchema ?? "",
      });
    }

    for (const agentId of m?.assets?.agents ?? []) {
      const sourcePath = path.posix.join("adapters", "codex", "agents", `${agentId}.toml`);
      const file = path.join(root, sourcePath);
      const definition = fs.existsSync(file)
        ? parseAgentToml(fs.readFileSync(file, "utf8").replace(/^﻿/, ""))
        : { name: agentId, description: "", instructions: "" };
      agents.push({ id: agentId, sourcePath, definition });
    }

    for (const rel of m?.assets?.workflows ?? []) {
      const wfId = path.basename(rel, path.extname(rel));
      workflows.push({ id: wfId, sourcePath: path.posix.join(PLUGINS_DIR, id, rel.replaceAll("\\", "/")) });
    }

    for (const hookId of m?.assets?.hooks ?? []) hooks.push({ id: hookId });
  }

  commands.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  skills.sort((a, b) => a.id.localeCompare(b.id));
  agents.sort((a, b) => a.id.localeCompare(b.id));

  return {
    scope,
    pluginIds: ids,
    plugins: ids.map((id) => ({ id, version: plugins.get(id)?.metadata?.version ?? "" })),
    skills,
    commands,
    agents,
    workflows,
    hooks,
    mcpServers: {},
  };
}
