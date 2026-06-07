function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function commandBody(command) {
  return `# ${command.id}

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
  return {
    manifest: providerManifest,
    workflow,
    intent: context.commands[0]?.intent ?? "",
    files: [
      {
        path: ".codex/agents/openai.yaml",
        content: json(providerManifest),
      },
      {
        path: ".codex/workflows/commands.md",
        content: workflow,
      },
    ],
  };
}

export function projectClaude(context) {
  const providerManifest = manifest(context, "claude");
  const commands = context.commands.map((command) => ({
    path: `commands/${command.id}.md`,
    content: `---\ndescription: ${command.description}\n---\n\n${commandBody(command)}`,
  }));
  return {
    manifest: providerManifest,
    command: commands[0]?.content ?? "",
    intent: context.commands[0]?.intent ?? "",
    files: [
      {
        path: ".claude-plugin/plugin.json",
        content: json(providerManifest),
      },
      ...commands,
    ],
  };
}

export function projectCursor(context) {
  const providerManifest = manifest(context, "cursor");
  const rules = context.commands.map((command) => ({
    path: `.cursor/rules/${command.id}.mdc`,
    content: `---\ndescription: ${command.description}\nalwaysApply: false\n---\n\n${commandBody(command)}`,
  }));
  return {
    manifest: providerManifest,
    rule: rules[0]?.content ?? "",
    intent: context.commands[0]?.intent ?? "",
    files: [
      {
        path: ".cursor/rules/provider.json",
        content: json(providerManifest),
      },
      ...rules,
    ],
  };
}

export function projectGeneric(context) {
  const providerManifest = manifest(context, "generic");
  return {
    manifest: providerManifest,
    workflow: context.commands.map(commandBody).join("\n"),
    intent: context.commands[0]?.intent ?? "",
    files: [
      {
        path: "rules/commands.md",
        content: context.commands.map(commandBody).join("\n"),
      },
      {
        path: ".ai-engineering/provider.json",
        content: json(providerManifest),
      },
    ],
  };
}

export function projectProviders(context) {
  return {
    codex: projectCodex(context),
    claude: projectClaude(context),
    cursor: projectCursor(context),
    generic: projectGeneric(context),
  };
}
