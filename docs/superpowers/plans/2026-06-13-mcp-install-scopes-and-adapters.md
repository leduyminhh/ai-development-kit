# MCP Install Scopes And Adapter Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện 21 MCP tool, hỗ trợ cài đặt `project|global`, và kiểm chứng cấu hình native của Codex, Claude, Cursor.

**Architecture:** CLI resolve một install context độc lập với provider, tạo canonical MCP registrations rồi projection sang TOML/JSON native. File config provider được merge theo entry và tham gia transaction rollback; MCP servers dùng shared workflow helper nhưng giữ contract/schema và registration theo capability.

**Tech Stack:** Node.js 20+, ES modules, TypeScript compiler cho CLI, Node test runner, `@iarna/toml`, JSON-RPC stdio.

---

## File Map

**CLI scope và config**

- Create `cli/src/install-scope.mjs`: validate scope và resolve project/home/state/runtime roots.
- Create `cli/src/mcp-config.mjs`: canonical registration, parse/render/merge Codex TOML và Claude/Cursor JSON.
- Modify `cli/src/cli.mjs`: parse `--scope`, truyền scope/home vào lifecycle và doctor.
- Modify `cli/src/lifecycle.mjs`: build desired state theo scope, bỏ `.mcp.json` dùng chung cho mọi provider.
- Modify `cli/src/transaction.mjs`: hỗ trợ merge-managed config drift và rollback.
- Modify `cli/src/state.mjs`: lưu scope và managed MCP registrations trong lock.
- Modify `cli/src/providers.mjs`: nhận canonical registrations và sinh config native.
- Modify `cli/src/doctor.mjs`: validate đúng scope, config và MCP process.
- Modify `cli/package.json`: thêm TOML parser.

**MCP runtime và handlers**

- Create `core/mcp/workflow-tools.js`: validation và output builder dùng chung.
- Modify `core/mcp/stdio-runtime.js`: contract-handler parity khi startup.
- Modify `mcp-servers/*-mcp/mcp.json`: structured definition cho đủ 21 tool.
- Create `mcp-servers/*-mcp/src/tools/handlers.js`: handler theo capability.
- Modify `mcp-servers/*-mcp/src/server.js`: đăng ký đủ handler.

**Tests và docs**

- Create `cli/test/install-scope.test.mjs`.
- Create `cli/test/mcp-config.test.mjs`.
- Create `cli/test/mcp-contracts.test.mjs`.
- Create `cli/test/mcp-tools.test.mjs`.
- Create `cli/test/adapter-smoke.test.mjs`.
- Modify `cli/test/lifecycle.test.mjs`, `doctor.test.mjs`, `transaction.test.mjs`, `cli.test.mjs`.
- Modify root, CLI và MCP bilingual README pairs.

### Task 1: Install Scope Contract

**Files:**
- Create: `cli/src/install-scope.mjs`
- Create: `cli/test/install-scope.test.mjs`
- Modify: `cli/src/cli.mjs`
- Modify: `cli/test/cli.test.mjs`

- [ ] **Step 1: Write failing scope resolver tests**

```js
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveInstallContext } from "../src/install-scope.mjs";

test("defaults to project scope", () => {
  const result = resolveInstallContext({
    scope: undefined,
    projectRoot: "C:\\work\\api",
    homeRoot: "C:\\Users\\dev",
  });
  assert.equal(result.scope, "project");
  assert.equal(result.targetRoot, path.resolve("C:\\work\\api"));
  assert.equal(result.stateRoot, path.resolve("C:\\work\\api", ".ai-engineering"));
  assert.equal(result.projectAssets, true);
});

test("resolves global runtime below user home", () => {
  const result = resolveInstallContext({
    scope: "global",
    projectRoot: "C:\\work\\api",
    homeRoot: "C:\\Users\\dev",
  });
  assert.equal(result.targetRoot, path.resolve("C:\\Users\\dev"));
  assert.equal(result.stateRoot, path.resolve("C:\\Users\\dev", ".ai-engineering"));
  assert.equal(result.projectAssets, false);
});

test("rejects unsupported scope", () => {
  assert.throws(
    () => resolveInstallContext({ scope: "team", projectRoot: ".", homeRoot: "." }),
    /scope must be project or global/,
  );
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
node --test cli/test/install-scope.test.mjs
```

Expected: FAIL because `install-scope.mjs` does not exist.

- [ ] **Step 3: Implement the scope resolver**

