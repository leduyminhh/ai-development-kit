function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function owners(input) {
  return input.plugins.map((item) => item.id).sort();
}

function commandBody(command) {
  return `# ${command.id} (${command.slug})

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

function providerManifest(input) {
  return {
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "ProviderProjection",
    provider: "antigravity",
    plugins: input.plugins,
    skills: input.skills.map((item) => item.id),
    commands: input.commands.map((item) => ({
      id: item.id,
      slug: item.slug,
    })),
    agents: input.agents.map((item) => item.id),
    hooks: input.hooks.map((item) => item.id),
  };
}

export function project(input) {
  const allOwners = owners(input);
  const assets =
    input.plugins.length === 0
      ? []
      : [
          ...(input.workflows ?? []).map((wf) => ({
            operation: "copy",
            assetType: "workflow",
            assetId: wf.id,
            sourcePath: wf.sourcePath,
            destinationPath: `.ai-engineering/workflows/definitions/${wf.id}.yaml`,
            owners: wf.owners,
            shared: wf.owners.length > 1,
          })),
          ...input.skills.map((skill) => ({
            operation: "copy",
            assetType: "skill",
            assetId: skill.id,
            sourcePath: skill.sourcePath,
            destinationPath: `skills/${skill.id}`,
            owners: skill.owners,
            shared: skill.owners.length > 1,
          })),
          ...input.commands.map((command) => ({
            operation: "render",
            assetType: "command",
            assetId: command.id,
            destinationPath: `commands/${command.slug}.md`,
            content: commandBody(command),
            owners: command.owners,
            shared: command.owners.length > 1,
          })),
          {
            operation: "render",
            assetType: "provider-manifest",
            assetId: "antigravity.plugin",
            destinationPath: "antigravity-plugin.json",
            content: json(providerManifest(input)),
            owners: allOwners,
            shared: allOwners.length > 1,
          },
          {
            operation: "render",
            assetType: "provider-manifest",
            assetId: "antigravity.rules",
            destinationPath: "rules/provider.json",
            content: json(providerManifest(input)),
            owners: allOwners,
            shared: allOwners.length > 1,
          },
        ].sort((left, right) =>
          left.destinationPath.localeCompare(right.destinationPath),
        );

  return {
    schemaVersion: 1,
    provider: "antigravity",
    scope: input.scope,
    assets,
    instructions:
      input.plugins.length === 0
        ? []
        : [
            {
              destinationPath:
                input.scope === "global" ? ".antigravity/AGENTS.md" : "AGENTS.md",
              templatePath: "core/agents/AGENTS.template.md",
            },
          ],
    mcpConfig: {
      destinationPath: "mcp/mcp.json",
      format: "json",
      rootKey: "mcpServers",
      servers: input.mcpServers,
    },
  };
}
