import assert from "node:assert/strict";
import test from "node:test";

import {
  selectValidationEngine,
  loadPlatformConfigDefaults,
  parseResolveArgs,
  resolutionToJson,
  formatResolution,
} from "../src/platform/cli-routing.mjs";
import { repoRoot } from "./helpers.mjs";

test("selectValidationEngine picks platform only when --platform is present", () => {
  assert.equal(selectValidationEngine(["validate", "--platform"]), "platform");
  assert.equal(selectValidationEngine(["validate", "--json"]), "legacy");
  assert.equal(selectValidationEngine(["doctor"]), "legacy");
});

test("loadPlatformConfigDefaults reads platformVersion, providers, and plugins", async () => {
  const defaults = await loadPlatformConfigDefaults(repoRoot);
  assert.equal(defaults.platformVersion, "1.0.0");
  assert.deepEqual([...defaults.providers].sort(), ["antigravity", "claude", "codex", "cursor"]);
  assert.ok(defaults.plugins.includes("platform"));
});

test("parseResolveArgs applies config defaults and flag overrides", () => {
  const defaults = {
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
    plugins: ["platform", "security"],
  };

  const fromDefaults = parseResolveArgs([], defaults);
  assert.deepEqual(fromDefaults.requested, ["platform", "security"]);
  assert.deepEqual(fromDefaults.providers, ["codex", "claude"]);
  assert.equal(fromDefaults.platformVersion, "1.0.0");
  assert.deepEqual(fromDefaults.optional, []);
  assert.equal(fromDefaults.writeLockRequested, false);
  assert.equal(fromDefaults.writeLockPath, undefined);
  assert.equal(fromDefaults.json, false);

  const overridden = parseResolveArgs(
    [
      "platform",
      "--provider",
      "codex",
      "--platform-version",
      "2.0.0",
      "--optional",
      "data",
      "--write-lock",
      "./out.lock",
      "--json",
    ],
    defaults,
  );
  assert.deepEqual(overridden.requested, ["platform"]);
  assert.deepEqual(overridden.providers, ["codex"]);
  assert.equal(overridden.platformVersion, "2.0.0");
  assert.deepEqual(overridden.optional, ["data"]);
  assert.equal(overridden.writeLockRequested, true);
  assert.equal(overridden.writeLockPath, "./out.lock");
  assert.equal(overridden.json, true);
});

test("parseResolveArgs flags --write-lock without a path", () => {
  const defaults = { platformVersion: "1.0.0", providers: [], plugins: [] };
  const parsed = parseResolveArgs(["platform", "--write-lock", "--json"], defaults);
  assert.equal(parsed.writeLockRequested, true);
  assert.equal(parsed.writeLockPath, undefined);
});

test("resolutionToJson drops the plugins Map and stays JSON-safe", () => {
  const resolution = {
    platformVersion: "1.0.0",
    providers: ["codex"],
    plugins: new Map([["platform", { id: "platform" }]]),
    pluginIds: ["platform"],
    graph: [],
    assets: [{ id: "platform.skill" }],
    ownership: { "platform.skill": ["platform"] },
  };
  const json = resolutionToJson(resolution);
  assert.equal(Object.hasOwn(json, "plugins"), false);
  assert.deepEqual(json, {
    platformVersion: "1.0.0",
    providers: ["codex"],
    pluginIds: ["platform"],
    graph: [],
    assets: [{ id: "platform.skill" }],
    ownership: { "platform.skill": ["platform"] },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(json)), json);
});

test("formatResolution summarizes plugins, providers, assets, and edges", () => {
  const text = formatResolution({
    platformVersion: "1.0.0",
    providers: ["codex", "cursor"],
    pluginIds: ["platform", "security"],
    graph: [{ from: "security", to: "platform" }],
    assets: [{ id: "a" }, { id: "b" }],
    ownership: {},
  });
  assert.match(text, /Resolved 2 plugins for 2 providers/);
  assert.match(text, /platform, security/);
  assert.match(text, /Assets: 2; dependency edges: 1/);
});
