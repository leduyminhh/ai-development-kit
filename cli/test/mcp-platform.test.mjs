import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { installPlugins } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";

function runMcp(entrypoint, requests, cwd = repoRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entrypoint], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`platform MCP exited ${exitCode}: ${stderr}`));
        return;
      }
      resolve(
        stdout
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line)),
      );
    });
    for (const request of requests) {
      child.stdin.write(`${JSON.stringify(request)}\n`);
    }
    child.stdin.end();
  });
}

function runPlatformMcp(requests) {
  return runMcp(
    path.join(repoRoot, "mcp-servers", "platform", "src", "index.js"),
    requests,
  );
}

test("platform MCP exposes and executes deployment planning", async () => {
  const responses = await runPlatformMcp([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "platform.deployment_plan",
        arguments: {
          releaseScope: "checkout-api 2.4.0",
          targetEnvironment: "production",
          operationalConstraints: ["zero downtime", "database migration"],
        },
      },
    },
  ]);

  const deploymentTool = responses[0].result.tools.find(
    (tool) => tool.name === "platform.deployment_plan",
  );
  assert.deepEqual(deploymentTool.inputSchema.required, [
    "releaseScope",
    "targetEnvironment",
  ]);
  assert.equal(deploymentTool.annotations.destructiveHint, false);

  const result = responses[1].result;
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.targetEnvironment, "production");
  assert.equal(result.structuredContent.deploymentStages.length, 4);
  assert.equal(result.structuredContent.readinessGates.length > 0, true);
  assert.equal(result.structuredContent.verificationCommands.length > 0, true);
  assert.match(result.structuredContent.rollbackProcedure, /rollback/i);
});

test("platform MCP validates handler input for every released tool", async () => {
  const responses = await runPlatformMcp([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "platform.deployment_plan",
        arguments: { targetEnvironment: "production" },
      },
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "platform.review_docker",
        arguments: {},
      },
    },
  ]);

  assert.equal(responses[0].result.isError, true);
  assert.match(responses[0].result.content[0].text, /releaseScope is required/);
  assert.equal(responses[1].result.isError, true);
  assert.match(responses[1].result.content[0].text, /dockerfile is required/);
});

test("installed platform MCP executes through the target-local runtime", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "platform-mcp-install-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["cursor"],
    });
    const entrypoint = path.join(
      target,
      ".ai-engineering",
      "mcp-servers",
      "platform",
      "src",
      "index.js",
    );
    const [response] = await runMcp(
      entrypoint,
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "platform.deployment_plan",
            arguments: {
              releaseScope: "payments 1.5.0",
              targetEnvironment: "staging",
            },
          },
        },
      ],
      target,
    );

    assert.equal(response.result.isError, false);
    assert.equal(response.result.structuredContent.targetEnvironment, "staging");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
