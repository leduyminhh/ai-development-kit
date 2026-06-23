import { readFile } from "node:fs/promises";
import path from "node:path";
import { findSkillPath } from "./contracts.mjs";
import { loadPluginCommands } from "./command-contracts.mjs";
function relativePath(root, absolutePath) {
    return path.relative(root, absolutePath).replaceAll("\\", "/");
}
// Codex agent definitions are authored as TOML under adapters/codex/agents.
// Extract the provider-neutral fields so projectors that render Markdown agents
// (e.g. Claude) do not need to re-read or re-parse the source.
function parseAgentDefinition(text) {
    const field = (key) => {
        const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
        return match ? match[1] : "";
    };
    const instructions = text.match(/developer_instructions\s*=\s*"""\r?\n?([\s\S]*?)"""/);
    return {
        name: field("name"),
        description: field("description"),
        instructions: instructions ? instructions[1].trim() : "",
    };
}
async function loadAgentDefinition(root, sourcePath) {
    try {
        return parseAgentDefinition(await readFile(path.join(root, sourcePath), "utf8"));
    }
    catch {
        return undefined;
    }
}
function ownersFor(graph, type, id) {
    return [...(graph.ownership?.[type]?.[id] ?? graph.pluginIds)].sort();
}
export async function buildProjectionInput({ root, graph, plugins, scope, provider, mcpServers, }) {
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
                outputSchema: command.outputSchema,
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
    const agents = [];
    for (const id of graph.agents) {
        const sourcePath = `adapters/codex/agents/${id}.toml`;
        agents.push({
            id,
            sourcePath,
            owners: ownersFor(graph, "agents", id),
            definition: await loadAgentDefinition(root, sourcePath),
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
        agents,
        hooks: graph.hooks.map((id) => ({
            id,
            owners: ownersFor(graph, "hooks", id),
        })),
        workflows: graph.workflows.map((id) => {
            const workflowOwners = ownersFor(graph, "workflows", id);
            const ownerPlugin = workflowOwners[0];
            return {
                id,
                sourcePath: `plugins/${ownerPlugin}/workflows/${id}.yaml`,
                owners: workflowOwners,
            };
        }),
        mcpServers: mcpServers ?? {},
    };
}
