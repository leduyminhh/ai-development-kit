import path from "node:path";
export function generateMcpConfig(root, packIds) {
    return {
        mcpServers: Object.fromEntries([...new Set(packIds)].sort().map((packId) => [
            packId,
            {
                command: "node",
                args: [
                    path.join(root, "mcp-servers", `${packId}-mcp`, "src", "index.js"),
                ],
            },
        ])),
    };
}
