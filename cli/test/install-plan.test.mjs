import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildInstallPlan } from "../src/install-plan.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";
import { prepareInstallation } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";

test("builds a deterministic read-only install plan", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "install-plan-"));
  try {
    const context = resolveInstallContext({
      scope: "project",
      projectRoot: target,
      homeRoot: target,
    });
    const before = await readdir(target);
    const prepared = await prepareInstallation({
      root: repoRoot,
      context,
      rootPlugins: ["application"],
      optionalPlugins: ["quality"],
      providers: ["claude"],
    });
    const plan = await buildInstallPlan({ prepared, context });
    const after = await readdir(target);

    assert.deepEqual(plan.rootPlugins, ["application"]);
    assert.deepEqual(plan.requiredPlugins, ["architecture"]);
    assert.deepEqual(plan.optionalPlugins, ["quality"]);
    assert.deepEqual(plan.providers, ["claude"]);
    assert.ok(
      plan.managedFiles.some(
        (item) =>
          item.assetType === "command" &&
          item.assetId === "application.review_backend",
      ),
    );
    assert.deepEqual(after, before);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
