import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createWrapperAdapter } from "../src/platform/adapters/adapter-factory.mjs";
import { selectAdapter, ADAPTERS } from "../src/platform/adapters/registry.mjs";
import { validateAdapterContract } from "../src/platform/contracts/adapter.mjs";
import { PLATFORM_ERROR_CODES } from "../src/platform/errors/platform-error.mjs";
import { SUPPORTED_PROVIDERS } from "../src/provider-list.mjs";
import { projectProvider } from "../src/providers.mjs";

function fakeInput(provider = "codex", scope = "project") {
  return {
    schemaVersion: 1,
    provider,
    scope,
    plugins: [{ id: "demo", version: "1.0.0" }],
    skills: [],
    commands: [],
    agents: [],
    hooks: [],
    workflows: [],
  };
}

function fakeProjector(input) {
  return {
    schemaVersion: 1,
    provider: "codex",
    scope: input.scope,
    assets: [
      {
        operation: "render",
        assetType: "command",
        assetId: "demo.cmd",
        destinationPath: ".codex/demo.md",
        content: "hello\n",
        owners: ["demo"],
        shared: false,
      },
      {
        operation: "copy",
        assetType: "skill",
        assetId: "demo.skill",
        sourcePath: "plugins/demo/skills/demo",
        destinationPath: ".agents/skills/demo",
        owners: ["demo"],
        shared: false,
      },
    ],
  };
}

const codexAdapter = createWrapperAdapter({
  id: "codex",
  version: "1.0.0",
  projector: fakeProjector,
});

test("wrapper adapter satisfies the platform adapter contract", () => {
  assert.doesNotThrow(() => validateAdapterContract(codexAdapter));
  assert.equal(codexAdapter.id, "codex");
  assert.equal(codexAdapter.version, "1.0.0");
});

test("validate rejects a provider that does not match the adapter id", () => {
  assert.throws(
    () => codexAdapter.validate({ input: fakeInput("claude") }),
    (error) => error.code === PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  );
});

test("transform returns the validated projection plan", () => {
  const plan = codexAdapter.transform({ input: fakeInput() });
  assert.equal(plan.provider, "codex");
  assert.deepEqual(
    plan.assets.map((asset) => asset.destinationPath),
    [".codex/demo.md", ".agents/skills/demo"],
  );
});

test("package hashes render content and references copy sources", () => {
  const artifact = codexAdapter.package({ input: fakeInput() });
  assert.equal(artifact.provider, "codex");
  assert.equal(artifact.scope, "project");
  assert.deepEqual(artifact.files, [
    {
      path: ".codex/demo.md",
      operation: "render",
      content: "hello\n",
      sha256: createHash("sha256").update("hello\n").digest("hex"),
    },
    {
      path: ".agents/skills/demo",
      operation: "copy",
      sourcePath: "plugins/demo/skills/demo",
    },
  ]);
});

test("publish returns a write-plan with no disk writes and is deterministic", () => {
  const first = codexAdapter.publish({ input: fakeInput() });
  const second = codexAdapter.publish({ input: fakeInput() });
  assert.deepEqual(first, {
    provider: "codex",
    scope: "project",
    files: [
      { path: ".codex/demo.md", content: "hello\n" },
      { path: ".agents/skills/demo", sourcePath: "plugins/demo/skills/demo" },
    ],
  });
  assert.deepEqual(first, second);
});

test("registry exposes a contract-valid adapter for every supported provider", () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), [...SUPPORTED_PROVIDERS].sort());
  for (const provider of SUPPORTED_PROVIDERS) {
    const adapter = selectAdapter(provider);
    assert.doesNotThrow(() => validateAdapterContract(adapter));
    assert.equal(adapter.id, provider);
    assert.equal(adapter.version, "1.0.0");
  }
});

test("selectAdapter throws an INVALID_ADAPTER error for an unknown provider", () => {
  assert.throws(
    () => selectAdapter("unknown"),
    (error) => error.code === PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  );
});

function projectionInput(provider, scope) {
  return {
    schemaVersion: 1,
    provider,
    scope,
    plugins: [{ id: "application", version: "1.0.0" }],
    skills: [
      {
        id: "java-analyze",
        sourcePath: "plugins/application/skills/java-analyze",
        owners: ["application"],
      },
    ],
    commands: [
      {
        id: "application.review_backend",
        pluginId: "application",
        slug: "review-backend",
        description: "Review backend source code.",
        version: "1.0.0",
        intent: "Review backend.",
        inputs: ["source scope"],
        requiredSkills: ["java-analyze"],
        steps: ["Inspect source."],
        outputContract: ["summary"],
        sourcePath: "plugins/application/commands/review-backend.md",
        markdown: "# Review Backend",
        owners: ["application"],
      },
    ],
    agents: [
      {
        id: "java-analyze",
        sourcePath: "adapters/codex/agents/java-analyze.toml",
        owners: ["application"],
      },
    ],
    hooks: [],
    workflows: [],
    mcpServers: {},
  };
}

test("adapter transform output matches the legacy projector for every provider and scope", () => {
  for (const provider of SUPPORTED_PROVIDERS) {
    for (const scope of ["project", "global"]) {
      const adapter = selectAdapter(provider);
      const fromAdapter = adapter.transform({ input: projectionInput(provider, scope) });
      const fromLegacy = projectProvider(projectionInput(provider, scope));
      assert.deepEqual(
        fromAdapter,
        fromLegacy,
        `${provider}/${scope} drifted from legacy projector output`,
      );
    }
  }
});
