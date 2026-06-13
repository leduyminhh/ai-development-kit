import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveInstallContext } from "../src/install-scope.mjs";

test("defaults to project scope", () => {
  const projectRoot = path.resolve("test-project");
  const homeRoot = path.resolve("test-home");
  const result = resolveInstallContext({ projectRoot, homeRoot });

  assert.equal(result.scope, "project");
  assert.equal(result.targetRoot, projectRoot);
  assert.equal(result.stateRoot, path.join(projectRoot, ".ai-engineering"));
  assert.equal(result.projectAssets, true);
});

test("resolves global runtime below user home", () => {
  const projectRoot = path.resolve("test-project");
  const homeRoot = path.resolve("test-home");
  const result = resolveInstallContext({
    scope: "global",
    projectRoot,
    homeRoot,
  });

  assert.equal(result.scope, "global");
  assert.equal(result.targetRoot, homeRoot);
  assert.equal(result.stateRoot, path.join(homeRoot, ".ai-engineering"));
  assert.equal(result.projectAssets, false);
});

test("rejects unsupported scope", () => {
  assert.throws(
    () =>
      resolveInstallContext({
        scope: "team",
        projectRoot: ".",
        homeRoot: ".",
      }),
    /scope must be project or global/,
  );
});
