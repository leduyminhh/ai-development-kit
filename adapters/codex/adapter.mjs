// adapters/codex/adapter.mjs
import { agentBody, jsonFile, readSource } from "../_shared/lib.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function commandBody(c) {
  const inputs = c.inputs.map((s) => `- ${s}`).join("\n");
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  const schema = c.outputSchema ? `\n## Output Schema\n\n- ${c.outputSchema}\n` : "";
  return `# ${c.id} (${c.slug})\n\n${c.description}\n\n## Inputs\n\n${inputs}\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n${schema}`;
}

function catalog(commands) {
  const index = commands.map((c) => `- \`${c.slug}\` / \`${c.id}\`: ${c.description}`).join("\n");
  const bodies = commands.map(commandBody).join("\n\n");
  return `# Codex Command Catalog\n\nUse this catalog when the user asks for an installed AI Engineering command,\nflow, workflow, or capability entry point. Prefer the matching command file\nunder \`.codex/workflows/commands/<slug>.md\` for the full contract, then load\nthe required skills listed there.\n\n## Index\n\n${index}\n\n## Commands\n\n${bodies}\n`;
}

export default {
  name: "codex",
  describe: "Codex",
  build(model, { scope }) {
    const files = [];
    for (const s of model.skills) files.push({ path: `.agents/skills/${s.id}`, copyDir: s.sourceDir });
    for (const a of model.agents) files.push({ path: `.codex/agents/${a.id}.toml`, content: readSource(ROOT, a.sourcePath) });
    files.push({
      path: ".codex/agents/openai.yaml",
      content: jsonFile({
        apiVersion: "ai-engineering.dev/v1alpha1",
        kind: "ProviderProjection",
        provider: "codex",
        plugins: model.plugins,
        skills: model.skills.map((s) => s.id),
        agents: model.agents.map((a) => a.id),
        hooks: model.hooks.map((h) => h.id),
        commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      }),
    });
    files.push({ path: ".codex/workflows/commands.md", content: catalog(model.commands) });
    for (const c of model.commands) files.push({ path: `.codex/workflows/commands/${c.slug}.md`, content: commandBody(c) });
    return {
      files,
      instruction: { path: scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md" },
      mcp: { path: ".codex/config.toml", format: "toml", rootKey: "mcp_servers" },
    };
  },
};
