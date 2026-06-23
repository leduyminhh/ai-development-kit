# AIE Install Interactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng `aie install` thành wizard interactive auto-detect plugin/provider, hỗ trợ Space/Enter, install-all option, và resumable install state.

**Architecture:** Giữ pipeline hiện có `install-request -> install-wizard -> install-plan -> lifecycle`, thêm detection và session state như module nhỏ độc lập. `install-wizard.mjs` chỉ điều phối selection UI và draft; lifecycle vẫn là nguồn sự thật cho prepare/apply installation.

**Tech Stack:** Node.js ESM, `node:test`, built-in `readline`, file state JSON/JSONL, existing CLI modules in `cli/src`.

---

## File Structure

- Create `cli/src/install-detection.mjs`: phát hiện project context và đề xuất plugin với reasons/confidence.
- Create `cli/src/install-session.mjs`: đọc/ghi/complete/cancel resumable session state.
- Modify `cli/src/install-wizard.mjs`: thêm checklist prompter, install-all item, wizard step rendering, resume hooks.
- Modify `cli/src/cli.mjs`: wire detection/session vào nhánh interactive `aie install`, không đổi non-interactive.
- Test `cli/test/install-detection.test.mjs`: fixture-based plugin recommendation tests.
- Test `cli/test/install-session.test.mjs`: session persistence/resume tests.
- Modify `cli/test/cli.test.mjs`: thêm CLI-level regression cho non-TTY và direct install nếu cần.
- Modify docs if behavior is user-visible in `README.md` and sibling `README_VI.md` only if install usage text changes.

---

### Task 1: Install Detection Module

**Files:**
- Create: `cli/src/install-detection.mjs`
- Test: `cli/test/install-detection.test.mjs`

- [ ] **Step 1: Write failing detection tests**

Create `cli/test/install-detection.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectInstallRecommendations } from "../src/install-detection.mjs";

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

    const result = await detectInstallRecommendations({ projectRoot: root });

    assert.ok(result.plugins.some((item) => item.pluginId === "security"));
    assert.ok(result.plugins.some((item) => item.pluginId === "quality"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:cli && node --test cli/test/install-detection.test.mjs`

Expected: FAIL with module not found for `../src/install-detection.mjs`.

- [ ] **Step 3: Implement detection module**

Create `cli/src/install-detection.mjs`:

```js
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function exists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(pathname) {
  try {
    return await readFile(pathname, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function addRecommendation(recommendations, pluginId, confidence, reason) {
  const current = recommendations.get(pluginId) ?? {
    pluginId,
    confidence: 0,
    reasons: [],
  };
  current.confidence = Math.max(current.confidence, confidence);
  if (!current.reasons.includes(reason)) current.reasons.push(reason);
  recommendations.set(pluginId, current);
}

async function hasDirectoryEntry(projectRoot, names) {
  const entries = new Set((await readdir(projectRoot, { withFileTypes: true })).map((entry) => entry.name));
  return names.some((name) => entries.has(name));
}

export async function detectInstallRecommendations({ projectRoot }) {
  const recommendations = new Map();
  addRecommendation(recommendations, "platform", 0.9, "baseline AI Engineering runtime is recommended for project installs");

  const packageJson = await readTextIfExists(path.join(projectRoot, "package.json"));
  if (packageJson) {
    const lower = packageJson.toLowerCase();
    addRecommendation(recommendations, "quality", 0.7, "package.json indicates a JavaScript project");
    if (lower.includes("react") || lower.includes("next") || lower.includes("vite")) {
      addRecommendation(recommendations, "application", 0.85, "package.json includes react/next/vite application signals");
    }
  }

  const javaSignals = ["pom.xml", "build.gradle", "build.gradle.kts"];
  if ((await Promise.all(javaSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "architecture", 0.8, "Java build files indicate backend architecture work");
    addRecommendation(recommendations, "quality", 0.7, "Java build files indicate test and quality automation needs");
  }

  const pythonSignals = ["pyproject.toml", "requirements.txt", "setup.py"];
  if ((await Promise.all(pythonSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "architecture", 0.7, "Python project files indicate service or application design work");
    addRecommendation(recommendations, "quality", 0.7, "Python project files indicate test and quality automation needs");
  }

  const lockSignals = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock"];
  if ((await Promise.all(lockSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "security", 0.7, "dependency lockfile indicates supply-chain review value");
  }

  if (await exists(path.join(projectRoot, ".github", "workflows"))) {
    addRecommendation(recommendations, "quality", 0.7, "CI workflow directory indicates quality automation value");
    addRecommendation(recommendations, "security", 0.65, "CI workflow directory indicates security review value");
  }

  if (await hasDirectoryEntry(projectRoot, ["docs", "adr", "architecture"])) {
    addRecommendation(recommendations, "architecture", 0.65, "documentation or ADR directories indicate architecture assets");
  }

  return {
    plugins: [...recommendations.values()].sort((left, right) => left.pluginId.localeCompare(right.pluginId)),
  };
}

export function recommendedPluginIds(recommendations) {
  return recommendations.plugins.map((item) => item.pluginId);
}
```

