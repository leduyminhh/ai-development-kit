import path from "node:path";
import * as TOML from "@iarna/toml";

function newline(text) {
  return `${text.trimEnd()}\n`;
}

function assertNoUnmanagedConflicts({
  currentServers,
  desired,
  previouslyManaged,
  force,
}) {
  const managed = new Set(previouslyManaged);
  for (const name of Object.keys(desired)) {
    if (
      Object.hasOwn(currentServers, name) &&
      !managed.has(name) &&
      !force
    ) {
      throw new Error(`unmanaged MCP server already exists: ${name}`);
    }
  }
}

function mergeServers({
  currentServers,
  desired,
  previouslyManaged,
  force,
}) {
  assertNoUnmanagedConflicts({
    currentServers,
    desired,
    previouslyManaged,
    force,
  });
  const next = { ...currentServers };
  for (const name of previouslyManaged) {
    if (!Object.hasOwn(desired, name)) delete next[name];
  }
  for (const [name, registration] of Object.entries(desired)) {
    next[name] = registration;
  }
  return next;
}

function isEmptyConfig(parsed, serverKey) {
  const otherKeys = Object.keys(parsed).filter((key) => key !== serverKey);
  return (
    otherKeys.length === 0 &&
    Object.keys(parsed[serverKey] ?? {}).length === 0
  );
}

export function createMcpRegistrations({ packIds, runtimeRoot }) {
  return Object.fromEntries(
    [...packIds].sort().map((packId) => [
      packId,
      {
        command: "node",
        args: [
          path.join(
            runtimeRoot,
            "mcp-servers",
            `${packId}-mcp`,
            "src",
            "index.js",
          ),
        ],
        env: {},
      },
    ]),
  );
}

export function mergeCodexMcpConfig({
  currentText = "",
  desired,
  previouslyManaged,
  force = false,
}) {
  let parsed;
  try {
    parsed = currentText.trim() ? TOML.parse(currentText) : {};
  } catch (error) {
    throw new Error(`Cannot parse Codex MCP config: ${error.message}`);
  }
  parsed.mcp_servers = mergeServers({
    currentServers: parsed.mcp_servers ?? {},
    desired,
    previouslyManaged,
    force,
  });
  return {
    content: newline(TOML.stringify(parsed)),
    managedNames: Object.keys(desired).sort(),
    empty: isEmptyConfig(parsed, "mcp_servers"),
  };
}

export function mergeJsonMcpConfig({
  currentText = "",
  desired,
  previouslyManaged,
  force = false,
  provider = "JSON",
}) {
  let parsed;
  try {
    parsed = currentText.trim() ? JSON.parse(currentText) : {};
  } catch (error) {
    throw new Error(`Cannot parse ${provider} MCP config: ${error.message}`);
  }
  parsed.mcpServers = mergeServers({
    currentServers: parsed.mcpServers ?? {},
    desired,
    previouslyManaged,
    force,
  });
  return {
    content: `${JSON.stringify(parsed, null, 2)}\n`,
    managedNames: Object.keys(desired).sort(),
    empty: isEmptyConfig(parsed, "mcpServers"),
  };
}

export function removeManagedMcpConfig({
  provider,
  currentText,
  managedNames,
}) {
  if (provider === "codex") {
    return mergeCodexMcpConfig({
      currentText,
      desired: {},
      previouslyManaged: managedNames,
    });
  }
  return mergeJsonMcpConfig({
    currentText,
    desired: {},
    previouslyManaged: managedNames,
    provider: provider === "claude" ? "Claude" : "Cursor",
  });
}
