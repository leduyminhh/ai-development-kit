import { createContractServer } from "../../../core/mcp/stdio-runtime.js";
import { createDeploymentPlan } from "./tools/deployment-plan.js";

export function createServer() {
  return createContractServer({
    contractUrl: new URL("../mcp.json", import.meta.url),
    handlers: {
      "platform.deployment_plan": createDeploymentPlan,
    },
  });
}
