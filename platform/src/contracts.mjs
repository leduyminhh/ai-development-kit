import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { AiepError } from "./errors.mjs";

const PROVIDERS = ["codex", "claude", "cursor"];
const PLUGIN_KEYS = new Set([
  "apiVersion",
  "kind",
  "metadata",
  "compatibility",
  "dependencies",
  "assets",
  "install",
]);

async function readJson(pathname) {
  try {
    return JSON.parse(await readFile(pathname, "utf8"));
  } catch (error) {
    throw new AiepError(`Cannot read JSON contract ${pathname}: ${error.message}`, {
      code: "AIEP_INVALID_CONTRACT",
    });
  }
}

function parseSectionList(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"),
  );
  if (!match) {
    return [];
  }
  return [...match[1].matchAll(/^- (.+)$/gm)].map((item) => item[1].trim());
}

function parseSectionText(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"),
  );
  return match?.[1].trim() ?? "";
}

export async function loadPlatform(root) {
  const value = await readJson(path.join(root, "aidk.config.yaml"));
  if (value.apiVersion !== "aiep.dev/v1alpha1") {
    throw new AiepError("unsupported platform apiVersion", {
      code: "AIEP_INVALID_CONTRACT",
    });
  }
  return value;
}

export async function loadPlugins(root) {
  const packagesRoot = path.join(root, "packages");
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const plugins = new Map();
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const plugin = await readJson(path.join(packagesRoot, entry.name, "package.yaml"));
    const unknownKeys = Object.keys(plugin).filter((key) => !PLUGIN_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new AiepError(
        `plugin ${entry.name} has unknown keys: ${unknownKeys.sort().join(", ")}`,
        { code: "AIEP_INVALID_CONTRACT" },
      );
    }
    plugins.set(entry.name, plugin);
  }
  return new Map([...plugins].sort(([left], [right]) => left.localeCompare(right)));
}

export async function loadCanonicalCommand(pathname) {
  let markdown;
  try {
    markdown = await readFile(pathname, "utf8");
  } catch {
    throw new AiepError(`missing command ${path.basename(pathname, ".md")}`, {
      code: "AIEP_INVALID_COMMAND",
    });
  }
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    throw new AiepError(`command ${pathname} has invalid frontmatter`, {
      code: "AIEP_INVALID_COMMAND",
    });
  }
  const metadata = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
  const body = markdown.slice(match[0].length);
  return {
    ...metadata,
    intent: parseSectionText(body, "Intent"),
    inputs: parseSectionList(body, "Inputs"),
    requiredSkills: parseSectionList(body, "Required Skills"),
    steps: [...parseSectionText(body, "Steps").matchAll(/^\d+\. (.+)$/gm)].map(
      (item) => item[1].trim(),
    ),
    outputContract: parseSectionList(body, "Output Contract"),
    markdown,
  };
}

function detectCycles(plugins, errors) {
  const visiting = new Set();
  const visited = new Set();
  function visit(pluginId) {
    if (visiting.has(pluginId)) {
      errors.push(`dependency cycle detected at ${pluginId}`);
      return;
    }
    if (visited.has(pluginId) || !plugins.has(pluginId)) {
      return;
    }
    visiting.add(pluginId);
    for (const dependency of plugins.get(pluginId).dependencies?.required ?? []) {
      visit(dependency);
    }
    visiting.delete(pluginId);
    visited.add(pluginId);
  }
  for (const pluginId of plugins.keys()) {
    visit(pluginId);
  }
}

export async function validateRepository(root) {
  const platform = await loadPlatform(root);
  const plugins = await loadPlugins(root);
  const skills = new Set(
    (await readdir(path.join(root, "skills"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  const agents = new Set(
    (await readdir(path.join(root, ".codex", "agents"), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
      .map((entry) => path.basename(entry.name, ".toml")),
  );
  const errors = [];
  const commandOwners = new Map();

  if (platform.product?.name !== "ai-engineering-platform") {
    errors.push("platform product name must be ai-engineering-platform");
  }

  for (const [pluginId, plugin] of plugins) {
    if (plugin.apiVersion !== "aiep.dev/v1alpha1") {
      errors.push(`unsupported plugin apiVersion: ${pluginId}`);
    }
    if (plugin.kind !== "Plugin") {
      errors.push(`invalid plugin kind: ${pluginId}`);
    }
    if (plugin.metadata?.id !== pluginId) {
      errors.push(`plugin id must match directory: ${pluginId}`);
    }
    if (plugin.metadata?.version !== platform.product?.version) {
      errors.push(`plugin version must match platform version: ${pluginId}`);
    }
    for (const dependency of [
      ...(plugin.dependencies?.required ?? []),
      ...(plugin.dependencies?.optional ?? []),
    ]) {
      if (!plugins.has(dependency)) {
        errors.push(`plugin ${pluginId} references unknown dependency ${dependency}`);
      }
    }
    for (const skill of plugin.assets?.skills ?? []) {
      if (!skills.has(skill)) {
        errors.push(`plugin ${pluginId} references unknown skill ${skill}`);
      }
    }
    for (const agent of plugin.assets?.agents ?? []) {
      if (!agents.has(agent)) {
        errors.push(`plugin ${pluginId} references unknown agent ${agent}`);
      }
    }
    if ((plugin.assets?.skills ?? []).length === 0) {
      errors.push(`plugin ${pluginId} must declare at least one skill`);
    }
    if ((plugin.assets?.commands ?? []).length === 0) {
      errors.push(`plugin ${pluginId} must declare at least one command`);
    }
    for (const commandId of plugin.assets?.commands ?? []) {
      let command;
      try {
        command = await loadCanonicalCommand(
          path.join(root, "packages", pluginId, "commands", `${commandId}.md`),
        );
      } catch (error) {
        errors.push(error.message);
        continue;
      }
      if (command.id !== commandId) {
        errors.push(`command id mismatch: ${pluginId}/${commandId}`);
      }
      if (commandOwners.has(command.id)) {
        errors.push(
          `duplicate command id ${command.id}: ${commandOwners.get(command.id)}, ${pluginId}`,
        );
      }
      commandOwners.set(command.id, pluginId);
      for (const skill of command.requiredSkills) {
        if (!(plugin.assets?.skills ?? []).includes(skill)) {
          errors.push(`command ${commandId} references undeclared skill ${skill}`);
        }
      }
      if (/[.]((claude|cursor|codex)(-plugin)?)[/\\]/i.test(command.markdown)) {
        errors.push(`command ${commandId} contains provider-specific path`);
      }
      for (const heading of [
        "intent",
        "inputs",
        "requiredSkills",
        "steps",
        "outputContract",
      ]) {
        if (command[heading].length === 0) {
          errors.push(`command ${commandId} has empty ${heading}`);
        }
      }
    }
  }
  detectCycles(plugins, errors);

  if (errors.length > 0) {
    throw new AiepError(errors.sort().join("\n"), {
      code: "AIEP_INVALID_REPOSITORY",
      details: errors.sort(),
    });
  }
  return {
    status: "pass",
    pluginCount: plugins.size,
    providerCount: PROVIDERS.length,
  };
}

export async function validateArtifactManifest(value) {
  if (
    value?.apiVersion !== "aiep.dev/v1alpha1" ||
    value?.kind !== "PluginArtifact" ||
    !value?.metadata?.id ||
    !value?.metadata?.version
  ) {
    throw new AiepError("invalid plugin artifact manifest", {
      code: "AIEP_INVALID_ARTIFACT",
    });
  }
  return value;
}
