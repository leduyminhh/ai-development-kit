# Provider-Native Plugin Install Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `aie install` so installed plugins are projected into the real Codex and Claude discovery flows, allowing users to use skills/commands immediately after install.

**Architecture:** Keep `plugins/` as the canonical source, but split installation into provider-native projections. The lifecycle continues to own dependency resolution, runtime copy, MCP config merge, ownership and state; provider projectors decide where Codex and Claude assets are written for project/global scope.

**Tech Stack:** Node.js CLI (`cli/src/*.mjs`), Node test runner (`node --test`), existing transaction/ownership system, Codex native skill layout, Claude plugin/skill layout.

---

## Target Provider Layout

### Codex

Project scope:

```text
<project>/.agents/skills/<skill>/SKILL.md
<project>/.agents/skills/<skill>/{scripts,references,assets,agents}/...
<project>/AGENTS.md
<project>/.codex/config.toml
```

Global scope:

```text
~/.agents/skills/<skill>/SKILL.md
~/.agents/skills/<skill>/{scripts,references,assets,agents}/...
~/.codex/AGENTS.md
~/.codex/config.toml
```

Compatibility cleanup:

```text
Do not use .codex/skills as the primary Codex skill location.
Do not depend on .codex/workflows/commands.md as the primary command surface.
```

### Claude

Project scope:

```text
<project>/.claude/skills/<skill>/SKILL.md
<project>/.claude/skills/<skill>/{scripts,references,assets,agents}/...
<project>/.claude/commands/<command>.md
<project>/CLAUDE.md
<project>/.mcp.json
```

Global scope:

```text
~/.claude/skills/<skill>/SKILL.md
~/.claude/skills/<skill>/{scripts,references,assets,agents}/...
~/.claude/commands/<command>.md
~/.claude/CLAUDE.md
~/.claude.json
```

Plugin metadata:

```text
<scope>/.claude-plugin/plugin.json is not the primary Claude Code plugin install mechanism for this CLI flow.
Use Claude-native skills and commands paths so Claude Code can discover them directly.
```

## Files And Responsibilities

- Modify `cli/src/lifecycle.mjs`: build provider-native desired files, copy canonical skills into the correct native paths, and preserve ownership/state behavior.
- Modify `cli/src/providers.mjs`: return provider-specific native asset paths instead of legacy `.codex/skills`, `skills/`, and root `commands/` paths.
- Modify `cli/src/init.mjs`: optionally support global Codex/Claude instruction files if baseline installation needs a shared helper.
- Modify `cli/test/lifecycle.test.mjs`: assert project/global install outputs for Codex and Claude.
- Modify `cli/test/providers.test.mjs`: assert provider projection paths are native and contained.
- Modify `cli/test/doctor.test.mjs`: assert `doctor/check` sees native Codex/Claude assets.
- Modify `README.md`, `README_VI.md`, `cli/README.md`, `cli/README_VI.md`: document actual native install locations.

---

### Task 1: Lock Codex Project Install To `.agents/skills`