- [ ] **Step 4: Run detection tests**

Run: `npm run build:cli && node --test cli/test/install-detection.test.mjs`

Expected: PASS all tests in `install-detection.test.mjs`.

- [ ] **Step 5: Commit detection unit**

Run:

```bash
git add cli/src/install-detection.mjs cli/test/install-detection.test.mjs
git commit -m "feat: detect install plugin recommendations"
```

---

### Task 2: Install Session State

**Files:**
- Create: `cli/src/install-session.mjs`
- Test: `cli/test/install-session.test.mjs`

- [ ] **Step 1: Write failing session tests**

Create `cli/test/install-session.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  completeInstallSession,
  readInstallSession,
  writeInstallSession,
} from "../src/install-session.mjs";

test("writes and reads running install session state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aie-install-session-"));
  try {
    const session = await writeInstallSession({
      target: root,
      currentStep: "plugins",
      draft: { rootPlugins: ["platform"], all: false, providers: ["codex"], optionalPlugins: [], scope: "project", force: false },
      detectedProviders: ["codex"],
      detectedPlugins: [{ pluginId: "platform", confidence: 0.9, reasons: ["baseline"] }],
      planHash: "hash-one",
    });

    const read = await readInstallSession({ target: root });

    assert.equal(read.status, "running");
    assert.equal(read.sessionId, session.sessionId);
    assert.equal(read.currentStep, "plugins");
    assert.deepEqual(read.draft.rootPlugins, ["platform"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("appends install session events and completes session", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aie-install-session-events-"));
  try {
    await writeInstallSession({
      target: root,
      currentStep: "confirm",
      draft: { rootPlugins: ["quality"], all: false, providers: ["cursor"], optionalPlugins: [], scope: "project", force: false },
      detectedProviders: ["cursor"],
      detectedPlugins: [],
      planHash: "hash-two",
    });

    const completed = await completeInstallSession({ target: root });
    const events = await readFile(path.join(root, ".ai-engineering", "install", "events.jsonl"), "utf8");

    assert.equal(completed.status, "completed");
    assert.match(events, /session-written/);
    assert.match(events, /session-completed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:cli && node --test cli/test/install-session.test.mjs`

Expected: FAIL with module not found for `../src/install-session.mjs`.

- [ ] **Step 3: Implement install session module**

