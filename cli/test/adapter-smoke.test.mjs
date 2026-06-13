import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as TOML from "@iarna/toml";

import { doctorProject } from "../src/doctor.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";
import { installPlugins, removePlugins } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";

async function seedUserConfig(root, scope, provider) {
  if (provider === "codex") {
    const relative = ".codex/config.toml";
    const pathname = path.join(root, relative);
    await mkdir(path.dirname(pathname), { recursive: true });
    await writeFile(pathname, 'model = "user-model"\n');
    return { pathname, parse: (text) => TOML.parse(text), marker: "model" };
  }
  const relative =
    provider === "claude"
      ? scope === "global"
        ? ".claude.json"
        : ".mcp.json"
      : ".cursor/mcp.json";
  const pathname = path.join(root, relative);
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, '{"userSetting":"keep"}\n');
  return { pathname, parse: JSON.parse, marker: "userSetting" };
}

test("all provider and scope combinations install, diagnose, and uninstall", async (t) => {
  for (const scope of ["project", "global"]) {
    for (const provider of ["codex", "claude", "cursor"]) {
      await t.test(`${scope}/${provider}`, async () => {
        const project = await mkdtemp(
          path.join(os.tmpdir(), "ai-engineering-adapter-project-"),
        );
        const home = await mkdtemp(
          path.join(os.tmpdir(), "ai-engineering-adapter-home-"),
        );
        try {
          const context = resolveInstallContext({
            scope,
            projectRoot: project,
            homeRoot: home,
          });
          const userConfig = await seedUserConfig(
            context.targetRoot,
            scope,
            provider,
          );
          await installPlugins({
            root: repoRoot,
            target: context.targetRoot,
            context,
            all: true,
            providers: [provider],
          });

          const result = await doctorProject({
            target: context.targetRoot,
            context,
          });
          assert.equal(result.status, "pass");
          assert.equal(result.mcpServers.length, 7);
          assert.equal(
            result.mcpServers.every((server) => server.toolCount === 3),
            true,
          );

          await removePlugins({
            root: repoRoot,
            target: context.targetRoot,
            context,
            all: true,
          });
          const userValue = userConfig.parse(
            await readFile(userConfig.pathname, "utf8"),
          );
          assert.ok(userValue[userConfig.marker]);
        } finally {
          await rm(project, { recursive: true, force: true });
          await rm(home, { recursive: true, force: true });
        }
      });
    }
  }
});