```js
import path from "node:path";
import { PlatformError } from "./errors.mjs";

export function resolveInstallContext({
  scope = "project",
  projectRoot,
  homeRoot,
}) {
  if (!["project", "global"].includes(scope)) {
    throw new PlatformError("scope must be project or global", {
      code: "AI_ENGINEERING_INVALID_SCOPE",
      exitCode: 2,
    });
  }
  const targetRoot = path.resolve(scope === "global" ? homeRoot : projectRoot);
  return {
    scope,
    targetRoot,
    stateRoot: path.join(targetRoot, ".ai-engineering"),
    projectAssets: scope === "project",
  };
}
```

- [ ] **Step 4: Parse and propagate `--scope`**

Extend `parseInstallArgs()` to return `scope`, add a reusable option parser for
`doctor`, `list`, `update`, and `uninstall`, and resolve `os.homedir()` only in
`run()`. Required behavior:

```js
const context = resolveInstallContext({
  scope: parsed.scope,
  projectRoot: process.cwd(),
  homeRoot: os.homedir(),
});
```

Update CLI help with:

```text
--scope <project|global>  Installation scope (default: project)
```

- [ ] **Step 5: Add CLI behavior tests**

Add tests asserting:

```js
const invalid = await runCli(
  ["install", "platform", "--target", "codex", "--scope", "team"],
  { cwd: target },
);
assert.equal(invalid.exitCode, 2);
assert.match(invalid.stderr, /scope must be project or global/);
```

Use a temporary `HOME`/`USERPROFILE` for global tests so the real user home is
never modified.

- [ ] **Step 6: Run scope and CLI tests**

Run:

```powershell
npm run build:cli
node --test cli/test/install-scope.test.mjs cli/test/cli.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add cli/src/install-scope.mjs cli/src/cli.mjs cli/test/install-scope.test.mjs cli/test/cli.test.mjs
git commit -m "feat(cli): add project and global install scopes"
```

### Task 2: Native MCP Config Model And Merge

**Files:**
- Create: `cli/src/mcp-config.mjs`
- Create: `cli/test/mcp-config.test.mjs`
- Modify: `cli/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add TOML dependency**

Run:

```powershell
npm install --workspace @ai-engineering-platform/cli @iarna/toml@^2.2.5
```

Expected: `cli/package.json` and `package-lock.json` include `@iarna/toml`.

- [ ] **Step 2: Write failing canonical config tests**

Cover these exact cases:

```js
const registrations = createMcpRegistrations({
  packIds: ["platform"],
  runtimeRoot: target,
});
assert.deepEqual(registrations.platform, {
  command: "node",
  args: [
    path.join(target, "mcp-servers", "platform-mcp", "src", "index.js"),
  ],
  env: {},
});
```

Codex merge must preserve:

```toml
model = "gpt-5"
[mcp_servers.user_owned]
command = "user-command"
```

while adding:

```toml
[mcp_servers.platform]
command = "node"
args = ["C:\\runtime\\platform-mcp\\src\\index.js"]
```

JSON merge must preserve sibling keys such as Claude `projects` and Cursor
`rules`.

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```powershell
node --test cli/test/mcp-config.test.mjs
```

Expected: FAIL because config functions do not exist.

- [ ] **Step 4: Implement canonical registrations**

Export:

```js
export function createMcpRegistrations({ packIds, runtimeRoot }) {
  return Object.fromEntries(
    packIds.map((packId) => [
      packId,
      {
        command: "node",
        args: [
          path.join(
            runtimeRoot,
            "mcp-servers",
            `${packId}-mcp`,
            "src",
            "index.js",
          ),
        ],
        env: {},
      },
    ]),
  );
}
```

- [ ] **Step 5: Implement structured merge functions**

Export:

```js
mergeCodexMcpConfig({ currentText, desired, previouslyManaged, force })
mergeJsonMcpConfig({ currentText, desired, previouslyManaged, force })
removeManagedMcpConfig({ provider, currentText, managedNames })
```

Rules:

- Parse TOML with `@iarna/toml`.
- Parse JSON with `JSON.parse`.
- Reject a desired name that exists but is not in `previouslyManaged`, unless
  `force`.
- Replace only names in `desired` or `previouslyManaged`.
- Preserve every unrelated top-level key and unrelated MCP server.
- Render UTF-8 text ending in one newline.
- Return `{ content, managedNames }`.

- [ ] **Step 6: Add malformed config and conflict tests**

Assert errors include provider and path-neutral remediation:

```js
assert.throws(
  () => mergeCodexMcpConfig({ currentText: "[invalid", desired: {}, previouslyManaged: [] }),
  /Cannot parse Codex MCP config/,
);
assert.throws(
  () => mergeJsonMcpConfig({
    currentText: '{"mcpServers":{"platform":{"command":"user"}}}',
    desired: { platform: registration },
    previouslyManaged: [],
    force: false,
  }),
  /unmanaged MCP server already exists: platform/,
);
```

- [ ] **Step 7: Run config tests**

Run:

```powershell
node --test cli/test/mcp-config.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add cli/src/mcp-config.mjs cli/test/mcp-config.test.mjs cli/package.json package-lock.json
git commit -m "feat(cli): add native MCP config merging"
```

### Task 3: Provider Projection For Both Scopes

**Files:**
- Modify: `cli/src/providers.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] **Step 1: Write failing provider config path tests**

