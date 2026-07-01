// adapters/antigravity/adapter.mjs
import { agentBody, jsonFile } from "../_shared/lib.mjs";

function commandBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  return `# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n`;
}

export default {
  name: "antigravity",
  describe: "Google Antigravity",
  build(model, { scope }) {
    const manifest = {
      apiVersion: "ai-engineering.dev/v1alpha1",
      kind: "ProviderProjection",
      provider: "antigravity",
      plugins: model.plugins,
      skills: model.skills.map((s) => s.id),
      commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      agents: model.agents.map((a) => a.id),
      hooks: model.hooks.map((h) => h.id),
    };
    const files = [];
    for (const s of model.skills) files.push({ path: `skills/${s.id}`, copyDir: s.sourceDir });
    for (const c of model.commands) files.push({ path: `commands/${c.slug}.md`, content: commandBody(c) });
    for (const a of model.agents) files.push({ path: `agents/${a.id}.md`, content: agentBody(a) });
    files.push({ path: "antigravity-plugin.json", content: jsonFile(manifest) });
    files.push({ path: "rules/provider.json", content: jsonFile(manifest) });
    return {
      files,
      instruction: { path: scope === "global" ? ".antigravity/AGENTS.md" : "AGENTS.md" },
      mcp: { path: "mcp/mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
