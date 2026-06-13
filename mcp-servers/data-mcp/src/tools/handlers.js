import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "data.analyze_schema": {
    required: ["schemaSummary", "workloadProfile"],
    focus: "schema integrity and workload-aligned data modeling",
    listOutputs: ["findings", "normalizationNotes", "queryRisks", "recommendations"],
  },
  "data.review_index": {
    required: ["tableAndQueries", "performanceGoal"],
    focus: "selective indexes with measured read/write trade-offs",
    listOutputs: ["findings", "candidateIndexes", "tradeoffs", "verificationQueries"],
  },
  "data.migration_plan": {
    required: ["sourceContract", "targetContract"],
    focus: "reversible data migration with validated cutover",
    listOutputs: ["stages", "dataChecks", "cutoverGates"],
    textOutputs: ["rollbackPlan"],
  },
});
