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
    provider: "codex",
    plugins: input.plugins,
    skills: input.skills.map((item) => item.id),
    agents: input.agents.map((item) => item.id),
    hooks: input.hooks.map((item) => item.id),
    commands: input.commands.map((item) => ({
      id: item.id,
      slug: item.slug,
    })),
  };
}

export function project(input) {
  const allOwners = owners(input);
  const assets = input.plugins.length === 0 ? [] : [
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
      destinationPath: `.agents/skills/${skill.id}`,
      owners: skill.owners,
      shared: skill.owners.length > 1,
    })),
    ...input.agents.map((agent) => ({
      operation: "copy",
      assetType: "agent",
      assetId: agent.id,
      sourcePath: agent.sourcePath,
      destinationPath: `.codex/agents/${agent.id}.toml`,
      owners: agent.owners,
      shared: agent.owners.length > 1,
    })),
    {
      operation: "render",
      assetType: "provider-manifest",
      assetId: "codex.openai",
      destinationPath: ".codex/agents/openai.yaml",
      content: json(providerManifest(input)),
      owners: allOwners,
      shared: allOwners.length > 1,
    },
    {
      operation: "render",
      assetType: "command-catalog",
      assetId: "codex.commands",
      destinationPath: ".codex/workflows/commands.md",
      content: input.commands.map(commandBody).join("\n"),
      owners: allOwners,
      shared: allOwners.length > 1,
    },
  ].sort((left, right) =>
    left.destinationPath.localeCompare(right.destinationPath),
  );

  return {
    schemaVersion: 1,
    provider: "codex",
    scope: input.scope,
    assets,
    instructions: input.plugins.length === 0 ? [] : [
      {
        destinationPath:
          input.scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md",
        templatePath: "core/agents/AGENTS.template.md",
      },
    ],
    mcpConfig: {
      destinationPath: ".codex/config.toml",
      format: "toml",
      rootKey: "mcp_servers",
      servers: input.mcpServers,
    },
  };
}
