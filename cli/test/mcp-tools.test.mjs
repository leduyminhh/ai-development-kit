import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./helpers.mjs";

const CASES = [
  ["platform", "platform.review_docker", { dockerfile: "FROM node:20", deploymentGoal: "production image" }, ["findings", "hardeningActions", "verificationChecks"], "dockerfile"],
  ["platform", "platform.review_kubernetes", { manifest: "kind: Deployment", workloadGoal: "high availability" }, ["findings", "reliabilityActions", "verificationChecks"], "manifest"],
  ["platform", "platform.deployment_plan", { releaseScope: "checkout-api 2.4.0", targetEnvironment: "production" }, ["deploymentStages", "readinessGates", "verificationCommands", "rollbackProcedure"], "releaseScope"],
  ["architecture", "architecture.generate_system_design", { systemGoal: "order platform", qualityAttributes: "availability and consistency" }, ["components", "dataFlows", "tradeoffs", "validationQuestions"], "systemGoal"],
  ["architecture", "architecture.review_architecture", { architectureSummary: "modular monolith", reviewFocus: "scalability" }, ["findings", "risks", "recommendations", "decisionQuestions"], "architectureSummary"],
  ["architecture", "architecture.generate_adr", { decisionTitle: "Choose event broker", context: "asynchronous integration", options: "Kafka, RabbitMQ" }, ["status", "decision", "consequences", "alternatives"], "decisionTitle"],
  ["application", "application.review_source_code", { sourceSummary: "checkout service", reviewGoal: "maintainability" }, ["findings", "refactoringActions", "testGaps"], "sourceSummary"],
  ["application", "application.generate_service", { serviceGoal: "checkout confirmation", technicalContext: "Node.js API and React UI" }, ["components", "implementationSteps", "contracts", "verification"], "serviceGoal"],
  ["application", "application.review_api", { apiContract: "GET /orders/{id}", reviewGoal: "compatibility" }, ["findings", "compatibilityRisks", "recommendations", "tests"], "apiContract"],
  ["data", "data.analyze_schema", { schemaSummary: "orders and order_items", workloadProfile: "read-heavy reporting" }, ["findings", "normalizationNotes", "queryRisks", "recommendations"], "schemaSummary"],
  ["data", "data.review_index", { tableAndQueries: "orders by tenant and created_at", performanceGoal: "p95 below 50ms" }, ["findings", "candidateIndexes", "tradeoffs", "verificationQueries"], "tableAndQueries"],
  ["data", "data.migration_plan", { sourceContract: "customer_v1", targetContract: "customer_v2" }, ["stages", "dataChecks", "rollbackPlan", "cutoverGates"], "sourceContract"],
  ["knowledge", "knowledge.generate_readme", { projectSummary: "MCP engineering toolkit", audience: "platform engineers" }, ["sections", "setupChecklist", "usageExamples", "maintenanceNotes"], "projectSummary"],
  ["knowledge", "knowledge.generate_runbook", { serviceSummary: "checkout API", operationalScenario: "latency spike" }, ["signals", "diagnosticSteps", "mitigations", "escalationCriteria"], "serviceSummary"],
  ["knowledge", "knowledge.review_docs", { documentSummary: "deployment guide", reviewGoal: "operator clarity" }, ["findings", "missingSections", "clarityActions", "verification"], "documentSummary"],
  ["quality", "quality.generate_test_plan", { scope: "checkout release", riskProfile: "payment regression" }, ["testLevels", "scenarios", "fixtures", "exitCriteria"], "scope"],
  ["quality", "quality.review_coverage", { coverageSummary: "72% line coverage", criticalFlows: "checkout and refund" }, ["gaps", "priorityTests", "falseConfidenceRisks", "targets"], "coverageSummary"],
  ["quality", "quality.performance_review", { systemProfile: "Node.js API at 500 rps", performanceGoal: "p95 below 100ms" }, ["bottlenecks", "experiments", "metrics", "acceptanceCriteria"], "systemProfile"],
  ["security", "security.scan_source", { sourceSummary: "JWT authenticated REST API", threatContext: "internet-facing" }, ["findings", "severitySummary", "remediations", "verification"], "sourceSummary"],
  ["security", "security.scan_dependencies", { dependencyManifest: "package-lock with Express", runtimeContext: "production container" }, ["findings", "upgradeActions", "supplyChainChecks", "verification"], "dependencyManifest"],
  ["security", "security.generate_threat_model", { systemSummary: "multi-tenant payments", trustBoundaries: "browser, API, database" }, ["assets", "threats", "mitigations", "validationQuestions"], "systemSummary"],
];

function runMcp(server, requests) {
  const entrypoint = path.join(
    repoRoot,
    "mcp-servers",
    server,
    "src",
    "index.js",
  );
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entrypoint], {
      cwd: repoRoot,
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
        reject(new Error(`${server} MCP exited ${exitCode}: ${stderr}`));
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

test("all released MCP tools use structured contracts", async () => {
  for (const server of [...new Set(CASES.map(([name]) => name))]) {
    const contract = JSON.parse(
      await readFile(
        path.join(repoRoot, "mcp-servers", server, "mcp.json"),
        "utf8",
      ),
    );
    for (const tool of contract.tools) {
      assert.equal(typeof tool, "object", `${tool} must be structured`);
      assert.equal(typeof tool.name, "string");
      assert.equal(typeof tool.description, "string");
      assert.equal(typeof tool.inputSchema, "object");
      assert.equal(typeof tool.outputSchema, "object");
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.destructiveHint, false);
    }
  }
});

test("all released MCP tools execute valid input and reject missing fields", async () => {
  for (const server of [...new Set(CASES.map(([name]) => name))]) {
    const serverCases = CASES.filter(([name]) => name === server);
    const requests = [];
    for (const [, tool, valid, , missingField] of serverCases) {
      requests.push({
        jsonrpc: "2.0",
        id: requests.length + 1,
        method: "tools/call",
        params: { name: tool, arguments: valid },
      });
      const invalid = { ...valid };
      delete invalid[missingField];
      requests.push({
        jsonrpc: "2.0",
        id: requests.length + 1,
        method: "tools/call",
        params: { name: tool, arguments: invalid },
      });
    }

    const responses = await runMcp(server, requests);
    for (let index = 0; index < serverCases.length; index += 1) {
      const [, tool, , outputKeys, missingField] = serverCases[index];
      const validResponse = responses[index * 2].result;
      const invalidResponse = responses[index * 2 + 1].result;
      assert.equal(validResponse.isError, false, `${tool} should execute`);
      for (const key of outputKeys) {
        assert.ok(
          Object.hasOwn(validResponse.structuredContent, key),
          `${tool} must return ${key}`,
        );
      }
      assert.equal(invalidResponse.isError, true);
      assert.match(invalidResponse.content[0].text, new RegExp(missingField));
    }
  }
});
