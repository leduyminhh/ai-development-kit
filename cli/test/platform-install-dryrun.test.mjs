import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { prepareInstallation } from "../src/lifecycle.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";
import { platformProjector } from "../src/platform/install/platform-projector.mjs";
import { repoRoot } from "./helpers.mjs";

function prepareWith(project, target) {
  const context = resolveInstallContext({
    scope: "project",
    projectRoot: target,
    homeRoot: os.homedir(),
  });
  return prepareInstallation({
    root: repoRoot,
    context,
    rootPlugins: ["platform"],
    optionalPlugins: [],
    providers: ["codex"],
    force: false,
    ...(project ? { project } : {}),
  });
}

const sortEntries = (map) =>
  [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]));

test("platform projector yields the same desired state as the legacy projector", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-parity-"));
  try {
    const legacy = await prepareWith(undefined, target);
    const platform = await prepareWith(platformProjector, target);
    assert.deepEqual(sortEntries(platform.desiredFiles), sortEntries(legacy.desiredFiles));
    assert.deepEqual(platform.ownership, legacy.ownership);
    assert.deepEqual(platform.providers, legacy.providers);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("preparing the platform desired state writes nothing to the target", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-nomutate-"));
  try {
    await prepareWith(platformProjector, target);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
