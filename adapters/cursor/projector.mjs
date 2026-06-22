function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function owners(input) {
  return input.plugins.map((item) => item.id).sort();
}

function ruleBody(command) {
  return `---
description: ${command.description}
alwaysApply: false
---

# ${command.id} (${command.slug})

## Intent

${command.intent}

## Required Skills

${command.requiredSkills.map((skill) => `- ${skill}`).join("\n")}

## Steps

${command.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Output Contract

${command.outputContract.map((item) => `- ${item}`).join("\n")}
`;
}

export function project(input) {
  const allOwners = owners(input);
  const assets =
    input.plugins.length === 0 || input.scope === "global"
      ? []
      : [
          {
            operation: "render",
            assetType: "provider-manifest",
            assetId: "cursor.provider",
            destinationPath: ".cursor/rules/provider.json",
            content: json({
              apiVersion: "ai-engineering.dev/v1alpha1",
              kind: "ProviderProjection",
              provider: "cursor",
              plugins: input.plugins,
              commands: input.commands.map((item) => ({
                id: item.id,
                slug: item.slug,
              })),
            }),
            owners: allOwners,
            shared: allOwners.length > 1,
          },
          ...input.skills.map((skill) => ({
            operation: "copy",
            assetType: "skill",
            assetId: skill.id,
            sourcePath: skill.sourcePath,
            destinationPath: `.cursor/skills/${skill.id}`,
            owners: skill.owners,
            shared: skill.owners.length > 1,
          })),
          ...(input.workflows ?? []).map((wf) => ({
      operation: "copy",
      assetType: "workflow",
      assetId: wf.id,
      sourcePath: wf.sourcePath,
      destinationPath: `.ai-engineering/workflows/definitions/${wf.id}.yaml`,
      owners: wf.owners,
      shared: wf.owners.length > 1,
    })),
    ...input.commands.map((command) => ({
            operation: "render",
            assetType: "command",
            assetId: command.id,
            destinationPath: `.cursor/rules/${command.slug}.mdc`,
            content: ruleBody(command),
            owners: command.owners,
            shared: command.owners.length > 1,
          })),
        ].sort((left, right) =>
          left.destinationPath.localeCompare(right.destinationPath),
        );

  return {
    schemaVersion: 1,
    provider: "cursor",
    scope: input.scope,
    assets,
    instructions:
      input.plugins.length > 0 && input.scope === "project"
        ? [
            {
              destinationPath: "AGENTS.md",
              templatePath: "core/agents/AGENTS.template.md",
            },
          ]
        : [],
    mcpConfig: {
      destinationPath: ".cursor/mcp.json",
      format: "json",
      rootKey: "mcpServers",
      servers: input.mcpServers,
    },
  };
}
