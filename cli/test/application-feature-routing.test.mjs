import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./helpers.mjs";

const detectorPath = path.join(
  repoRoot,
  "packs",
  "application",
  "skills",
  "feature-implement",
  "scripts",
  "detect-feature-stack.mjs",
);
const schemaPath = path.join(
  repoRoot,
  "packs",
  "application",
  "schemas",
  "feature-context.schema.json",
);

async function loadDetector() {
  return import(new URL(`file://${detectorPath.replaceAll("\\", "/")}`));
}

async function writeFixture(root, relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "application-feature-routing-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("detects supported stacks in a monorepo and sorts the result", async () => {
  await withFixture(async (root) => {
    await writeFixture(
      root,
      "django-service/requirements.txt",
      "Django==5.2\ndjangorestframework==3.16\n",
    );
    await writeFixture(
      root,
      "fastapi-service/pyproject.toml",
      '[project]\ndependencies = ["fastapi>=0.115", "pydantic>=2"]\n',
    );
    await writeFixture(
      root,
      "java-service/pom.xml",
      "<dependencies><dependency>org.springframework.boot</dependency></dependencies>",
    );
    await writeFixture(
      root,
      "web/package.json",
      JSON.stringify({ dependencies: { react: "^19.0.0" } }),
    );

    const { detectFeatureStacks } = await loadDetector();

    assert.deepEqual(await detectFeatureStacks(root), [
      { module: "django-service", stack: "django-drf" },
      { module: "fastapi-service", stack: "fastapi" },
      { module: "java-service", stack: "java-spring" },
      { module: "web", stack: "react" },
    ]);
  });
});

test("reports ambiguous Python when only Pydantic is present", async () => {
  await withFixture(async (root) => {
    await writeFixture(
      root,
      "api/pyproject.toml",
      '[project]\ndependencies = ["pydantic>=2"]\n',
    );

    const { detectFeatureStacks } = await loadDetector();

    assert.deepEqual(await detectFeatureStacks(root), [
      { module: "api", stack: "python-ambiguous" },
    ]);
  });
});

test("defines the required feature context fields and strict stack signals", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));

  assert.deepEqual(schema.required, [
    "featureGoal",
    "acceptanceCriteria",
    "sourceScopes",
    "stackSignals",
    "artifacts",
    "verification",
    "residualRisks",
  ]);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.stackSignals.items.additionalProperties, false);
  assert.deepEqual(schema.properties.stackSignals.items.properties.stack.enum, [
    "java-spring",
    "fastapi",
    "django-drf",
    "python-ambiguous",
    "react",
  ]);
});
