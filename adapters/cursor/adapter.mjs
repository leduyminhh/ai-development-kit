// adapters/cursor/adapter.mjs
import { jsonFile } from "../_shared/lib.mjs";

function ruleBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  return `---\ndescription: ${c.description}\nalwaysApply: false\n---\n\n# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n`;
}

export default {
  name: "cursor",
  describe: "Cursor",
  build(model, { scope }) {
    if (scope === "global") {
      return { files: [], instruction: null, mcp: { path: ".cursor/mcp.json", format: "json", rootKey: "mcpServers" } };
    }
    const files = [];
    files.push({
      path: ".cursor/rules/provider.json",
      content: jsonFile({
        apiVersion: "ai-engineering.dev/v1alpha1",
        kind: "ProviderProjection",
        provider: "cursor",
        plugins: model.plugins,
        commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      }),
    });
    for (const s of model.skills) files.push({ path: `.cursor/skills/${s.id}`, copyDir: s.sourceDir });
    for (const c of model.commands) files.push({ path: `.cursor/rules/${c.slug}.mdc`, content: ruleBody(c) });
    return {
      files,
      instruction: { path: "AGENTS.md" },
      mcp: { path: ".cursor/mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
