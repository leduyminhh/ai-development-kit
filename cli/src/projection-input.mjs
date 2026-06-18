import path from "node:path";

import { findSkillPath } from "./contracts.mjs";
import { loadPluginCommands } from "./command-contracts.mjs";

function relativePath(root, absolutePath) {
  return path.relative(root, absolutePath).replaceAll("\\", "/");
}

function ownersFor(graph, type, id) {
  return [...(graph.ownership?.[type]?.[id] ?? graph.pluginIds)].sort();
}

export async function buildProjectionInput({
  root,
  graph,
  plugins,
  scope,
  provider,
  mcpServers,
}) {
  const commands = [];
  for (const pluginId of graph.pluginIds) {
    const plugin = plugins.get(pluginId);
    for (const command of await loadPluginCommands({
      root,
      pluginId,
      plugin,
    })) {
      commands.push({
        id: command.id,
        pluginId: command.pluginId,
        slug: command.slug,
        description: command.description,
        version: command.version,
        intent: command.intent,
        inputs: command.inputs,
        requiredSkills: command.requiredSkills,
        steps: command.steps,
        outputContract: command.outputContract,
        sourcePath: command.sourcePath,
        markdown: command.markdown,
        owners: ownersFor(graph, "commands", command.id),
      });
    }
  }
  commands.sort((left, right) => left.id.localeCompare(right.id));

  const skills = [];
  for (const id of graph.skills) {
    const source = await findSkillPath(root, id);
    skills.push({
      id,
      sourcePath: relativePath(root, source),
      owners: ownersFor(graph, "skills", id),
    });
  }

  return {
    schemaVersion: 1,
    scope,
    provider,
    plugins: graph.pluginIds.map((id) => ({
      id,
      version: plugins.get(id).metadata.version,
    })),
    skills,
    commands,
    agents: graph.agents.map((id) => ({
      id,
      sourcePath: `adapters/codex/agents/${id}.toml`,
      owners: ownersFor(graph, "agents", id),
    })),
    hooks: graph.hooks.map((id) => ({
      id,
      owners: ownersFor(graph, "hooks", id),
    })),
    mcpServers: mcpServers ?? {},
  };
}
