import { createHash } from "node:crypto";

import {
  validateProjectionInput,
  validateProjectionPlan,
} from "../../projection-contracts.mjs";
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

function sha256Text(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function createWrapperAdapter({ id, version, projector }) {
  assertCondition(typeof id === "string" && id.length > 0, "adapter id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof version === "string" && version.length > 0, "adapter version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof projector === "function", `adapter ${id} requires a projector function`, {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });

  function validate(context) {
    const input = context?.input;
    validateProjectionInput(input);
    assertCondition(input.provider === id, `adapter ${id} cannot project provider ${input.provider}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
    return input;
  }

  function transform(context) {
    const input = validate(context);
    return validateProjectionPlan(projector(input));
  }

  function packageArtifact(context) {
    const plan = transform(context);
    const files = plan.assets.map((asset) =>
      asset.operation === "render"
        ? {
            path: asset.destinationPath,
            operation: "render",
            content: asset.content,
            sha256: sha256Text(asset.content),
          }
        : {
            path: asset.destinationPath,
            operation: "copy",
            sourcePath: asset.sourcePath,
          },
    );
    return { id, version, provider: id, scope: plan.scope, files, plan };
  }

  function publish(context) {
    const plan = transform(context);
    const files = plan.assets.map((asset) =>
      asset.operation === "render"
        ? { path: asset.destinationPath, content: asset.content }
        : { path: asset.destinationPath, sourcePath: asset.sourcePath },
    );
    return { provider: id, scope: plan.scope, files };
  }

  return { id, version, validate, transform, package: packageArtifact, publish };
}