For project scope assert:

```js
assert.equal(codex.mcpConfig.path, ".codex/config.toml");
assert.equal(claude.mcpConfig.path, ".mcp.json");
assert.equal(cursor.mcpConfig.path, ".cursor/mcp.json");
```

For global scope assert:

```js
assert.equal(codex.mcpConfig.path, ".codex/config.toml");
assert.equal(claude.mcpConfig.path, ".claude.json");
assert.equal(cursor.mcpConfig.path, ".cursor/mcp.json");
assert.deepEqual(codex.files, []);
assert.deepEqual(claude.files, []);
assert.deepEqual(cursor.files, []);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
node --test cli/test/providers.test.mjs
```

Expected: FAIL because projections do not expose `mcpConfig` or scope.

- [ ] **Step 3: Extend projection context**

Use:

```js
const context = {
  scope,
  plugin,
  commands,
  skills,
  agents,
  hooks,
  mcpServers,
};
```

Each provider returns:

```js
{
  manifest,
  files,
  mcpConfig: {
    provider: "codex",
    format: "toml",
    path: ".codex/config.toml",
    servers: context.mcpServers,
  },
}
```

Global projection returns no project skill, command, agent, plugin manifest or
rule files.

- [ ] **Step 4: Preserve current project projections**

Keep existing project outputs:

- Codex `.codex/agents/openai.yaml`, `.codex/workflows/commands.md`.
- Claude `.claude-plugin/plugin.json`, `commands/*.md`.
- Cursor `.cursor/rules/provider.json`, `.cursor/rules/*.mdc`.

Do not restore deprecated root `.codex-plugin` or `.cursor-plugin`.

- [ ] **Step 5: Run provider tests**

Run:

```powershell
node --test cli/test/providers.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add cli/src/providers.mjs cli/test/providers.test.mjs
git commit -m "feat(adapters): project native MCP registrations"
```

### Task 4: Transactional Lifecycle And Backups

**Files:**
- Modify: `cli/src/state.mjs`
- Modify: `cli/src/transaction.mjs`
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/src/init.mjs`
- Modify: `cli/test/transaction.test.mjs`
- Modify: `cli/test/lifecycle.test.mjs`

- [ ] **Step 1: Write failing transaction tests for merge-managed files**

Create a managed config, edit an unrelated user key, then update:

```js
await writeFile(configPath, [
  'model = "gpt-5"',
  "[mcp_servers.platform]",
  'command = "node"',
  'args = ["old.js"]',
  "",
].join("\n"));
```

Expected:

- Unrelated `model` drift does not conflict.
- Drift inside managed `platform` entry conflicts without `--force`.
- Failed validation restores the exact original bytes.
- Existing config gets a backup under
  `.ai-engineering/backups/provider-config/<timestamp>/`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
node --test cli/test/transaction.test.mjs cli/test/lifecycle.test.mjs
```

Expected: FAIL for merge-aware behavior and global lifecycle.

- [ ] **Step 3: Extend lock and ownership contracts**

Lock shape:

```js
{
  schemaVersion: 1,
  platformVersion,
  scope,
  providers,
  rootPlugins,
  plugins,
  managedMcpServers: {
    codex: ["platform"],
    claude: ["platform"],
    cursor: ["platform"],
  },
}
```

Merge-managed ownership metadata:

```js
{
  owners: ["platform"],
  source: "codex-mcp-config",
  checksum: "...",
  shared: true,
  mergeStrategy: "mcp-config",
}
```