**Files:**
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/src/lifecycle.mjs`

- [ ] **Step 1: Write the failing test**

In `cli/test/lifecycle.test.mjs`, update `installs application project-locally with required dependencies`:

```js
assert.equal(
  await exists(target, ".agents/skills/code-shared-design/SKILL.md"),
  true,
);
assert.equal(
  await exists(target, ".codex/skills/code-shared-design/SKILL.md"),
  false,
);
assert.equal(await exists(target, "AGENTS.md"), true);
assert.equal(await exists(target, ".codex/config.toml"), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: FAIL because current lifecycle writes `.codex/skills/...`.

- [ ] **Step 3: Implement minimal Codex project path migration**

In `cli/src/lifecycle.mjs`, change the Codex skill prefix in project asset generation:

```js
if (graph.providers.includes("codex")) {
  prefixes.add(`.agents/skills/${skill}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: lifecycle test passes for Codex project assets.

---

### Task 2: Lock Codex Global Install To `~/.agents/skills`

**Files:**
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/src/lifecycle.mjs`

- [ ] **Step 1: Write the failing test**

In `installs globally with Codex-native assets only`, replace the current Codex skill assertion:

```js
assert.equal(await exists(home, ".agents/skills/git-workflow-design/SKILL.md"), true);
assert.equal(await exists(home, ".codex/skills/git-workflow-design/SKILL.md"), false);
assert.equal(await exists(home, ".codex/config.toml"), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: FAIL because current global Codex code writes `.codex/skills/...`.

- [ ] **Step 3: Implement minimal global Codex path migration**

In `addCodexGlobalAssets`, change:

```js
const prefix = `.agents/skills/${skill}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: global Codex test passes.

---

### Task 3: Add Claude Project Skills And Commands

**Files:**
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/src/providers.mjs`

- [ ] **Step 1: Write the failing test**

Add a new lifecycle test:

```js
test("installs Claude project-native skills and commands", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-project-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["claude"],
    });

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.equal(await exists(target, ".claude/skills/java-analyze/SKILL.md"), true);
    assert.equal(await exists(target, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(target, ".mcp.json"), true);
    assert.equal(await exists(target, "skills/java-analyze/SKILL.md"), false);
    assert.equal(await exists(target, "commands/review-backend.md"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: FAIL because Claude currently writes `skills/` and `commands/`.

- [ ] **Step 3: Implement Claude project skill path**

In project asset generation:

```js
if (graph.providers.includes("claude")) {
  prefixes.add(`.claude/skills/${skill}`);
}
```

- [ ] **Step 4: Implement Claude command path**

In `projectClaude(context)`, change command file paths:

```js
const commands = context.commands.map((command) => ({
  path: `.claude/commands/${command.id}.md`,
  content: `---\ndescription: ${command.description}\n---\n\n${commandBody(command)}`,
}));
```

- [ ] **Step 5: Remove root command writes for provider-native installs**

In `addProjectAssets`, stop writing canonical command files to root `commands/`. Keep loading command metadata:

```js
const commands = [];
for (const pluginId of graph.pluginIds) {
  const plugin = plugins.get(pluginId);
  for (const commandId of plugin.assets.commands) {
    commands.push(await loadCanonicalCommand(await findCommandPath(root, commandId)));
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: Claude project assets use `.claude/skills` and `.claude/commands`.

---

### Task 4: Add Claude Global Skills And Commands

**Files:**
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/src/providers.mjs`

- [ ] **Step 1: Write the failing test**

Add a lifecycle test:

```js
test("installs Claude global-native skills and commands", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-global-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-global-home-"));
  try {
    const context = resolveInstallContext({
      scope: "global",
      projectRoot: project,
      homeRoot: home,
    });
    const result = await installPlugins({
      root: repoRoot,
      target: context.targetRoot,
      context,
      pluginIds: ["application"],
      providers: ["claude"],
    });

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.equal(await exists(home, ".claude/skills/java-analyze/SKILL.md"), true);
    assert.equal(await exists(home, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(home, ".claude.json"), true);
    assert.equal(await exists(project, ".claude/skills/java-analyze/SKILL.md"), false);
    assert.equal(await exists(home, "skills/java-analyze/SKILL.md"), false);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: FAIL because global Claude currently only gets `.claude.json`.

- [ ] **Step 3: Add provider-native global asset helper**

Create a lifecycle helper:

```js
async function addGlobalProviderSkills({
  root,
  graph,
  provider,
  desiredFiles,
  ownershipFiles,
}) {
  const prefixByProvider = {
    codex: ".agents/skills",
    claude: ".claude/skills",
  };
  const rootPrefix = prefixByProvider[provider];
  if (!rootPrefix) return;
  for (const skill of graph.skills) {
    for (const [relativePath, content] of await readDirectoryFiles(
      await findSkillPath(root, skill),
      `${rootPrefix}/${skill}`,
    )) {
      desiredFiles.set(relativePath, content);
      addOwnership(
        ownershipFiles,
        relativePath,
        graph.ownership.skills[skill] ?? graph.pluginIds,
        skill,
        (graph.ownership.skills[skill] ?? []).length > 1,
      );
    }
  }
}
```

- [ ] **Step 4: Use helper for Codex and Claude global**

Replace the Codex-only global branch with:

```js
} else if (installContext.scope === "global") {
  commands = await loadGraphCommands({ root, graph, plugins });
  for (const provider of graph.providers) {
    await addGlobalProviderSkills({
      root,
      graph,
      provider,
      desiredFiles,
      ownershipFiles,
    });
  }
}
```

- [ ] **Step 5: Allow Claude provider files in global scope**

In provider file write condition:

```js
const globalProviderFiles = new Set(["codex", "claude"]);
const writeProviderFiles =
  installContext.projectAssets ||
  (installContext.scope === "global" && globalProviderFiles.has(provider));
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: Claude global test passes.

---

### Task 5: Add Provider Projection Tests

**Files:**
- Modify: `cli/test/providers.test.mjs`
- Modify: `cli/src/providers.mjs`

- [ ] **Step 1: Write failing projection assertions**

Update `projects canonical command semantics for all providers`:

```js
assert.deepEqual(
  codex.files.map((file) => file.path),
  [".codex/agents/openai.yaml", ".codex/workflows/commands.md"],
);
assert.deepEqual(
  claude.files.map((file) => file.path),
  [".claude-plugin/plugin.json", ".claude/commands/review-backend.md"],
);
```

Update global projection test:

```js
assert.deepEqual(
  outputs.claude.files.map((file) => file.path),
  [".claude-plugin/plugin.json"],
);
```

If `.claude-plugin/plugin.json` is intentionally removed from CLI install, assert only `.claude/commands/*` instead and document that choice in README.

- [ ] **Step 2: Run test to verify failure or current mismatch**

Run:

```powershell
npm run build:cli
node --test cli/test/providers.test.mjs
```

Expected: Fail until `projectClaude` emits the agreed native paths.

- [ ] **Step 3: Adjust `projectClaude`**

Make `projectClaude` emit:

```js
const commands = context.commands.map((command) => ({
  path: `.claude/commands/${command.id}.md`,
  content: `---\ndescription: ${command.description}\n---\n\n${commandBody(command)}`,
}));
```

Keep or remove `.claude-plugin/plugin.json` deliberately:

```js
const projectFiles = [
  {
    path: ".claude-plugin/plugin.json",
    content: json(providerManifest),
  },
  ...commands,
];
```

- [ ] **Step 4: Run provider tests**

Run:

```powershell
npm run build:cli
node --test cli/test/providers.test.mjs
```

Expected: provider projection tests pass.

---

### Task 6: Update Check/Doctor Asset Detection

**Files:**
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/test/doctor.test.mjs`

- [ ] **Step 1: Write failing check assertions**

In `checks installed MCP servers, skills, commands, and current state`, assert native skill paths are reported:

```js
assert.equal(
  check.skills.installed.some((item) => item.paths.includes(".agents/skills/code-shared-design")),
  true,
);
assert.equal(
  check.commands.installed.some((item) => item.paths.includes(".claude/commands/review-backend.md")),
  true,
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs cli/test/doctor.test.mjs
```

Expected: FAIL because `collectInstalledAssets` only matches old paths.

- [ ] **Step 3: Update skill path detection**

In `collectInstalledAssets`, replace skill regex with:

```js
const skill = file.match(
  /^(?:\.agents\/skills|\.claude\/skills|\.codex\/skills|skills)\/([^/]+)\//,
)?.[1];
```

- [ ] **Step 4: Update command path detection**

Use:

```js
const command = file.match(
  /^(?:commands|\.claude\/commands)\/([^/]+)\.md$/,
)?.[1];
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs cli/test/doctor.test.mjs
```

Expected: check/doctor tests pass.

---

### Task 7: Migration Compatibility For Existing Managed Paths

**Files:**
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/test/lifecycle.test.mjs`

- [ ] **Step 1: Write failing migration test**

Add a test showing old managed paths are removed on update when ownership says they are platform-managed:

```js
test("updates remove old managed provider skill paths after native migration", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-native-migration-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["codex"],
    });
    await writeFile(
      path.join(target, ".ai-engineering/ownership.json"),
      JSON.stringify({
        schemaVersion: 1,
        files: {
          ".codex/skills/git-workflow-design/SKILL.md": {
            owners: ["platform"],
            source: "git-workflow-design",
            checksum: "",
            shared: false,
          },
        },
      }),
    );

    await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
    });

    assert.equal(await exists(target, ".agents/skills/git-workflow-design/SKILL.md"), true);
    assert.equal(await exists(target, ".codex/skills/git-workflow-design/SKILL.md"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: failure if old managed paths are not removed.

- [ ] **Step 3: Use existing transaction deletion behavior**

Confirm `planTransaction` removes paths present in previous ownership but absent from desired ownership. If not, add a small compatibility list to desired state planning:

```js
const deprecatedManagedPrefixes = [
  ".codex/skills/",
  "skills/",
  "commands/",
];
```

Only delete paths when ownership metadata says the platform owns them.

- [ ] **Step 4: Run lifecycle tests**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

Expected: migration compatibility test passes.

---

### Task 8: Update Documentation To Match Real Flows

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `cli/README.md`
- Modify: `cli/README_VI.md`
- Modify: `docs/migration/migrate-existing-source-to-plugins-platform.md`
- Modify: `cli/test/distribution.test.mjs`

- [ ] **Step 1: Write failing doc test**

In `cli/test/distribution.test.mjs`, add expected native paths:

```js
const expected = [
  "aie install --all --target codex",
  "aie install --all --target claude",
  ".agents/skills",
  ".claude/skills",
  ".claude/commands",
  ".codex/config.toml",
  ".mcp.json",
  ".claude.json",
];
```

- [ ] **Step 2: Run doc test to verify it fails**

Run:

```powershell
node --test cli/test/distribution.test.mjs
```

Expected: FAIL until docs mention native paths.

- [ ] **Step 3: Update English docs**

Add a section:

```markdown
## Native Provider Install Paths

Codex project installs write `.agents/skills`, `AGENTS.md`, and `.codex/config.toml`.
Codex global installs write `~/.agents/skills`, `~/.codex/AGENTS.md`, and `~/.codex/config.toml`.

Claude project installs write `.claude/skills`, `.claude/commands`, `CLAUDE.md`, and `.mcp.json`.
Claude global installs write `~/.claude/skills`, `~/.claude/commands`, `~/.claude/CLAUDE.md`, and `~/.claude.json`.
```

- [ ] **Step 4: Update Vietnamese docs using UTF-8 Vietnamese**

Add the same section with proper Vietnamese diacritics.

- [ ] **Step 5: Run distribution test**

Run:

```powershell
node --test cli/test/distribution.test.mjs
```

Expected: pass.

---

### Task 9: Full Verification And Smoke

**Files:**
- No source file changes unless tests reveal gaps.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs cli/test/providers.test.mjs cli/test/doctor.test.mjs cli/test/distribution.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 2: Run full repository checks**

Run:

```powershell
npm test
npm run validate
npm run build:cli
```

Expected:

```text
npm test passes
validate reports 7 plugins for 3 providers
build:cli exits 0
```

- [ ] **Step 3: Run project smoke with temp target**

Run in a temp directory:

```powershell
node E:\Mine\AI\ai-development-kit\cli\dist\index.js install application --target codex,claude
Test-Path .agents\skills\java-analyze\SKILL.md
Test-Path .claude\skills\java-analyze\SKILL.md
Test-Path .claude\commands\review-backend.md
Test-Path .codex\config.toml
Test-Path .mcp.json
```

Expected: all `Test-Path` checks return `True`.

- [ ] **Step 4: Run global smoke with temp home**

Run with isolated `USERPROFILE`/`HOME`:

```powershell
node E:\Mine\AI\ai-development-kit\cli\dist\index.js install application --target codex,claude -g
Test-Path $env:USERPROFILE\.agents\skills\java-analyze\SKILL.md
Test-Path $env:USERPROFILE\.claude\skills\java-analyze\SKILL.md
Test-Path $env:USERPROFILE\.claude\commands\review-backend.md
Test-Path $env:USERPROFILE\.codex\config.toml
Test-Path $env:USERPROFILE\.claude.json
```

Expected: all `Test-Path` checks return `True`.

---

## Self-Review

Spec coverage:

- Codex install flow maps to `.agents/skills`, `AGENTS.md`, and `.codex/config.toml`.
- Claude install flow maps to `.claude/skills`, `.claude/commands`, `CLAUDE.md`, `.mcp.json`, and `.claude.json`.
- Canonical plugin graph, runtime, MCP server copy, ownership and state remain in lifecycle.
- Migration compatibility for old managed `.codex/skills`, `skills`, and `commands` paths is covered.

No-placeholder scan:

- No task uses TBD/TODO/fill later.
- Each implementation task has explicit file paths, test snippets, commands, and expected outcomes.

Type consistency:

- Uses existing `installPlugins`, `updatePlugins`, `resolveInstallContext`, `exists`, `projectCodex`, `projectClaude`, `projectProviders`.
- Reuses current `desiredFiles`, `ownershipFiles`, and transaction model.
