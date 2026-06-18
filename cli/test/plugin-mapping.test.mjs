import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadPlugins, loadPlatform } from "../src/contracts.mjs";
import { loadPluginCommands } from "../src/command-contracts.mjs";
import { repoRoot } from "./helpers.mjs";

const PLUGIN_IDS = ["application", "architecture", "data", "knowledge", "platform", "quality", "security"];

/**
 * Build a map of all skill directories across all plugins.
 * key = skill name (e.g. "data-migration"), value = plugin that owns it.
 */
async function buildGlobalSkillMap(root) {
  const map = {};
  for (const pluginId of PLUGIN_IDS) {
    const skillsDir = path.join(root, "plugins", pluginId, "skills");
    let entries;
    try { entries = await readdir(skillsDir, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
        try { await readFile(skillPath, "utf8"); map[entry.name] = pluginId; }
        catch { /* skill dir without SKILL.md -- skip */ }
      }
    }
  }
  return map;
}

/**
 * Get all .toml agent names from adapters/codex/agents/
 */
async function buildAgentTomlSet(root) {
  const agentsDir = path.join(root, "adapters", "codex", "agents");
  const files = await readdir(agentsDir);
  return new Set(
    files.filter((f) => f.endsWith(".toml")).map((f) => f.replace(/\.toml$/, ""))
  );
}

test("plugin assets.skills map to existing skill directories", async () => {
  const plugins = await loadPlugins(repoRoot);
  const globalSkills = await buildGlobalSkillMap(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    for (const skill of plugin.assets.skills ?? []) {
      if (!globalSkills[skill]) {
        errors.push(`${pluginId}: assets.skills '${skill}' does not exist in any plugin's skills/ directory`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("plugin assets.agents map to existing .toml files", async () => {
  const plugins = await loadPlugins(repoRoot);
  const tomlAgents = await buildAgentTomlSet(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    const agents = plugin.assets.agents;
    if (agents === "none" || !agents) continue;
    for (const agent of agents) {
      if (!tomlAgents.has(agent)) {
        errors.push(`${pluginId}: assets.agents '${agent}' has no adapters/codex/agents/${agent}.toml`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("each plugin skills/ dir entries have corresponding assets.skills and skills[] entry", async () => {
  const plugins = await loadPlugins(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    const skillsDir = path.join(repoRoot, "plugins", pluginId, "skills");
    let localSkills;
    try { localSkills = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name); }
    catch { localSkills = []; }

    for (const skill of localSkills) {
      if (!(plugin.assets.skills ?? []).includes(skill)) {
        errors.push(`${pluginId}: skills/${skill} exists on disk but missing from assets.skills`);
      }
      const expectedId = pluginId + "." + skill.replace(/-/g, "_");
      const hasEntry = (plugin.skills ?? []).some((s) => s.id === expectedId);
      if (!hasEntry) {
        errors.push(`${pluginId}: skills/${skill} has no skills[] entry for id '${expectedId}'`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("plugin skills[] entries point to existing SKILL.md files", async () => {
  const plugins = await loadPlugins(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    for (const entry of plugin.skills ?? []) {
      const fullPath = path.join(repoRoot, "plugins", pluginId, entry.path);
      try {
        await readFile(fullPath, "utf8");
      } catch {
        errors.push(`${pluginId}: skills[] path '${entry.path}' (id: ${entry.id}) does not exist`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("plugin assets.commands files exist", async () => {
  const plugins = await loadPlugins(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    for (const cmd of plugin.assets.commands ?? []) {
      const fullPath = path.join(repoRoot, "plugins", pluginId, cmd);
      try {
        await readFile(fullPath, "utf8");
      } catch {
        errors.push(`${pluginId}: command '${cmd}' not found`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("plugin assets.workflows files exist", async () => {
  const plugins = await loadPlugins(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    for (const wf of plugin.assets.workflows ?? []) {
      const fullPath = path.join(repoRoot, "plugins", pluginId, wf);
      try {
        await readFile(fullPath, "utf8");
      } catch {
        errors.push(`${pluginId}: workflow '${wf}' not found`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("skills with agents/openai.yaml are declared in assets.agents when .toml exists", async () => {
  const plugins = await loadPlugins(repoRoot);
  const tomlAgents = await buildAgentTomlSet(repoRoot);
  const errors = [];

  for (const [pluginId, plugin] of plugins) {
    const skillsDir = path.join(repoRoot, "plugins", pluginId, "skills");
    let localSkills;
    try { localSkills = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name); }
    catch { localSkills = []; }

    for (const skill of localSkills) {
      const agentYaml = path.join(skillsDir, skill, "agents", "openai.yaml");
      try {
        await readFile(agentYaml, "utf8");
        const declared = plugin.assets.agents !== "none" && (plugin.assets.agents ?? []).includes(skill);
        if (!declared && tomlAgents.has(skill)) {
          errors.push(`${pluginId}: ${skill} has openai.yaml and .toml but not in assets.agents`);
        }
        if (!declared && !tomlAgents.has(skill)) {
          errors.push(`${pluginId}: ${skill} has openai.yaml but no ${skill}.toml -- add agent file or declare intent`);
        }
      } catch { /* no openai.yaml -- fine */ }
    }
  }
  assert.deepEqual(errors, []);
});