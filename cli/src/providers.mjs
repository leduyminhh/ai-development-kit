function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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

function manifest(context, provider) {
  return {
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "ProviderProjection",
    provider,
    plugin: {
      id: context.plugin.metadata.id,
      name: context.plugin.metadata.name,
      version: context.plugin.metadata.version,
    },
    skills: [...context.skills].sort(),
    agents: [...context.agents].sort(),
    hooks: [...context.hooks].sort(),
    commands: context.commands.map((command) => command.id).sort(),
  };
}

export function projectCodex(context) {
  const providerManifest = manifest(context, "codex");
  const workflow = context.commands.map(commandBody).join("\n");
  const codexFiles = [
    {
      path: ".codex/agents/openai.yaml",
      content: json(providerManifest),
    },
    {
      path: ".codex/workflows/commands.md",
      content: workflow,
    },
  ];
  return {
    manifest: providerManifest,
    workflow,
    intent: context.commands[0]?.intent ?? "",
    files: codexFiles,
    mcpConfig: {
      provider: "codex",
      format: "toml",
      path: ".codex/config.toml",
      servers: context.mcpServers ?? {},
    },
  };
}

export function projectClaude(context) {
  const providerManifest = manifest(context, "claude");
  const commands = context.commands.map((command) => ({
    path: `.claude/commands/${command.slug}.md`,
    content: `---\ndescription: ${command.description}\n---\n\n${commandBody(command)}`,
  }));
  const projectFiles = [
    {
      path: ".claude-plugin/plugin.json",
      content: json(providerManifest),
    },
    ...commands,
  ];
  return {
    manifest: providerManifest,
    command: commands[0]?.content ?? "",
    intent: context.commands[0]?.intent ?? "",
    files: context.scope === "global" ? commands : projectFiles,
    mcpConfig: {
      provider: "claude",
      format: "json",
      path: context.scope === "global" ? ".claude.json" : ".mcp.json",
      servers: context.mcpServers ?? {},
    },
  };
}

export function projectCursor(context) {
  const providerManifest = manifest(context, "cursor");
  const rules = context.commands.map((command) => ({
    path: `.cursor/rules/${command.slug}.mdc`,
    content: `---\ndescription: ${command.description}\nalwaysApply: false\n---\n\n${commandBody(command)}`,
  }));
  const projectFiles = [
    {
      path: ".cursor/rules/provider.json",
      content: json(providerManifest),
    },
    ...rules,
  ];
  return {
    manifest: providerManifest,
    rule: rules[0]?.content ?? "",
    intent: context.commands[0]?.intent ?? "",
    files: context.scope === "global" ? [] : projectFiles,
    mcpConfig: {
      provider: "cursor",
      format: "json",
      path: ".cursor/mcp.json",
      servers: context.mcpServers ?? {},
    },
  };
}

export function projectProviders(context) {
  return {
    codex: projectCodex(context),
    claude: projectClaude(context),
    cursor: projectCursor(context),
  };
}
