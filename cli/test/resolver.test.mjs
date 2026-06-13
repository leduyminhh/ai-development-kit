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

  assert.deepEqual(application.pluginIds, ["architecture", "application"]);
  assert.equal(
    application.skills.filter((id) => id === "code-shared-design").length,
    1,
  );
  assert.equal(application.pluginIds.includes("security"), false);

  const combined = resolvePluginGraph({
    requested: ["security", "application"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
  });
  assert.deepEqual(combined.pluginIds, ["architecture", "application", "security"]);
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
