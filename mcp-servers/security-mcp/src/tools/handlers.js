import { createCapabilityHandlers } from "../../../../core/mcp/workflow-tools.js";

export const handlers = createCapabilityHandlers({
  "security.scan_source": {
    required: ["sourceSummary", "threatContext"],
    focus: "source-level security controls and exploitability",
    listOutputs: ["findings", "severitySummary", "remediations", "verification"],
  },
  "security.scan_dependencies": {
    required: ["dependencyManifest", "runtimeContext"],
    focus: "dependency risk and software supply-chain integrity",
    listOutputs: ["findings", "upgradeActions", "supplyChainChecks", "verification"],
  },
  "security.generate_threat_model": {
    required: ["systemSummary", "trustBoundaries"],
    focus: "assets, trust boundaries, abuse cases, and mitigations",
    listOutputs: ["assets", "threats", "mitigations", "validationQuestions"],
  },
});
