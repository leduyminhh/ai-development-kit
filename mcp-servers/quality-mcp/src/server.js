import { createContractServer } from "../../../core/mcp/stdio-runtime.js";

export function createServer() {
  return createContractServer({
    contractUrl: new URL("../mcp.json", import.meta.url),
  });
}
