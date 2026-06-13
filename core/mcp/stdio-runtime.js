import { readFile } from "node:fs/promises";
import readline from "node:readline";

const SUPPORTED_PROTOCOL_VERSION = "2025-03-26";

function defaultToolDefinition(name) {
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

function normalizeTool(tool) {
  if (typeof tool === "string") return defaultToolDefinition(tool);
  return {
    ...defaultToolDefinition(tool.name),
    ...tool,
    annotations: {
      ...defaultToolDefinition(tool.name).annotations,
      ...tool.annotations,
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
    contract.tools.some(
      (tool) =>
        typeof tool !== "string" &&
        (typeof tool !== "object" ||
          tool === null ||
          typeof tool.name !== "string" ||
          typeof tool.inputSchema !== "object"),
    )
  ) {
    throw new Error(`Invalid MCP contract: ${contractUrl}`);
  }
  return {
    ...contract,
    tools: contract.tools.map(normalizeTool),
  };
}

function toolError(message) {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function toolSuccess(result) {
  if (result?.content) return { isError: false, ...result };
  return {
    isError: false,
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
}

async function handleRequest(contract, handlers, message) {
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
      tools: contract.tools,
    });
  }
  if (method === "tools/call") {
    const toolName = params.name;
    if (!contract.tools.some((tool) => tool.name === toolName)) {
      return failure(id, -32602, `Unknown tool: ${toolName}`);
    }
    const handler = handlers[toolName];
    if (!handler) {
      return success(
        id,
        toolError(
          `Tool ${toolName} is declared but has no handler in ${contract.name}. ` +
            "Install or implement the owning capability handler before calling it.",
        ),
      );
    }
    try {
      return success(id, toolSuccess(await handler(params.arguments ?? {})));
    } catch (error) {
      return success(id, toolError(error.message));
    }
  }
  return failure(id, -32601, `Method not found: ${method}`);
}

export function createContractServer({
  contractUrl,
  handlers = {},
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
          response = await handleRequest(contract, handlers, message);
        } catch (error) {
          response = failure(null, -32700, "Parse error", error.message);
        }
        if (response) output.write(`${JSON.stringify(response)}\n`);
      }
    },
  };
}
