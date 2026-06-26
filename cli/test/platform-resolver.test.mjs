import assert from "node:assert/strict";
import test from "node:test";

import { discoverPlugins } from "../src/platform/discovery/discover-plugins.mjs";
import { resolveDependencyGraph } from "../src/platform/resolver/dependency-graph.mjs";
import { resolveAssets } from "../src/platform/resolver/resolve-assets.mjs";
import { generatePlatformLockfile } from "../src/platform/lockfile/generate-lockfile.mjs";
import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";
import {
  assertPluginCompatibility,
  isPlatformCompatible,
} from "../src/platform/resolver/compatibility.mjs";
import { repoRoot } from "./helpers.mjs";

test("discovers normalized plugins in deterministic order", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const pluginIds = [...plugins.keys()];

  assert.deepEqual(pluginIds, [...pluginIds].sort());
  assert.equal(plugins.has("application"), true);
  assert.equal(plugins.has("platform"), true);
  assert.equal(plugins.get("application").kind, "PlatformPlugin");
  assert.equal(plugins.get("application").manifestPath.endsWith("plugin.yaml"), true);
});

test("checks platform semver major range compatibility", () => {
  assert.equal(isPlatformCompatible(">=1.0.0 <2.0.0", "1.1.1"), true);
  assert.equal(isPlatformCompatible(">=1.0.0 <2.0.0", "2.0.0"), false);
});

test("rejects unsupported providers", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const application = plugins.get("application");

  assert.throws(
    () =>
      assertPluginCompatibility({
        plugin: application,
        platformVersion: "1.0.0",
        providers: ["unknown-provider"],
      }),
    /does not support provider unknown-provider/,
  );
});

test("resolves required dependencies before requested plugins", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const graph = resolveDependencyGraph({
    requested: ["application"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  assert.deepEqual(graph.pluginIds, [
    "architecture",
    "data",
    "quality",
    "security",
    "application",
  ]);
  assert.equal(graph.edges.some((edge) => edge.from === "application" && edge.to === "quality"), true);
});

test("rejects unknown plugins and dependency cycles", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  assert.throws(
    () =>
      resolveDependencyGraph({
        requested: ["missing"],
        plugins,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /unknown plugin missing/,
  );

  const cyclic = new Map([
    ["a", { id: "a", compatibility: { platform: ">=1.0.0 <2.0.0", providers: { codex: "supported" } }, dependencies: { required: ["b"] } }],
    ["b", { id: "b", compatibility: { platform: ">=1.0.0 <2.0.0", providers: { codex: "supported" } }, dependencies: { required: ["a"] } }],
  ]);
  assert.throws(
    () =>
      resolveDependencyGraph({
        requested: ["a"],
        plugins: cyclic,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /dependency cycle detected at a/,
  );
});
test("resolves deterministic asset descriptors for selected plugins", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const graph = resolveDependencyGraph({
    requested: ["platform"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex"],
  });
  const result = resolveAssets({ pluginIds: graph.pluginIds, plugins });
  const ids = result.assets.map((asset) => asset.id);

  assert.deepEqual(ids, [...ids].sort());
  assert.equal(ids.some((id) => id.includes("platform:skills:incident-response")), true);
  assert.deepEqual(result.ownership["platform:skills:incident-response"], ["platform"]);
});

test("resolves platform selection and generates deterministic lockfile", async () => {
  const resolution = await resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex", "cursor"],
  });
  const lockfile = generatePlatformLockfile(resolution);

  assert.deepEqual(lockfile.plugins.map((plugin) => plugin.id), ["platform"]);
  assert.deepEqual(lockfile.adapters.map((adapter) => adapter.id), ["codex", "cursor"]);
  assert.deepEqual(lockfile.assets.map((asset) => asset.id), [...lockfile.assets.map((asset) => asset.id)].sort());
  assert.deepEqual(lockfile, generatePlatformLockfile(resolution));
});

