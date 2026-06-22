import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function withProject(prefix, callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("recommends application and quality for React package projects", async () => {
  await withProject("aie-install-react-", async (root) => {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { react: "^19.0.0", vite: "^6.0.0" } }),
    );

    const { detectInstallRecommendations } = await import("../src/install-detection.mjs");
    const result = await detectInstallRecommendations({ projectRoot: root });

    assert.deepEqual(result.plugins.map((item) => item.pluginId), [
      "application",
      "platform",
      "quality",
    ]);
    assert.ok(result.plugins.find((item) => item.pluginId === "application").reasons.some((reason) => reason.includes("react")));
  });
});

test("recommends architecture and quality for Java backend projects", async () => {
  await withProject("aie-install-java-", async (root) => {
    await writeFile(path.join(root, "pom.xml"), "<project><dependencies><dependency>spring-boot</dependency></dependencies></project>");

    const { detectInstallRecommendations } = await import("../src/install-detection.mjs");
    const result = await detectInstallRecommendations({ projectRoot: root });

    assert.deepEqual(result.plugins.map((item) => item.pluginId), [
      "architecture",
      "platform",
      "quality",
    ]);
  });
});

test("recommends security when lockfiles or CI are present", async () => {
  await withProject("aie-install-security-", async (root) => {
    await writeFile(path.join(root, "package-lock.json"), "{}\n");
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, ".github", "workflows", "ci.yml"), "name: ci\n");

    const { detectInstallRecommendations } = await import("../src/install-detection.mjs");
    const result = await detectInstallRecommendations({ projectRoot: root });

    assert.ok(result.plugins.some((item) => item.pluginId === "security"));
    assert.ok(result.plugins.some((item) => item.pluginId === "quality"));
  });
});
