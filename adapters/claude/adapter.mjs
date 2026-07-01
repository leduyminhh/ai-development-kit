// adapters/claude/adapter.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentBody, jsonFile } from "../_shared/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function commandBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  const schema = c.outputSchema ? `\n## Output Schema\n\n- ${c.outputSchema}\n` : "";
  return `---\ndescription: ${c.description}\n---\n\n# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n${schema}`;
}

export default {
  name: "claude",
  describe: "Claude Code",
  build(model, { scope }) {
    const files = [];
    for (const s of model.skills) files.push({ path: `.claude/skills/${s.id}`, copyDir: s.sourceDir });
    for (const a of model.agents) files.push({ path: `.claude/agents/${a.id}.md`, content: agentBody(a) });
    for (const c of model.commands) files.push({ path: `.claude/commands/${c.slug}.md`, content: commandBody(c) });
    if (scope === "project") {
      files.push({
        path: ".claude-plugin/plugin.json",
        content: jsonFile({
          apiVersion: "ai-engineering.dev/v1alpha1",
          kind: "ProviderProjection",
          provider: "claude",
          plugins: model.plugins,
          commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
        }),
      });
    }
    return {
      files,
      instruction: { path: scope === "global" ? ".claude/CLAUDE.md" : "CLAUDE.md" },
      mcp: { path: scope === "global" ? ".claude.json" : ".mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
