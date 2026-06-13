import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "platform.review_docker": {
    required: ["dockerfile", "deploymentGoal"],
    focus: "container security, reproducibility, and runtime operability",
    listOutputs: ["findings", "hardeningActions", "verificationChecks"],
  },
  "platform.review_kubernetes": {
    required: ["manifest", "workloadGoal"],
    focus: "Kubernetes reliability, security, and rollout safety",
    listOutputs: ["findings", "reliabilityActions", "verificationChecks"],
  },
  "platform.deployment_plan": {
    required: ["releaseScope", "targetEnvironment"],
    focus: "staged deployment with observable gates and reversible changes",
    listOutputs: [
      "deploymentStages",
      "readinessGates",
      "verificationCommands",
    ],
    textOutputs: ["rollbackProcedure"],
  },
});