Create `cli/src/install-session.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const INSTALL_DIR = path.join(".ai-engineering", "install");
const SESSION_FILE = "session.json";
const EVENTS_FILE = "events.jsonl";

function installPath(target, filename) {
  return path.join(target, INSTALL_DIR, filename);
}

async function appendEvent(target, type, data = {}) {
  const pathname = installPath(target, EVENTS_FILE);
  await mkdir(path.dirname(pathname), { recursive: true });
  const event = { type, data, timestamp: new Date().toISOString() };
  await writeFile(pathname, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

async function readSessionFile(target) {
  try {
    return JSON.parse(await readFile(installPath(target, SESSION_FILE), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readInstallSession({ target }) {
  return readSessionFile(target);
}

export async function writeInstallSession({
  target,
  currentStep,
  draft,
  detectedProviders = [],
  detectedPlugins = [],
  planHash = "",
}) {
  const existing = await readSessionFile(target);
  const now = new Date().toISOString();
  const session = {
    schemaVersion: 1,
    sessionId: existing?.sessionId ?? randomUUID(),
    status: "running",
    currentStep,
    draft,
    detectedProviders,
    detectedPlugins,
    planHash,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const pathname = installPath(target, SESSION_FILE);
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-written", { sessionId: session.sessionId, currentStep });
  return session;
}

export async function completeInstallSession({ target }) {
  const existing = await readSessionFile(target);
  if (!existing) return null;
  const session = { ...existing, status: "completed", updatedAt: new Date().toISOString() };
  await writeFile(installPath(target, SESSION_FILE), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-completed", { sessionId: session.sessionId });
  return session;
}

export async function cancelInstallSession({ target }) {
  const existing = await readSessionFile(target);
  if (!existing) return null;
  const session = { ...existing, status: "cancelled", updatedAt: new Date().toISOString() };
  await writeFile(installPath(target, SESSION_FILE), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-cancelled", { sessionId: session.sessionId });
  return session;
}
```

- [ ] **Step 4: Run session tests**

Run: `npm run build:cli && node --test cli/test/install-session.test.mjs`

Expected: PASS all tests in `install-session.test.mjs`.

- [ ] **Step 5: Commit session unit**

Run:

```bash
git add cli/src/install-session.mjs cli/test/install-session.test.mjs
git commit -m "feat: persist install wizard sessions"
```

---

### Task 3: Wizard Checklist Model and Install-All Selection

**Files:**
- Modify: `cli/src/install-wizard.mjs`
- Test: `cli/test/install-wizard.test.mjs`

- [ ] **Step 1: Write failing wizard tests**

Create `cli/test/install-wizard.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { runInstallWizard } from "../src/install-wizard.mjs";
import { parseInstallRequest } from "../src/install-request.mjs";

function scriptedPrompter(answers) {
  const calls = [];
  return {
    calls,
    async ask(step, options) {
      calls.push({ step, options });
      const answer = answers.shift();
      if (typeof answer === "function") return answer(step, options);
      return answer;
    },
    close() {},
  };
}

const availablePlugins = [
  { id: "application", dependencies: { optional: [] } },
  { id: "platform", dependencies: { optional: [] } },
  { id: "quality", dependencies: { optional: [] } },
  { id: "security", dependencies: { optional: [] } },
];

test("wizard starts plugin selection from detected recommendations", async () => {
  const prompter = scriptedPrompter([
    ["platform", "quality"],
    ["codex"],
    "project",
    "install",
  ]);

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins,
    detectedProviders: ["codex"],
    detectedPlugins: [{ pluginId: "platform" }, { pluginId: "quality" }],
    preparePlan: async () => ({ summary: [] }),
    prompter,
  });

  assert.deepEqual(prompter.calls[0].options.selected, ["platform", "quality"]);
  assert.deepEqual(result.intent.rootPlugins, ["platform", "quality"]);
  assert.equal(result.intent.all, false);
});

test("wizard supports install all selection", async () => {
  const prompter = scriptedPrompter([
    { all: true, selected: [] },
    ["cursor"],
    "project",
    "install",
  ]);

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins,
    detectedProviders: ["cursor"],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: [] }),
    prompter,
  });

  assert.equal(result.intent.all, true);
  assert.deepEqual(result.intent.rootPlugins, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:cli && node --test cli/test/install-wizard.test.mjs`

Expected: FAIL because `runInstallWizard` does not accept `detectedPlugins` and does not support `{ all, selected }` plugin answers.

- [ ] **Step 3: Update wizard draft handling**

Modify `cli/src/install-wizard.mjs`:

```js
function recommendedPluginSelection(draft, detectedPlugins) {
  if (draft.rootPlugins.locked || draft.rootPlugins.value.length > 0) {
    return draft.rootPlugins.value;
  }
  return [...new Set((detectedPlugins ?? []).map((item) => item.pluginId))].sort();
}

function normalizePluginAnswer(answer) {
  if (Array.isArray(answer)) return { all: false, selected: answer };
  if (answer && typeof answer === "object") {
    return { all: Boolean(answer.all), selected: answer.selected ?? [] };
  }
  return { all: false, selected: [] };
}
```

