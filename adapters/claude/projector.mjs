function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function owners(input) {
  return input.plugins.map((item) => item.id).sort();
}

function commandBody(command) {
  return `---
description: ${command.description}
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

function providerManifest(input) {
  return {
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "ProviderProjection",
    provider: "claude",
    plugins: input.plugins,
    commands: input.commands.map((item) => ({
      id: item.id,
      slug: item.slug,
    })),
  };
}

export function project(input) {
  const allOwners = owners(input);
  const assets = input.plugins.length === 0 ? [] : [
    ...input.skills.map((skill) => ({
      operation: "copy",
      assetType: "skill",
      assetId: skill.id,
      sourcePath: skill.sourcePath,
      destinationPath: `.claude/skills/${skill.id}`,
      owners: skill.owners,
      shared: skill.owners.length > 1,
    })),
    ...input.commands.map((command) => ({
      operation: "render",
      assetType: "command",
      assetId: command.id,
      destinationPath: `.claude/commands/${command.slug}.md`,
      content: commandBody(command),
      owners: command.owners,
      shared: command.owners.length > 1,
    })),
  ];
  if (input.plugins.length > 0 && input.scope === "project") {
    assets.push({
      operation: "render",
      assetType: "provider-manifest",
      assetId: "claude.plugin",
      destinationPath: ".claude-plugin/plugin.json",
      content: json(providerManifest(input)),
      owners: allOwners,
      shared: allOwners.length > 1,
    });
  }
  const order = {
    command: 0,
    "provider-manifest": 1,
    skill: 2,
  };
  assets.sort(
    (left, right) =>
      order[left.assetType] - order[right.assetType] ||
      left.destinationPath.localeCompare(right.destinationPath),
  );

  return {
    schemaVersion: 1,
    provider: "claude",
    scope: input.scope,
    assets,
    instructions: input.plugins.length === 0 ? [] : [
      {
        destinationPath:
          input.scope === "global" ? ".claude/CLAUDE.md" : "CLAUDE.md",
        templatePath: "core/agents/AGENTS.template.md",
      },
    ],
    mcpConfig: {
      destinationPath:
        input.scope === "global" ? ".claude.json" : ".mcp.json",
      format: "json",
      rootKey: "mcpServers",
      servers: input.mcpServers,
    },
  };
}
