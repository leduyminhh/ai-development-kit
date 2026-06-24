import assert from "node:assert/strict";
import test from "node:test";

import { loadPlugins } from "../src/contracts.mjs";
import { resolvePluginGraph } from "../src/resolver.mjs";
import { repoRoot } from "./helpers.mjs";

test("resolves required dependencies and deduplicates shared assets", async () => {
  const plugins = await loadPlugins(repoRoot);
  const application = resolvePluginGraph({
    requested: ["application"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  assert.deepEqual(application.pluginIds, [
    "architecture",
    "data",
    "quality",
    "security",
    "application",
  ]);
  assert.equal(
    application.skills.filter((id) => id === "code-shared-design").length,
    1,
  );
  // application pulls its required extras but not unrelated plugins.
  assert.equal(application.pluginIds.includes("security"), true);
  assert.equal(application.pluginIds.includes("platform"), false);

  const combined = resolvePluginGraph({
    requested: ["security", "application"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
  });
  assert.deepEqual(combined.pluginIds, [
    "architecture",
    "data",
    "quality",
    "security",
    "application",
  ]);
});

test("separates root required and selected optional plugins", async () => {
  const plugins = await loadPlugins(repoRoot);
  // platform has no required deps and offers quality/security as optional.
  const graph = resolvePluginGraph({
    requested: ["platform"],
    optional: ["security"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
  });

  assert.deepEqual(graph.rootPlugins, ["platform"]);
  assert.deepEqual(graph.requiredPlugins, []);
  assert.deepEqual(graph.optionalPlugins, ["security"]);
  assert.deepEqual(graph.pluginIds, [
    "platform",
    "security",
  ]);
  assert.ok(graph.commands.includes("platform.respond_incident"));
});

test("rejects unknown plugins and required dependency cycles", async () => {
  const plugins = await loadPlugins(repoRoot);
  assert.throws(
    () =>
      resolvePluginGraph({
        requested: ["missing"],
        plugins,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /unknown plugin missing/,
  );

  const cyclic = new Map(plugins);
  cyclic.set("architecture", {
    ...cyclic.get("architecture"),
    dependencies: { required: ["application"], optional: [] },
  });
  assert.throws(
    () =>
      resolvePluginGraph({
        requested: ["application"],
        plugins: cyclic,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /dependency cycle/,
  );
});

test("rejects incompatible platform versions and providers", async () => {
  const plugins = await loadPlugins(repoRoot);
  assert.throws(
    () =>
      resolvePluginGraph({
        requested: ["application"],
        plugins,
        platformVersion: "2.0.0",
        providers: ["codex"],
      }),
    (error) => error.code === "AI_ENGINEERING_INCOMPATIBLE",
  );
  assert.throws(
    () =>
      resolvePluginGraph({
        requested: ["application"],
        plugins,
        platformVersion: "1.0.0",
        providers: ["copilot"],
      }),
    (error) => error.code === "AI_ENGINEERING_INCOMPATIBLE",
  );
});