Update `runInstallWizard` signature and plugin step:

```js
export async function runInstallWizard({
  draft: originalDraft,
  availablePlugins,
  detectedProviders,
  detectedPlugins = [],
  preparePlan,
  prompter,
}) {
  let draft = applyDetectedProviders(originalDraft, detectedProviders);
  if (!draft.rootPlugins.locked && !draft.all.locked) {
    const pluginAnswer = normalizePluginAnswer(
      await prompter.ask("rootPlugins", {
        choices: availablePlugins.map((item) => item.id),
        selected: recommendedPluginSelection(draft, detectedPlugins),
        detected: detectedPlugins,
        allowAll: true,
      }),
    );
    draft.all = wizardField(pluginAnswer.all);
    draft.rootPlugins = wizardField(pluginAnswer.all ? [] : pluginAnswer.selected);
  }
  // keep the rest of providers, optional plugins, scope, plan, confirm logic unchanged
}
```

- [ ] **Step 4: Run wizard tests**

Run: `npm run build:cli && node --test cli/test/install-wizard.test.mjs`

Expected: PASS all tests in `install-wizard.test.mjs`.

- [ ] **Step 5: Commit wizard model**

Run:

```bash
git add cli/src/install-wizard.mjs cli/test/install-wizard.test.mjs
git commit -m "feat: recommend install plugins in wizard"
```

---

### Task 4: Terminal Checklist Prompter

**Files:**
- Modify: `cli/src/install-wizard.mjs`
- Test: `cli/test/install-wizard.test.mjs`

- [ ] **Step 1: Add render/prompt unit tests**

Append to `cli/test/install-wizard.test.mjs`:

```js
import { renderChecklistStep, parseChecklistKey } from "../src/install-wizard.mjs";

test("renders plugin checklist with install all and recommendation reasons", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["application", "platform", "quality"],
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
    detected: [{ pluginId: "platform", reasons: ["baseline runtime"] }],
  });

  assert.match(output, /Plugins/);
  assert.match(output, /Install all plugins/);
  assert.match(output, /platform/);
  assert.match(output, /baseline runtime/);
});

test("parses checklist keys for toggle, submit, and movement", () => {
  assert.equal(parseChecklistKey(" "), "toggle");
  assert.equal(parseChecklistKey("\r"), "submit");
  assert.equal(parseChecklistKey("\n"), "submit");
  assert.equal(parseChecklistKey("j"), "down");
  assert.equal(parseChecklistKey("k"), "up");
  assert.equal(parseChecklistKey("a"), "all");
  assert.equal(parseChecklistKey("q"), "cancel");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:cli && node --test cli/test/install-wizard.test.mjs`

Expected: FAIL because `renderChecklistStep` and `parseChecklistKey` are not exported.

- [ ] **Step 3: Implement render and key parsing**

Add to `cli/src/install-wizard.mjs`:

```js
function reasonLookup(detected = []) {
  return new Map(detected.map((item) => [item.pluginId, item.reasons ?? []]));
}

export function renderChecklistStep({
  title,
  choices,
  selected = [],
  cursor = 0,
  allowAll = false,
  all = false,
  detected = [],
}) {
  const reasons = reasonLookup(detected);
  const lines = ["", `${title}:`, "Use ↑/↓ or j/k to move, Space to toggle, Enter to continue."];
  if (allowAll) {
    lines.push(`${cursor === -1 ? "›" : " "} [${all ? "x" : " "}] Install all plugins`);
  }
  choices.forEach((choice, index) => {
    const checked = selected.includes(choice);
    const marker = cursor === index ? "›" : " ";
    const reasonText = reasons.has(choice) ? ` — ${reasons.get(choice).join("; ")}` : "";
    lines.push(`${marker} [${checked ? "x" : " "}] ${choice}${reasonText}`);
  });
  lines.push("");
  return lines.join("\n");
}

export function parseChecklistKey(input) {
  if (input === " " || input === "space") return "toggle";
  if (input === "\r" || input === "\n" || input === "enter") return "submit";
  if (input === "j" || input === "down") return "down";
  if (input === "k" || input === "up") return "up";
  if (input === "a") return "all";
  if (input === "b") return "back";
  if (input === "q" || input === "\u001b") return "cancel";
  return "ignore";
}
```

