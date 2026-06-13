import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "application.review_source_code": {
    required: ["sourceSummary", "reviewGoal"],
    focus: "maintainable source boundaries and regression risk",
    listOutputs: ["findings", "refactoringActions", "testGaps"],
  },
  "application.generate_service": {
    required: ["serviceGoal", "technicalContext"],
    focus: "a production-ready service implementation flow",
    listOutputs: ["components", "implementationSteps", "contracts", "verification"],
  },
  "application.review_api": {
    required: ["apiContract", "reviewGoal"],
    focus: "API correctness, compatibility, and consumer safety",
    listOutputs: ["findings", "compatibilityRisks", "recommendations", "tests"],
  },
});
