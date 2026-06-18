import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { repoRoot } from "./helpers.mjs";

const detectorPath = path.join(
  repoRoot,
  "plugins",
  "application",
  "skills",
  "feature-implement",
  "scripts",
  "detect-feature-stack.mjs",
);
const schemaPath = path.join(
  repoRoot,
  "plugins",
  "application",
  "schemas",
  "feature-context.schema.json",
);

async function loadDetector() {
  return import(pathToFileURL(detectorPath));
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
      [
        "<dependencies>",
        "  <dependency>",
        "    <groupId>org.springframework.boot</groupId>",
        "    <artifactId>spring-boot-starter-web</artifactId>",
        "  </dependency>",
        "</dependencies>",
      ].join("\n"),
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

test("ignores framework names outside dependency declarations", async () => {
  await withFixture(async (root) => {
    await writeFixture(
      root,
      "web-noise/package.json",
      JSON.stringify({
        description: "React migration notes",
        scripts: { react: "echo react" },
      }),
    );
    await writeFixture(
      root,
      "python-noise/pyproject.toml",
      [
        "[project]",
        'name = "django-helper"',
        'dependencies = ["pydantic>=2"]',
        "# fastapi is under evaluation",
      ].join("\n"),
    );
    await writeFixture(
      root,
      "gradle-noise/build.gradle",
      'description = "spring migration helper"\n',
    );
    await writeFixture(
      root,
      "maven-noise/pom.xml",
      "<description>spring migration helper</description>",
    );

    const { detectFeatureStacks } = await loadDetector();

    assert.deepEqual(await detectFeatureStacks(root), [
      { module: "python-noise", stack: "python-ambiguous" },
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
  assert.equal(schema.properties.acceptanceCriteria.minItems, 1);
  assert.equal(schema.properties.sourceScopes.minItems, 1);
  assert.equal(schema.properties.stackSignals.items.additionalProperties, false);
  assert.deepEqual(schema.properties.stackSignals.items.properties.stack.enum, [
    "java-spring",
    "fastapi",
    "django-drf",
    "python-ambiguous",
    "react",
  ]);

  for (const property of [
    "uiStates",
    "apiOperations",
    "dataChanges",
    "securityRequirements",
    "testMatrix",
  ]) {
    assert.equal(schema.properties[property].type, "array");
    assert.equal(schema.properties[property].items.type, "string");
  }
});
