function requiredString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function createDeploymentPlan({
  releaseScope,
  targetEnvironment,
  operationalConstraints = [],
}) {
  const release = requiredString(releaseScope, "releaseScope");
  const environment = requiredString(targetEnvironment, "targetEnvironment");
  if (!Array.isArray(operationalConstraints)) {
    throw new Error("operationalConstraints must be an array");
  }
  const constraints = operationalConstraints
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());

  return {
    releaseScope: release,
    targetEnvironment: environment,
    operationalConstraints: constraints,
    deploymentStages: [
      {
        name: "pre-deployment",
        action: `Confirm ${release} dependencies, backups, and change approval for ${environment}.`,
      },
      {
        name: "canary",
        action: "Deploy to a limited production slice and hold for health verification.",
      },
      {
        name: "progressive-rollout",
        action: "Increase traffic in controlled steps while monitoring readiness gates.",
      },
      {
        name: "full-rollout",
        action: "Complete rollout and retain rollback readiness through the observation window.",
      },
    ],
    readinessGates: [
      "Required dependencies and migrations are ready.",
      "Error rate, latency, saturation, and business checks are within thresholds.",
      "Rollback owner, artifact, and recovery procedure are confirmed.",
      ...constraints.map((constraint) => `Operational constraint satisfied: ${constraint}.`),
    ],
    verificationCommands: [
      "ai-engineering doctor",
      "ai-engineering list --json",
    ],
    rollbackProcedure:
      `Trigger rollback when a readiness gate fails, stop traffic expansion, ` +
      `restore the previous ${environment} release, reverse compatible migrations, ` +
      "and verify service and business health before closing the incident.",
  };
}
