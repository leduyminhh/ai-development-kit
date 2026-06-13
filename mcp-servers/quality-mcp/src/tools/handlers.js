import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "quality.generate_test_plan": {
    required: ["scope", "riskProfile"],
    focus: "risk-based deterministic test coverage",
    listOutputs: ["testLevels", "scenarios", "fixtures", "exitCriteria"],
  },
  "quality.review_coverage": {
    required: ["coverageSummary", "criticalFlows"],
    focus: "behavioral coverage for critical user and system flows",
    listOutputs: ["gaps", "priorityTests", "falseConfidenceRisks", "targets"],
  },
  "quality.performance_review": {
    required: ["systemProfile", "performanceGoal"],
    focus: "measurable performance bottlenecks and experiments",
    listOutputs: ["bottlenecks", "experiments", "metrics", "acceptanceCriteria"],
  },
});
