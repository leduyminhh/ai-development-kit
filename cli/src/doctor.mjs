import { access, readFile } from "node:fs/promises";
import path from "node:path";

const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";

async function exists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function readJson(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

export async function doctorProject({ target, context }) {
  const errors = [];

  for (const required of [
    ".ai-engineering/manifest.yaml",
    ".ai-engineering/lockfile.yaml",
    ".ai-engineering/installed-plugins.yaml",
    ".ai-engineering/platform.lock",
  ]) {
    if (
      required === ".ai-engineering/manifest.yaml" &&
      context?.scope === "global"
    ) {
      continue;
    }
    if (!(await exists(path.join(target, required)))) {
      errors.push(`${required} is missing`);
    }
  }

  let lock = { plugins: [], providers: [] };
  if (await exists(path.join(target, ".ai-engineering", "platform.lock"))) {
    lock = await readJson(path.join(target, ".ai-engineering", "platform.lock"));
  }
  const scope = context?.scope ?? lock.scope ?? "project";
  const ownershipPath = path.join(
    target,
    ".ai-engineering",
    "ownership.json",
  );
  if (await exists(ownershipPath)) {
    const ownership = await readJson(ownershipPath);
    for (const [relativePath, metadata] of Object.entries(
      ownership.files ?? {},
    )) {
      if (
        ["command", "skill", "agent", "provider-manifest", "command-catalog"].includes(
          metadata.assetType,
        ) &&
        !(await exists(path.join(target, relativePath)))
      ) {
        errors.push(`projected asset is missing: ${relativePath}`);
      }
    }
  }
  if (scope === "project") {
    const agentsPath = path.join(target, "AGENTS.md");
    const agents = (await exists(agentsPath))
      ? await readFile(agentsPath, "utf8")
      : "";
    if (!agents) errors.push("AGENTS.md is missing");
    if (!agents.includes(BEGIN) || !agents.includes(END)) {
      errors.push("AGENTS.md managed block is invalid");
    }
  }
  if ((lock.plugins ?? []).length === 0) errors.push("no plugins are installed");
  const installedPluginsPath = (await exists(path.join(target, ".ai-engineering", "installed-plugins.yaml")))
    ? path.join(target, ".ai-engineering", "installed-plugins.yaml")
    : path.join(target, ".ai-engineering", "installed-packs.yaml");
  if (await exists(installedPluginsPath)) {
    const installedPlugins = await readJson(
      installedPluginsPath,
    );
    const expected = (lock.plugins ?? []).map((item) => item.id);
    const actual = (installedPlugins.plugins ?? installedPlugins.packs ?? []).map((item) => item.id);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`${path.basename(installedPluginsPath)} does not match platform.lock`);
    }
  }

  const adapterChecks = {
    codex:
      scope === "project"
        ? [".codex/agents/openai.yaml"]
        : [".codex/AGENTS.md"],
    claude:
      scope === "project"
        ? ["CLAUDE.md", ".claude-plugin/plugin.json"]
        : [".claude/CLAUDE.md"],
    cursor:
      scope === "project"
        ? [".cursor/rules/provider.json"]
        : [],
  };
  for (const provider of lock.providers ?? []) {
    for (const relativePath of adapterChecks[provider] ?? []) {
      if (!(await exists(path.join(target, relativePath)))) {
        errors.push(`adapter files are missing for ${provider}: ${relativePath}`);
      }
    }
  }
  for (const deprecated of [".codex-plugin", ".cursor-plugin"]) {
    if (await exists(path.join(target, deprecated))) {
      errors.push(`deprecated target plugin folder remains active: ${deprecated}`);
    }
  }
  if (errors.length > 0) throw new Error(errors.sort().join("\n"));

  return {
    status: "pass",
    scope,
    plugins: (lock.plugins ?? []).map((item) => item.id),
    providers: lock.providers ?? [],
    mcpServers: [],
    nativeChecks: (lock.providers ?? []).map((provider) => ({
      provider,
      status: "skipped",
      reason: "native IDE binary check is optional",
    })),
  };
}
