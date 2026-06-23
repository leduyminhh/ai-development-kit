import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPlugin } from "../src/builder.mjs";
import { preparePluginDistribution } from "../src/distribution.mjs";
import { extractPluginArchive } from "../src/archive.mjs";
import { repoRoot } from "./helpers.mjs";

test("prepares equivalent npm and GitHub release plugin artifacts", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-distribution-"));
  try {
    const artifact = await buildPlugin({
      root: repoRoot,
      pluginId: "application",
      outputRoot: path.join(temp, "plugins"),
    });
    const distribution = await preparePluginDistribution({
      pluginId: "application",
      version: "1.0.0",
      artifactRoot: artifact.path,
      npmRoot: path.join(temp, "npm"),
      releaseRoot: path.join(temp, "releases"),
    });
    const npmPackage = JSON.parse(
      await readFile(path.join(distribution.npmPackageRoot, "package.json"), "utf8"),
    );
    assert.equal(npmPackage.name, "@ai-engineering-platform/plugin-application");
    assert.equal(npmPackage.aiEngineering.artifact, "./artifact/plugin.json");

    const extracted = path.join(temp, "github-expanded");
    await extractPluginArchive({ archive: distribution.githubArchive, destination: extracted });
    for (const relative of ["plugin.json", "manifest.lock", "checksums.json"]) {
      assert.equal(
        await readFile(path.join(distribution.npmPackageRoot, "artifact", relative), "utf8"),
        await readFile(path.join(extracted, relative), "utf8"),
      );
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("documents AI Engineering wizard commands in both readmes", async () => {
  const sharedExpected = [
    "aie init",
    "aie install",
    "aie doctor",
    "Install all plugins",
    ".ai-engineering/install/session.json",
    "aie install application --target codex --yes",
    "aie install --all --target codex --yes",
    "aie install --all --target codex -g",
    "aie remove --all --yes",
    "aie upgrade --all --yes",
    "aie update platform security --yes",
    "aie -h",
    ".agents/skills",
    ".codex/agents",
    ".codex/workflows/commands.md",
    ".codex/AGENTS.md",
    ".claude/skills",
    ".claude/commands",
    ".claude/CLAUDE.md",
    "CLAUDE.md",
    ".cursor/rules",
    "npm install",
    "npm run build",
  ];
  const languageExpected = {
    "README.md": ["Interactive CLI Flow", "Step 4: Upgrade"],
    "README_VI.md": ["Flow CLI Tương Tác", "Step 4: Upgrade"],
  };
  for (const file of ["README.md", "README_VI.md"]) {
    const content = await readFile(path.join(repoRoot, file), "utf8");
    for (const text of [...sharedExpected, ...languageExpected[file]]) {
      assert.ok(content.includes(text), file + " is missing " + text);
    }
  }
});

test("keeps Vietnamese documentation readable as UTF-8", async () => {
  const files = [
    "README_VI.md",
    "cli/README_VI.md",
    "core/README_VI.md",
    "docs/README_VI.md",
    "providers/README_VI.md",
    "plugins/README_VI.md",
    "core/standards/output-format-standard.md",
    "core/standards/skill-authoring-standard.md",
  ];
  const mojibake = /Ãƒ|Ã„|Ã¡Â»|Ã¡Âº|Ã‚|Ã†|Ã…/;
  const vietnameseDiacritic =
    /[Ã Ã¡áº¡áº£Ã£Ã¢áº§áº¥áº­áº©áº«Äƒáº±áº¯áº·áº³áºµÃ¨Ã©áº¹áº»áº½Ãªá»áº¿á»‡á»ƒá»…Ã¬Ã­á»‹á»‰Ä©Ã²Ã³á»á»ÃµÃ´á»“á»‘á»™á»•á»—Æ¡á»á»›á»£á»Ÿá»¡Ã¹Ãºá»¥á»§Å©Æ°á»«á»©á»±á»­á»¯á»³Ã½á»µá»·á»¹Ä‘]/i;

  for (const file of files) {
    const content = await readFile(path.join(repoRoot, file), "utf8");
    assert.doesNotMatch(content, mojibake, file);
    assert.match(content, vietnameseDiacritic, file);
  }
});

test("documents concise install notes and canonical command contracts", async () => {
  const expected = [
    "aie install application --target codex --yes",
    "aie install application --with quality",
    "command-registry.yaml",
    "schema version 2",
  ];
  for (const file of [
    "README.md",
    "README_VI.md",
    "cli/README.md",
    "cli/README_VI.md",
  ]) {
    const content = await readFile(path.join(repoRoot, file), "utf8");
    for (const text of expected) {
      assert.ok(content.includes(text), `${file} is missing ${text}`);
    }
    assert.equal(
      /## Hybrid Install|## CÃ i Äáº·t Káº¿t Há»£p|## Há»£p Äá»“ng CÃ i Äáº·t Káº¿t Há»£p/.test(content),
      false,
      `${file} should not have a standalone hybrid install section`,
    );
  }
});

test("exposes package-name and canonical CLI aliases", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const cliPackageJson = JSON.parse(
    await readFile(path.join(repoRoot, "cli", "package.json"), "utf8"),
  );
  const packageLock = JSON.parse(
    await readFile(path.join(repoRoot, "package-lock.json"), "utf8"),
  );

  assert.equal(
    packageJson.bin["ai-engineering-platform"],
    "./cli/dist/index.js",
  );
  assert.equal(
    packageJson.bin["ai-engineering"],
    "./cli/dist/index.js",
  );
  assert.equal(packageJson.bin.aie, "./cli/dist/index.js");
  assert.equal(cliPackageJson.bin.aie, "./dist/index.js");
  assert.equal(packageLock.packages[""].bin.aie, "cli/dist/index.js");
  assert.equal(packageLock.packages.cli.bin.aie, "dist/index.js");
});