- [ ] **Step 4: Make transaction drift checks merge-aware**

When `mergeStrategy === "mcp-config"`:

- Do not reject whole-file checksum drift.
- Require lifecycle to provide content already merged from current disk state.
- Continue backing up exact bytes before write.
- Include provider config files in rollback.

Add `backupRelativePaths` to the plan and copy pre-existing provider config files
once to:

```text
.ai-engineering/backups/provider-config/<transaction-id>/<relative-config-path>
```

Do not print backup content.

- [ ] **Step 5: Build desired state from install context**

Change lifecycle signatures to accept:

```js
{
  root,
  context,
  pluginIds,
  all,
  providers,
  force,
}
```

Project behavior:

- Call `initializeProject`.
- Copy project assets, runtime and MCP servers.

Global behavior:

- Do not call `initializeProject`.
- Copy only `.ai-engineering/core/mcp`, `.ai-engineering/mcp-servers`, state and
  provider MCP configs below home.

Use canonical runtime root:

```js
const runtimeRoot = path.join(context.targetRoot, ".ai-engineering");
```

- [ ] **Step 6: Merge provider configs during desired-state creation**

For each enabled provider:

1. Read current config text if present.
2. Read `previouslyManaged` from lock.
3. Merge desired registration through `mcp-config.mjs`.
4. Add resulting config to `desiredFiles` with `mergeStrategy: "mcp-config"`.
5. On uninstall, remove only server names no longer managed.
6. If the cleaned config has user content, keep it; if it becomes an empty
   generated JSON/TOML object, remove the file.

- [ ] **Step 7: Add project/global lifecycle assertions**

Project:

```js
assert.equal(await exists(project, ".codex/config.toml"), true);
assert.equal(await exists(project, ".mcp.json"), true);
assert.equal(await exists(project, ".cursor/mcp.json"), true);
assert.equal(await exists(project, "AGENTS.md"), true);
```

Global:

```js
assert.equal(await exists(home, ".codex/config.toml"), true);
assert.equal(await exists(home, ".claude.json"), true);
assert.equal(await exists(home, ".cursor/mcp.json"), true);
assert.equal(await exists(home, "AGENTS.md"), false);
assert.equal(await exists(home, "commands"), false);
```

- [ ] **Step 8: Run lifecycle and transaction tests**

Run:

```powershell
node --test cli/test/transaction.test.mjs cli/test/lifecycle.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add cli/src/state.mjs cli/src/transaction.mjs cli/src/lifecycle.mjs cli/src/init.mjs cli/test/transaction.test.mjs cli/test/lifecycle.test.mjs
git commit -m "feat(cli): install MCP runtimes by scope"
```

### Task 5: Prepare Runtime Contract-Handler Parity

**Files:**
- Modify: `core/mcp/stdio-runtime.js`
- Modify: `cli/src/contracts.mjs`
- Create: `cli/test/mcp-contracts.test.mjs`
- Modify: `cli/test/mcp-platform.test.mjs`

- [ ] **Step 1: Write failing parity tests**

Test runtime rejection:

```js
assert.throws(
  () => validateHandlerParity(
    { name: "test", tools: [{ name: "test.one" }] },
    {},
  ),
  /missing handlers: test.one/,
);
```

Test extra handler rejection:

```js
assert.throws(
  () => validateHandlerParity(
    { name: "test", tools: [{ name: "test.one" }] },
    { "test.one": () => ({}), "test.extra": () => ({}) },
  ),
  /handlers without contracts: test.extra/,
);
```

