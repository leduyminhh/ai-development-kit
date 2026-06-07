import path from "node:path";

export function generateMcpConfig(root: string, packIds: string[]): object {
  return {
    mcpServers: Object.fromEntries(
      [...new Set(packIds)].sort().map((packId) => [
        packId,
        {
          command: "node",
          args: [
            path.join(root, "mcp-servers", `${packId}-mcp`, "src", "index.js"),
          ],
        },
      ]),
    ),
  };
}
