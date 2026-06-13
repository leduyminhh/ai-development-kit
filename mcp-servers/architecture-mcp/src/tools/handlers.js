import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "architecture.generate_system_design": {
    required: ["systemGoal", "qualityAttributes"],
    focus: "bounded components and explicit architectural trade-offs",
    listOutputs: ["components", "dataFlows", "tradeoffs", "validationQuestions"],
  },
  "architecture.review_architecture": {
    required: ["architectureSummary", "reviewFocus"],
    focus: "architectural risks, boundaries, and decision quality",
    listOutputs: ["findings", "risks", "recommendations", "decisionQuestions"],
  },
  "architecture.generate_adr": {
    required: ["decisionTitle", "context", "options"],
    focus: "a traceable architecture decision",
    listOutputs: ["consequences", "alternatives"],
    textOutputs: ["status", "decision"],
  },
});