Keep `createTerminalPrompter` fallback prompt intact, then add raw-mode only when `input.setRawMode` exists:

```js
function createChecklistPrompt({ input, output, readline }) {
  return async function checklistPrompt(step, options) {
    if (!input.setRawMode || !input.isTTY) {
      return null;
    }
    const choices = options.choices ?? [];
    let selected = [...(options.selected ?? [])];
    let cursor = options.allowAll ? -1 : 0;
    let all = false;
    input.setRawMode(true);
    input.resume();
    return await new Promise((resolve) => {
      const render = () => {
        output.write("\x1Bc");
        output.write(renderChecklistStep({ title: step, choices, selected, cursor, allowAll: options.allowAll, all, detected: options.detected }));
      };
      const onData = (chunk) => {
        const action = parseChecklistKey(chunk.toString("utf8"));
        if (action === "down") cursor = Math.min(choices.length - 1, cursor + 1);
        if (action === "up") cursor = Math.max(options.allowAll ? -1 : 0, cursor - 1);
        if (action === "all") all = !all;
        if (action === "toggle") {
          if (cursor === -1) all = !all;
          else if (selected.includes(choices[cursor])) selected = selected.filter((item) => item !== choices[cursor]);
          else selected = [...selected, choices[cursor]].sort();
        }
        if (action === "cancel") {
          cleanup();
          resolve("cancel");
          return;
        }
        if (action === "submit") {
          cleanup();
          resolve(options.allowAll ? { all, selected } : selected);
          return;
        }
        render();
      };
      const cleanup = () => {
        input.off("data", onData);
        input.setRawMode(false);
        output.write("\n");
      };
      input.on("data", onData);
      render();
    });
  };
}
```

Update `createTerminalPrompter.ask` so for multi-select steps it tries checklist first; if checklist returns `null`, use existing numbered fallback.

- [ ] **Step 4: Run wizard tests**

Run: `npm run build:cli && node --test cli/test/install-wizard.test.mjs`

Expected: PASS wizard tests.

- [ ] **Step 5: Commit checklist rendering**

Run:

```bash
git add cli/src/install-wizard.mjs cli/test/install-wizard.test.mjs
git commit -m "feat: add interactive install checklist UI"
```

---

### Task 5: Wire Detection and Session into CLI

**Files:**
- Modify: `cli/src/cli.mjs`
- Modify: `cli/src/install-wizard.mjs`
- Test: `cli/test/cli.test.mjs`

- [ ] **Step 1: Add CLI regression tests**

Append to `cli/test/cli.test.mjs`:

