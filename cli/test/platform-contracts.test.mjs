import assert from "node:assert/strict";
import test from "node:test";

import {
  createAssetDescriptors,
  normalizeAssetList,
  normalizeAssets,
} from "../src/platform/contracts/asset.mjs";
import { validateAdapterContract } from "../src/platform/contracts/adapter.mjs";
import { validateBuildArtifactManifest } from "../src/platform/contracts/artifact.mjs";
import { validatePlatformLockfile } from "../src/platform/contracts/lockfile.mjs";
import { normalizePluginManifest } from "../src/platform/contracts/plugin.mjs";
import { validatePlatformContracts } from "../src/platform/validation/validate-platform-contracts.mjs";
import { repoRoot } from "./helpers.mjs";
import {
  assertCondition,
  PlatformContractError,
  PLATFORM_ERROR_CODES,
} from "../src/platform/errors/platform-error.mjs";

test("platform contract errors include stable code and details", () => {
  assert.throws(
    () =>
      assertCondition(false, "broken contract", {
        code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
        details: ["metadata.id is required"],
      }),
    (error) => {
      assert.equal(error instanceof PlatformContractError, true);
      assert.equal(error.code, "PLATFORM_INVALID_CONTRACT");
      assert.deepEqual(error.details, ["metadata.id is required"]);
      return true;
    },
  );
});

test("asset lists normalize none and sort deterministic arrays", () => {
  assert.deepEqual(normalizeAssetList("none"), []);
  assert.deepEqual(normalizeAssetList(["z", "a"]), ["a", "z"]);
});

test("assets normalize every platform asset bucket", () => {
  const assets = normalizeAssets({
    skills: ["java-implement"],
    commands: "none",
    workflows: ["workflows/feature.yaml"],
  });

  assert.deepEqual(assets.skills, ["java-implement"]);
  assert.deepEqual(assets.commands, []);
  assert.deepEqual(assets.prompts, []);
  assert.deepEqual(assets.workflows, ["workflows/feature.yaml"]);
});

test("asset descriptors include plugin id, type, path, and deterministic id", () => {
  const descriptors = createAssetDescriptors({
    pluginId: "application",
    assets: {
      skills: ["react-implement"],
      commands: ["commands/plan-feature.md"],
    },
  });

  assert.deepEqual(descriptors, [
    {
      id: "application:commands:commands/plan-feature.md",
      pluginId: "application",
      type: "commands",
      path: "commands/plan-feature.md",
    },
    {
      id: "application:skills:react-implement",
      pluginId: "application",
      type: "skills",
      path: "react-implement",
    },
  ]);
});

const APPLICATION_MANIFEST = {
  apiVersion: "ai-engineering.dev/v1alpha1",
  kind: "AiIdePlugin",
  metadata: {
    id: "application",
    name: "Application Engineering",
    version: "1.0.0",
    description: "Application workflows.",
  },
  compatibility: {
    platform: ">=1.0.0 <2.0.0",
    providers: {
      cursor: "supported",
      codex: "supported",
    },
  },
  dependencies: {
    required: ["quality"],
    optional: ["security"],
  },
  depends_on: {
    plugins: ["architecture"],
  },
  assets: {
    skills: ["react-implement"],
    commands: ["commands/plan-feature.md"],
    rules: "none",
  },
  install: {
    defaultScope: "project",
    supportsCopy: true,
    supportsLink: true,
  },
  category: "ai-ide-plugin",
  displayName: "Application Engineering",
  developerName: "AI Engineering Platform",
};

test("plugin manifests normalize legacy AiIdePlugin shape into platform plugin contract", () => {
  const plugin = normalizePluginManifest(APPLICATION_MANIFEST);

  assert.equal(plugin.kind, "PlatformPlugin");
  assert.equal(plugin.sourceKind, "AiIdePlugin");
  assert.equal(plugin.id, "application");
  assert.deepEqual(plugin.dependencies.required, ["architecture", "quality"]);
  assert.deepEqual(plugin.dependencies.optional, ["security"]);
  assert.deepEqual(Object.keys(plugin.compatibility.providers), ["codex", "cursor"]);
  assert.deepEqual(plugin.assets.rules, []);
  assert.deepEqual(plugin.assets.skills, ["react-implement"]);
});

test("plugin manifests reject missing identity fields", () => {
  assert.throws(
    () => normalizePluginManifest({ ...APPLICATION_MANIFEST, metadata: { id: "" } }),
    /plugin metadata.id is required/,
  );
});

test("adapter contract requires validate transform package and publish functions", () => {
  const adapter = {
    id: "codex",
    version: "1.0.0",
    validate() {},
    transform() {},
    package() {},
    publish() {},
  };

  assert.equal(validateAdapterContract(adapter), adapter);
  assert.throws(
    () => validateAdapterContract({ ...adapter, publish: undefined }),
    /adapter codex must implement publish\(\)/,
  );
});

test("platform lockfile contract validates future resolver output shape", () => {
  const lockfile = {
    platformVersion: "1.0.0",
    plugins: [],
    assets: [],
    adapters: [],
    graph: [],
  };

  assert.equal(validatePlatformLockfile(lockfile), lockfile);
  assert.throws(
    () => validatePlatformLockfile({ ...lockfile, graph: undefined }),
    /lockfile graph must be an array/,
  );
});

test("build artifact contract validates future package output shape", () => {
  const artifact = {
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "PlatformBuildArtifact",
    id: "application",
    version: "1.0.0",
    platformVersion: "1.0.0",
    plugins: [],
    files: [],
    checksums: { algorithm: "sha256", files: {} },
  };

  assert.equal(validateBuildArtifactManifest(artifact), artifact);
  assert.throws(
    () => validateBuildArtifactManifest({ ...artifact, kind: "PluginArtifact" }),
    /artifact kind must be PlatformBuildArtifact/,
  );
});


test("build artifact contract validates checksum metadata", () => {
  const artifact = validateBuildArtifactManifest({
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "PlatformBuildArtifact",
    id: "platform",
    version: "1.0.0",
    platformVersion: "1.0.0",
    plugins: [{ id: "platform", version: "1.0.0" }],
    files: [{ path: "artifact.json", sha256: "a".repeat(64) }],
    checksums: { algorithm: "sha256", files: { "artifact.json": "a".repeat(64) } },
  });

  assert.equal(artifact.checksums.algorithm, "sha256");
  assert.throws(
    () => validateBuildArtifactManifest({ apiVersion: "ai-engineering.dev/v1alpha1", kind: "PlatformBuildArtifact", id: "x", version: "1", platformVersion: "1.0.0", plugins: [], files: [], checksums: { algorithm: "md5", files: {} } }),
    /artifact checksums algorithm must be sha256/,
  );
});
test("repository plugin manifests pass platform contract normalization", async () => {
  const result = await validatePlatformContracts({ root: repoRoot });

  assert.equal(result.status, "pass");
  assert.equal(result.pluginIds.includes("application"), true);
  assert.equal(result.pluginIds.includes("platform"), true);
  assert.equal(result.pluginCount > 0, true);
  assert.equal(result.assetCount > 0, true);
});


