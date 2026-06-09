import { readFile } from "node:fs/promises";
import readline from "node:readline";

const SUPPORTED_PROTOCOL_VERSION = "2025-03-26";

function toolDefinition(name) {
  return {
    name,
    title: name,
    description: `Declared capability tool ${name}.`,
    inputSchema: {
      type: "object",
      additionalProperties: true,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  };
}

function success(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function failure(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

async function loadContract(contractUrl) {
  const contract = JSON.parse(await readFile(contractUrl, "utf8"));
  if (
    typeof contract.name !== "string" ||
    typeof contract.version !== "string" ||
    !Array.isArray(contract.tools) ||
    contract.tools.some((tool) => typeof tool !== "string")
  ) {
    throw new Error(`Invalid MCP contract: ${contractUrl}`);
  }
  return contract;
}

function handleRequest(contract, message) {
  const { id, method, params = {} } = message;
  if (id === undefined) return undefined;

  if (method === "initialize") {
    return success(id, {
      protocolVersion: params.protocolVersion ?? SUPPORTED_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: {
        name: contract.name,
        version: contract.version,
      },
    });
  }
  if (method === "ping") return success(id, {});
  if (method === "tools/list") {
    return success(id, {
      tools: contract.tools.map(toolDefinition),
    });
  }
  if (method === "tools/call") {
    const toolName = params.name;
    if (!contract.tools.includes(toolName)) {
      return failure(id, -32602, `Unknown tool: ${toolName}`);
    }
    return success(id, {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `Tool ${toolName} is declared but has no handler in ${contract.name}. ` +
            "Install or implement the owning capability handler before calling it.",
        },
      ],
    });
  }
  return failure(id, -32601, `Method not found: ${method}`);
}

export function createContractServer({
  contractUrl,
  input = process.stdin,
  output = process.stdout,
} = {}) {
  if (!contractUrl) throw new Error("contractUrl is required");

  return {
    async start() {
      const contract = await loadContract(contractUrl);
      const lines = readline.createInterface({
        input,
        crlfDelay: Infinity,
      });

      for await (const line of lines) {
        if (!line.trim()) continue;
        let response;
        try {
          const message = JSON.parse(line);
          response = handleRequest(contract, message);
        } catch (error) {
          response = failure(null, -32700, "Parse error", error.message);
        }
        if (response) output.write(`${JSON.stringify(response)}\n`);
      }
    },
  };
}