```js
test("non-TTY install without yes still requires interactive terminal", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-nontty-"));
  try {
    const result = await runCli(["install"], { cwd: target });
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Install requires confirmation in non-interactive mode/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test before wiring**

Run: `npm run build:cli && node --test cli/test/cli.test.mjs`

Expected: PASS, establishing current non-TTY behavior remains protected.

- [ ] **Step 3: Import and pass detection/session data**

Modify imports in `cli/src/cli.mjs`:

```js
import { detectInstallRecommendations } from "./install-detection.mjs";
import {
  cancelInstallSession,
  completeInstallSession,
  readInstallSession,
  writeInstallSession,
} from "./install-session.mjs";
```

Inside the interactive branch, before `runInstallWizard`:

```js
const projectRoot = process.cwd();
const detectedProviders = await detectProviders({ projectRoot });
const detectedRecommendations = await detectInstallRecommendations({ projectRoot });
const contextForState = resolveInstallContext({
  scope: draft.scope.value,
  projectRoot,
  homeRoot: os.homedir(),
});
const existingSession = await readInstallSession({ target: contextForState.targetRoot });
```

Pass to `runInstallWizard`:

```js
detectedProviders,
detectedPlugins: detectedRecommendations.plugins,
existingSession,
onSession: async (sessionDraft, currentStep, planHash = "") => writeInstallSession({
  target: contextForState.targetRoot,
  currentStep,
  draft: sessionDraft,
  detectedProviders,
  detectedPlugins: detectedRecommendations.plugins,
  planHash,
}),
```

After wizard cancel:

```js
await cancelInstallSession({ target: contextForState.targetRoot });
```

After `applyPreparedInstallation` succeeds:

```js
await completeInstallSession({ target: context.targetRoot });
```

- [ ] **Step 4: Add session callback support to wizard**

Modify `runInstallWizard` signature:

```js
existingSession = null,
onSession = async () => {},
```

At start, if `existingSession?.status === "running"`, seed draft from `existingSession.draft`:

```js
let draft = applyDetectedProviders(originalDraft, detectedProviders);
if (existingSession?.status === "running") {
  draft = {
    ...draft,
    rootPlugins: wizardField(existingSession.draft.rootPlugins ?? []),
    all: wizardField(Boolean(existingSession.draft.all)),
    providers: wizardField(existingSession.draft.providers ?? draft.providers.value),
    optionalPlugins: wizardField(existingSession.draft.optionalPlugins ?? []),
    scope: wizardField(existingSession.draft.scope ?? draft.scope.value),
  };
}
```

After each major step, call:

```js
await onSession(toInstallIntent(draft), "plugins");
await onSession(toInstallIntent(draft), "providers");
await onSession(toInstallIntent(draft), "scope");
```

After plan is built:

```js
await onSession(toInstallIntent(draft), "confirm", JSON.stringify(plan).length.toString(36));
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm run build:cli
node --test cli/test/install-detection.test.mjs cli/test/install-session.test.mjs cli/test/install-wizard.test.mjs cli/test/cli.test.mjs
```

Expected: PASS all targeted tests.

- [ ] **Step 6: Commit CLI wiring**

Run:

```bash
git add cli/src/cli.mjs cli/src/install-wizard.mjs cli/test/cli.test.mjs
git commit -m "feat: wire install detection and resume state"
```

---

### Task 6: Documentation and Full Verification

**Files:**
- Modify: `README.md` if install usage text changes
- Modify: `README_VI.md` if `README.md` changes
- No docs change if CLI help already describes enough and tests cover behavior

- [ ] **Step 1: Check whether help text needs updating**

Run: `rg "aie install|--all|--target|interactive" README.md README_VI.md cli/src/cli.mjs`

Expected: Identify whether `README.md` user-facing install instructions mention old numbered-only behavior. If no old wizard behavior is documented, skip docs changes and report no docs change needed.

- [ ] **Step 2: Update bilingual README only if needed**

If `README.md` changes, update sibling `README_VI.md` in the same commit because repository rule requires depth 0-1 README pairs.

Use concise text in English README:

```md
Run `aie install` in an interactive terminal to let the CLI detect providers and recommend plugins. Use Space to toggle selections, Enter to continue, or choose Install all plugins.
```

Use Vietnamese counterpart:

```md
Chạy `aie install` trong terminal tương tác để CLI tự phát hiện provider và đề xuất plugin. Dùng Space để bật/tắt lựa chọn, Enter để đi tiếp, hoặc chọn cài tất cả plugin.
```

- [ ] **Step 3: Run repository verification**

Run:

```bash
npm run build:cli
npm test
npm run validate
npm run doctor
```

Expected: all commands exit 0.

- [ ] **Step 4: Report skipped smoke test**

If the target-project smoke test is not run, report skipped command explicitly:

```bash
ai-engineering init
ai-engineering install platform security --target cursor
ai-engineering doctor
```

Reason to skip is acceptable if global `ai-engineering` binary is not linked in the environment.

- [ ] **Step 5: Commit docs if changed**

Run only if docs changed:

```bash
git add README.md README_VI.md
git commit -m "docs: describe interactive install wizard"
```

---

## Self-Review

- Spec coverage: auto-detect plugin/provider is covered by Tasks 1 and 5; Space/Enter checklist and install-all by Tasks 3 and 4; resumable state by Tasks 2 and 5; compatibility and validation by Tasks 5 and 6.
- Placeholder scan: no TBD/TODO/implement-later placeholders are present; each task includes concrete file paths, commands, and expected results.
- Type consistency: detection returns `{ plugins: [{ pluginId, confidence, reasons }] }`; wizard consumes `detectedPlugins`; session persists `draft`, `detectedProviders`, `detectedPlugins`, and `planHash` consistently.
