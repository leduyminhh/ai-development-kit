import path from "node:path";

import { PlatformError } from "./errors.mjs";

export function resolveInstallContext({
  scope = "project",
  projectRoot,
  homeRoot,
}) {
  if (!["project", "global"].includes(scope)) {
    throw new PlatformError("scope must be project or global", {
      code: "AI_ENGINEERING_INVALID_SCOPE",
      exitCode: 2,
    });
  }

  const targetRoot = path.resolve(scope === "global" ? homeRoot : projectRoot);
  return {
    scope,
    targetRoot,
    stateRoot: path.join(targetRoot, ".ai-engineering"),
    projectAssets: scope === "project",
  };
}