Repository validation must reject string-only tool definitions and missing
schemas/annotations.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
node --test cli/test/mcp-contracts.test.mjs cli/test/mcp-platform.test.mjs
```

Expected: FAIL because startup parity is not enforced.

- [ ] **Step 3: Export parity validation without activating startup enforcement**

Add:

```js
export function validateHandlerParity(contract, handlers) {
  const declared = new Set(contract.tools.map((tool) => tool.name));
  const registered = new Set(Object.keys(handlers));
  const missing = [...declared].filter((name) => !registered.has(name));
  const extra = [...registered].filter((name) => !declared.has(name));
  if (missing.length || extra.length) {
    throw new Error([
      missing.length ? `missing handlers: ${missing.join(", ")}` : "",
      extra.length ? `handlers without contracts: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("; "));
  }
}
```

Keep `createContractServer()` behavior unchanged in this task. Startup
enforcement is activated in Task 8 only after all seven servers register every
handler, so this checkpoint does not break existing servers.

- [ ] **Step 4: Add a reusable structured-contract validator**

Export an internal validator from `contracts.mjs` that accepts this shape:

```js
{
  name: string,
  description: string,
  inputSchema: object,
  outputSchema: object,
  annotations: {
    readOnlyHint: boolean,
    destructiveHint: boolean,
    idempotentHint: boolean,
    openWorldHint: boolean,
  },
}
```

Unit-test the validator directly, but do not apply it to repository validation
until Task 8 has converted all contracts.

- [ ] **Step 5: Run contract tests**

Run:

```powershell
node --test cli/test/mcp-contracts.test.mjs cli/test/mcp-platform.test.mjs
```

Expected: PASS. Existing platform behavior remains compatible until Task 7.

- [ ] **Step 6: Commit**

```powershell
git add core/mcp/stdio-runtime.js cli/src/contracts.mjs cli/test/mcp-contracts.test.mjs cli/test/mcp-platform.test.mjs
git commit -m "feat(mcp): enforce handler contract parity"
```

### Task 6: Shared Read-Only Workflow Handler Helper

**Files:**
- Create: `core/mcp/workflow-tools.js`
- Create: `cli/test/workflow-tools.test.mjs`

- [ ] **Step 1: Write failing helper tests**

Test required strings, optional arrays, stable section output and no mutation:

```js
const handler = createWorkflowHandler({
  toolName: "quality.generate_test_plan",
  required: ["scope", "risk"],
  optionalArrays: ["constraints"],
  build: ({ scope, risk, constraints }) => ({
    scope,
    risk,
    strategy: [`Prioritize ${risk}`],
    constraints,
  }),
});
```

Assertions:

- Missing/blank `scope` returns `scope is required`.
- Non-array `constraints` returns `constraints must be an array`.
- Valid output is JSON-serializable and deterministic.
- Input object remains unchanged.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
node --test cli/test/workflow-tools.test.mjs
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement helper primitives**

Export:

```js
export function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function optionalStringArray(value, field) {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return value.map((item) => item.trim());
}

export function createWorkflowHandler(definition) {
  return async (input = {}) => {
    const normalized = {};
    for (const field of definition.required) {
      normalized[field] = requiredString(input[field], field);
    }
    for (const field of definition.optionalArrays ?? []) {
      normalized[field] = optionalStringArray(input[field], field);
    }
    return definition.build({ ...input, ...normalized });
  };
}
```

Do not perform filesystem writes or spawn commands.

- [ ] **Step 4: Run helper tests**

Run:

```powershell
node --test cli/test/workflow-tools.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add core/mcp/workflow-tools.js cli/test/workflow-tools.test.mjs
git commit -m "feat(mcp): add shared workflow handler helpers"
```

### Task 7: Implement Platform, Architecture, And Application Tools

**Files:**
- Modify: `mcp-servers/platform-mcp/mcp.json`
- Create: `mcp-servers/platform-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/platform-mcp/src/server.js`
- Delete: `mcp-servers/platform-mcp/src/tools/deployment-plan.js`
- Modify: `mcp-servers/architecture-mcp/mcp.json`
- Create: `mcp-servers/architecture-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/architecture-mcp/src/server.js`
- Modify: `mcp-servers/application-mcp/mcp.json`
- Create: `mcp-servers/application-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/application-mcp/src/server.js`
- Create: `cli/test/mcp-tools.test.mjs`

- [ ] **Step 1: Create table-driven failing integration tests**

Use a case table with valid and invalid calls:

```js
{
  server: "platform",
  tool: "platform.review_docker",
  valid: { dockerfile: "FROM node:20", deploymentGoal: "production image" },
  requiredOutput: ["findings", "hardeningActions", "verificationChecks"],
  missingField: "dockerfile",
}
```

Define exact contracts:

| Tool | Required input | Output |
| --- | --- | --- |
| `platform.review_docker` | `dockerfile`, `deploymentGoal` | `findings`, `hardeningActions`, `verificationChecks` |
| `platform.review_kubernetes` | `manifest`, `workloadGoal` | `findings`, `reliabilityActions`, `verificationChecks` |
| `platform.deployment_plan` | `releaseScope`, `targetEnvironment` | existing deployment plan fields |
| `architecture.generate_system_design` | `systemGoal`, `qualityAttributes` | `components`, `dataFlows`, `tradeoffs`, `validationQuestions` |
| `architecture.review_architecture` | `architectureSummary`, `reviewFocus` | `findings`, `risks`, `recommendations`, `decisionQuestions` |
| `architecture.generate_adr` | `decisionTitle`, `context`, `options` | `status`, `decision`, `consequences`, `alternatives` |
| `application.review_source_code` | `sourceSummary`, `reviewGoal` | `findings`, `refactoringActions`, `testGaps` |
| `application.generate_service` | `serviceGoal`, `technicalContext` | `components`, `implementationSteps`, `contracts`, `verification` |
| `application.review_api` | `apiContract`, `reviewGoal` | `findings`, `compatibilityRisks`, `recommendations`, `tests` |

- [ ] **Step 2: Run integration tests and confirm failure**

Run:

```powershell
node --test cli/test/mcp-tools.test.mjs
```

Expected: FAIL on missing handlers/string contracts.

- [ ] **Step 3: Convert nine contracts to structured definitions**

Every definition uses:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["firstField", "secondField"],
  "properties": {
    "firstField": { "type": "string", "minLength": 1 },
    "secondField": { "type": "string", "minLength": 1 },
    "constraints": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

Annotations for all nine tools:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

- [ ] **Step 4: Implement and register nine handlers**

Use `createWorkflowHandler`; each output must derive from inputs and contain at
least three actionable items in planning/checklist arrays. Export one named
function per tool and register all names explicitly:

```js
handlers: {
  "platform.review_docker": reviewDocker,
  "platform.review_kubernetes": reviewKubernetes,
  "platform.deployment_plan": createDeploymentPlan,
}
```

- [ ] **Step 5: Run nine-tool tests and repository validation**

Run:

```powershell
node --test cli/test/mcp-tools.test.mjs
npm run build:cli
node cli/dist/index.js validate
```

Expected: tool tests PASS; validation still reports only the remaining
unstructured/unimplemented capability contracts.

- [ ] **Step 6: Commit**

```powershell
git add core/mcp mcp-servers/platform-mcp mcp-servers/architecture-mcp mcp-servers/application-mcp cli/test/mcp-tools.test.mjs
git commit -m "feat(mcp): implement platform and application workflows"
```

### Task 8: Implement Data, Knowledge, Quality, And Security Tools

**Files:**
- Modify: `mcp-servers/data-mcp/mcp.json`
- Create: `mcp-servers/data-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/data-mcp/src/server.js`
- Modify: `mcp-servers/knowledge-mcp/mcp.json`
- Create: `mcp-servers/knowledge-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/knowledge-mcp/src/server.js`
- Modify: `mcp-servers/quality-mcp/mcp.json`
- Create: `mcp-servers/quality-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/quality-mcp/src/server.js`
- Modify: `mcp-servers/security-mcp/mcp.json`
- Create: `mcp-servers/security-mcp/src/tools/handlers.js`
- Modify: `mcp-servers/security-mcp/src/server.js`
- Modify: `cli/test/mcp-tools.test.mjs`

- [ ] **Step 1: Add twelve failing cases to the table**

Use these exact contracts:

| Tool | Required input | Output |
| --- | --- | --- |
| `data.analyze_schema` | `schemaSummary`, `workloadProfile` | `findings`, `normalizationNotes`, `queryRisks`, `recommendations` |
| `data.review_index` | `tableAndQueries`, `performanceGoal` | `findings`, `candidateIndexes`, `tradeoffs`, `verificationQueries` |
| `data.migration_plan` | `sourceContract`, `targetContract` | `stages`, `dataChecks`, `rollbackPlan`, `cutoverGates` |
| `knowledge.generate_readme` | `projectSummary`, `audience` | `sections`, `setupChecklist`, `usageExamples`, `maintenanceNotes` |
| `knowledge.generate_runbook` | `serviceSummary`, `operationalScenario` | `signals`, `diagnosticSteps`, `mitigations`, `escalationCriteria` |
| `knowledge.review_docs` | `documentSummary`, `reviewGoal` | `findings`, `missingSections`, `clarityActions`, `verification` |
| `quality.generate_test_plan` | `scope`, `riskProfile` | `testLevels`, `scenarios`, `fixtures`, `exitCriteria` |
| `quality.review_coverage` | `coverageSummary`, `criticalFlows` | `gaps`, `priorityTests`, `falseConfidenceRisks`, `targets` |
| `quality.performance_review` | `systemProfile`, `performanceGoal` | `bottlenecks`, `experiments`, `metrics`, `acceptanceCriteria` |
| `security.scan_source` | `sourceSummary`, `threatContext` | `findings`, `severitySummary`, `remediations`, `verification` |
| `security.scan_dependencies` | `dependencyManifest`, `runtimeContext` | `findings`, `upgradeActions`, `supplyChainChecks`, `verification` |
| `security.generate_threat_model` | `systemSummary`, `trustBoundaries` | `assets`, `threats`, `mitigations`, `validationQuestions` |

- [ ] **Step 2: Run tests and confirm twelve failures**

Run:

```powershell
node --test cli/test/mcp-tools.test.mjs
```

Expected: existing nine cases PASS, new twelve cases FAIL.

- [ ] **Step 3: Convert remaining contracts and implement handlers**

Apply the same structured schema and read-only annotations from Task 7. Each
handler must:

- Validate both required strings.
- Accept optional `constraints: string[]`.
- Return all output keys in the table.
- Include no shell execution, network call or filesystem mutation.
- Produce deterministic output for equal input.

- [ ] **Step 4: Register all handlers explicitly**

Each `server.js` imports named exports and contains a complete map. No dynamic
handler lookup by filename.

- [ ] **Step 5: Run all MCP tests and validation**

Before running tests:

- Call `validateHandlerParity(contract, handlers)` in
  `createContractServer().start()` after loading the contract.
- Apply the structured-contract validator inside
  `validateRoutingAndMcp()`.
- Remove the test that expects `has no handler`.
- Add an intentionally invalid contract/handler fixture that must fail startup.

Run:

```powershell
node --test cli/test/mcp-contracts.test.mjs cli/test/mcp-platform.test.mjs cli/test/mcp-tools.test.mjs
npm run build:cli
node cli/dist/index.js validate
```

Expected: PASS; repository reports seven MCP servers and no parity failure.

- [ ] **Step 6: Commit**

```powershell
git add mcp-servers/data-mcp mcp-servers/knowledge-mcp mcp-servers/quality-mcp mcp-servers/security-mcp cli/test/mcp-tools.test.mjs
git commit -m "feat(mcp): implement data quality and security workflows"
```

### Task 9: Scope-Aware Doctor And Adapter Smoke Matrix

**Files:**
- Modify: `cli/src/doctor.mjs`
- Modify: `cli/test/doctor.test.mjs`
- Create: `cli/test/adapter-smoke.test.mjs`
- Modify: `cli/test/helpers.mjs`

- [ ] **Step 1: Write failing doctor tests**

Project doctor must detect a missing `.cursor/mcp.json`; global doctor must not
require `AGENTS.md` or project projection files.

Add a corrupted registration assertion:

```js
await writeFile(
  path.join(home, ".claude.json"),
  JSON.stringify({ mcpServers: { platform: { command: "node", args: ["wrong.js"] } } }),
);
await assert.rejects(
  doctorProject({ context: globalContext }),
  /Claude registration does not match installed runtime: platform/,
);
```

- [ ] **Step 2: Add a reusable MCP process probe**

In test helper and doctor internal utility, send:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"doctor","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"ping","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}
```

Timeout after 5 seconds, kill the child, and report server name plus stderr.

- [ ] **Step 3: Implement scope-aware doctor**

Doctor validates:

- State files under `context.targetRoot/.ai-engineering`.
- Project baseline only for project scope.
- Provider config path and parse format.
- Managed registrations equal lock and absolute entrypoints.
- Every installed server responds to initialize, ping and tools/list.
- Listed tool count equals contract tool count.

Return:

```js
{
  status: "pass",
  scope,
  packs,
  providers,
  mcpServers: [{ name, toolCount, status: "pass" }],
  nativeChecks: [{ provider, status: "pass" | "skipped", reason }],
}
```

- [ ] **Step 4: Create six-combination smoke test**

For each pair:

```js
for (const scope of ["project", "global"]) {
  for (const provider of ["codex", "claude", "cursor"]) {
    // install all into isolated temp project/home
    // parse native config
    // run doctor
    // probe all seven MCP entrypoints
    // uninstall all and assert user-owned config remains
  }
}
```

Set both `HOME` and `USERPROFILE` in spawned CLI environment.

- [ ] **Step 5: Add optional native binary checks**

Use `where.exe` on Windows and `command -v` on Unix through a small
platform-specific resolver. Only run:

```text
codex mcp list
claude mcp list
```

when binary exists. Cursor native verification remains `skipped` unless its
documented CLI exposes an MCP list command in the installed version. Never fail
deterministic tests solely because an IDE binary is absent.

- [ ] **Step 6: Run doctor and smoke tests**

Run:

```powershell
npm run build:cli
node --test cli/test/doctor.test.mjs cli/test/adapter-smoke.test.mjs
```

Expected: six scope/provider combinations PASS; optional checks report pass or
skipped.

- [ ] **Step 7: Commit**

```powershell
git add cli/src/doctor.mjs cli/test/doctor.test.mjs cli/test/adapter-smoke.test.mjs cli/test/helpers.mjs
git commit -m "test(adapters): verify project and global MCP installs"
```

### Task 10: Documentation And Distribution Commands

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `cli/README.md`
- Modify: `cli/README_VI.md`
- Modify: `mcp-servers/README.md`
- Modify: `mcp-servers/README_VI.md`

- [ ] **Step 1: Update English docs first**

Document source installation:

```powershell
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

Document both scopes:

```powershell
ai-engineering install --all --target codex,claude,cursor --scope project
ai-engineering install --all --target codex,claude,cursor --scope global
ai-engineering doctor --scope project
ai-engineering doctor --scope global
```

State that each machine must run install because stdio entrypoints use absolute
local paths.

- [ ] **Step 2: Synchronize Vietnamese sibling READMEs**

Translate the same command semantics and limitations. Keep command blocks
identical.

- [ ] **Step 3: Update MCP server documentation**

Replace “declared tools without handlers” language with:

- Startup rejects contract-handler mismatch.
- All released tools are structured and read-only.
- Provider-native config paths by scope.

- [ ] **Step 4: Verify README pairs and commands**

Run:

```powershell
npm run build:cli
node cli/dist/index.js --help
rg -n -- "--scope|\\.codex/config\\.toml|\\.claude\\.json|\\.cursor/mcp\\.json" README.md README_VI.md cli/README.md cli/README_VI.md mcp-servers/README.md mcp-servers/README_VI.md
```

Expected: help and all six docs contain consistent scope/config guidance.

- [ ] **Step 5: Commit**

```powershell
git add README.md README_VI.md cli/README.md cli/README_VI.md mcp-servers/README.md mcp-servers/README_VI.md
git commit -m "docs(mcp): document scoped IDE installation"
```

### Task 11: Full Verification And Release Readiness

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run the repository checklist**

Run:

```powershell
npm test
npm run validate
npm run build:cli
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run isolated project smoke**

In a temporary project:

```powershell
ai-engineering init
ai-engineering install platform security --target codex,claude,cursor --scope project
ai-engineering doctor --scope project
ai-engineering uninstall platform security --scope project
```

Expected: install and doctor PASS; uninstall preserves pre-created user config
entries.

- [ ] **Step 3: Run isolated global smoke**

With temporary `HOME` and `USERPROFILE`:

```powershell
ai-engineering install --all --target codex,claude,cursor --scope global
ai-engineering doctor --scope global
ai-engineering uninstall --all --scope global
```

Expected: runtime/config/state exist only under temporary home; uninstall
removes managed registrations and preserves user-owned config.

- [ ] **Step 4: Inspect final diff and generated artifacts**

Run:

```powershell
git status --short
git diff --check
git diff --stat
```

Confirm:

- No generated `dist/`, audit or flow output is staged.
- No real user home config was modified.
- No `has no handler` expectation remains in released MCP tests/docs.
- All README depth 0-1 pairs remain synchronized.

- [ ] **Step 5: Commit any verification fixes**

Only when Step 1-4 required a source correction, stage the exact paths shown by
`git status --short` that belong to that correction:

```powershell
git add cli/src/doctor.mjs cli/test/doctor.test.mjs
git commit -m "fix(mcp): resolve scoped install verification gaps"
```

Replace the example paths with the actual corrected files; do not stage
unrelated changes.

- [ ] **Step 6: Prepare completion evidence**

Report:

- Branch and commit list.
- Exact test commands and counts.
- Six adapter/scope smoke outcomes.
- Optional native IDE checks with explicit `pass` or `skipped`.
- Residual risk: provider config schema may change; source install still
  requires Node.js 20+ and one install run per machine.
