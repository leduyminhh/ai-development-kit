import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "knowledge.generate_readme": {
    required: ["projectSummary", "audience"],
    focus: "task-oriented project onboarding documentation",
    listOutputs: ["sections", "setupChecklist", "usageExamples", "maintenanceNotes"],
  },
  "knowledge.generate_runbook": {
    required: ["serviceSummary", "operationalScenario"],
    focus: "repeatable incident diagnosis and mitigation",
    listOutputs: ["signals", "diagnosticSteps", "mitigations", "escalationCriteria"],
  },
  "knowledge.review_docs": {
    required: ["documentSummary", "reviewGoal"],
    focus: "complete, clear, and verifiable technical documentation",
    listOutputs: ["findings", "missingSections", "clarityActions", "verification"],
  },
});
