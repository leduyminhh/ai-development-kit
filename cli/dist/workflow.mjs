import { access, appendFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import * as yaml from "js-yaml";
import { PlatformError } from "./errors.mjs";
import { loadPlugins } from "./contracts.mjs";
import { writeJsonAtomic } from "./io.mjs";
import { STATE_DIR } from "./state.mjs";
const WORKFLOWS_DIR = `${STATE_DIR}/workflows`;
const DEFINITIONS_DIR = `${WORKFLOWS_DIR}/definitions`;
const RUNS_DIR = `${WORKFLOWS_DIR}/runs`;
async function fileExists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
function parseWorkflowYaml(content) {
    return yaml.load(content.replace(/^\uFEFF/, ""));
}
function validateStepIds(steps) {
    const ids = new Set();
    for (const step of steps) {
        if (!step.id)
            return "step missing required id";
        if (ids.has(step.id))
            return `duplicate step id: ${step.id}`;
        ids.add(step.id);
    }
    return null;
}
function detectCycle(steps) {
    const graph = {};
    for (const step of steps) {
        graph[step.id] = step.depends || [];
    }
    const visiting = new Set();
    const visited = new Set();
    function dfs(nodeId) {
        if (visiting.has(nodeId))
            return true;
        if (visited.has(nodeId))
            return false;
        visiting.add(nodeId);
        for (const dep of graph[nodeId] || []) {
            if (dfs(dep))
                return true;
        }
        visiting.delete(nodeId);
        visited.add(nodeId);
        return false;
    }
    for (const step of steps) {
        if (dfs(step.id))
            return `dependency cycle detected involving step: ${step.id}`;
    }
    return null;
}
function topologicalSort(steps) {
    const stepMap = new Map(steps.map((s) => [s.id, s]));
    const visited = new Set();
    const result = [];
    function visit(stepId) {
        if (visited.has(stepId))
            return;
        visited.add(stepId);
        const step = stepMap.get(stepId);
        if (!step)
            return;
        for (const dep of (step.depends || [])) {
            visit(dep);
        }
        result.push(stepId);
    }
    for (const step of steps) {
        visit(step.id);
    }
    return result;
}
async function readRunState(target, workflowId, runId) {
    const sp = path.join(target, RUNS_DIR, workflowId, runId, "state.snapshot.json");
    if (!(await fileExists(sp))) {
        throw new PlatformError("run not found: " + workflowId + "/" + runId, {
            code: "AI_ENGINEERING_WORKFLOW_RUN_NOT_FOUND",
        });
    }
    return JSON.parse(await readFile(sp, "utf8"));
}
async function writeRunState(target, workflowId, runId, state) {
    const sp = path.join(target, RUNS_DIR, workflowId, runId, "state.snapshot.json");
    await writeJsonAtomic(sp, state);
}
async function logEvent(target, workflowId, runId, eventData) {
    const ep = path.join(target, RUNS_DIR, workflowId, runId, "events.jsonl");
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...eventData }) + "\n";
    await appendFile(ep, entry, "utf8");
}
function generateStepInstructions(wf, step) {
    const lines = [];
    lines.push("## Step: " + step.id);
    lines.push("- Skill: `" + step.uses + "`");
    lines.push("- Workflow: " + wf.id + " (" + (wf.description || "") + ")");
    if (step.depends && step.depends.length)
        lines.push("- Dependencies: " + step.depends.join(", "));
    if (step.input) {
        lines.push("- Input:");
        for (const [k, v] of Object.entries(step.input)) {
            lines.push("  - " + k + ": " + v);
        }
    }
    if (step.gates && step.gates.length)
        lines.push("- Gates: " + step.gates.join(", "));
    if (step.onError) {
        lines.push("- Error policy: " + (step.onError.policy || "stop"));
        if (step.onError.retryDelay)
            lines.push("  - Retry delay: " + step.onError.retryDelay);
        if (step.onError.fallbackStep)
            lines.push("  - Fallback: " + step.onError.fallbackStep);
    }
    return lines.join("\n");
}
export async function loadWorkflow(target, workflowId) {
    const wfPath = path.join(target, DEFINITIONS_DIR, `${workflowId}.yaml`);
    if (!(await fileExists(wfPath))) {
        throw new PlatformError(`workflow not found: ${workflowId}`, {
            code: "AI_ENGINEERING_WORKFLOW_NOT_FOUND",
        });
    }
    return parseWorkflowYaml(await readFile(wfPath, "utf8"));
}
function validateWorkflowDefinition(wf) {
    const errors = [];
    if (!wf || typeof wf !== "object")
        return ["workflow definition is empty"];
    if (!wf.id || typeof wf.id !== "string")
        errors.push("missing or invalid: id");
    if (!wf.description)
        errors.push("missing required field: description");
    if (!wf.version)
        errors.push("missing required field: version");
    if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
        errors.push("missing required field: steps (non-empty array)");
        return errors;
    }
    const dupe = validateStepIds(wf.steps);
    if (dupe)
        errors.push(dupe);
    const stepIds = new Set(wf.steps.map((s) => s.id));
    for (const step of wf.steps) {
        if (!step.uses || typeof step.uses !== "string") {
            errors.push(`step ${step.id}: missing required field: uses`);
        }
        else if (!/^[a-z]+\/[a-z0-9_-]+$/.test(step.uses)) {
            errors.push(`step ${step.id}: invalid uses format "${step.uses}" (expected plugin/skill)`);
        }
        if (step.depends) {
            if (!Array.isArray(step.depends)) {
                errors.push(`step ${step.id}: depends must be an array`);
            }
            else {
                for (const dep of step.depends) {
                    if (!stepIds.has(dep)) {
                        errors.push(`step ${step.id}: depends on unknown step "${dep}"`);
                    }
                }
            }
        }
        if (step.onError) {
            if (step.onError.policy === "retry" && step.onError.retryDelay && !/^[0-9]+[smh]$/.test(step.onError.retryDelay)) {
                errors.push(`step ${step.id}: invalid retryDelay "${step.onError.retryDelay}"`);
            }
            if (step.onError.policy === "fallback" && !step.onError.fallbackStep) {
                errors.push(`step ${step.id}: fallback policy requires fallbackStep`);
            }
            if (step.onError.policy === "fallback" && step.onError.fallbackStep && !stepIds.has(step.onError.fallbackStep)) {
                errors.push(`step ${step.id}: fallbackStep "${step.onError.fallbackStep}" not found`);
            }
        }
    }
    const cycle = detectCycle(wf.steps);
    if (cycle)
        errors.push(cycle);
    return errors;
}
function generateInstructions(wf) {
    const lines = [];
    lines.push(`## Workflow: ${wf.id}`);
    lines.push(`- Description: ${wf.description || ""}`);
    lines.push(`- Version: ${wf.version}`);
    if (wf.input) {
        lines.push("- Input variables:");
        for (const [key, tmpl] of Object.entries(wf.input)) {
            lines.push(`  - ${key}: ${tmpl}`);
        }
    }
    lines.push("");
    lines.push("### Steps");
    for (let i = 0; i < wf.steps.length; i++) {
        const s = wf.steps[i];
        lines.push(`**Step ${i + 1}: ${s.id}**`);
        lines.push(`- Skill: \`${s.uses}\``);
        if (s.depends?.length)
            lines.push(`- Dependencies: ${s.depends.join(", ")}`);
        if (s.input) {
            for (const [k, v] of Object.entries(s.input)) {
                lines.push(`- Input "${k}": ${v}`);
            }
        }
        if (s.gates?.length)
            lines.push(`- Gates: ${s.gates.join(", ")}`);
        if (s.onError)
            lines.push(`- On error: ${s.onError.policy}`);
        lines.push("");
    }
    return lines.join("\n");
}
export async function workflowInit({ target }) {
    await mkdir(path.join(target, DEFINITIONS_DIR), { recursive: true });
    await mkdir(path.join(target, RUNS_DIR), { recursive: true });
    return { status: "pass", definitions: path.join(target, DEFINITIONS_DIR), runs: path.join(target, RUNS_DIR) };
}
export async function workflowList({ target, core }) {
    const project = [];
    const defsRoot = path.join(target, DEFINITIONS_DIR);
    if (await fileExists(defsRoot)) {
        for (const f of (await readdir(defsRoot)).filter((x) => x.endsWith(".yaml")).sort()) {
            project.push({ id: f.replace(/\.yaml$/, ""), source: "project" });
        }
    }
    const global = [];
    if (core) {
        const coreRoot = path.join(core, "core", "workflows");
        if (await fileExists(coreRoot)) {
            for (const f of (await readdir(coreRoot)).filter((x) => x.endsWith(".yaml")).sort()) {
                const id = f.replace(/\.yaml$/, "");
                if (!project.some((p) => p.id === id)) {
                    global.push({ id, source: "global" });
                }
            }
        }
    }
    const all = [...project.map((w) => ({ ...w, description: "" })), ...global.map((w) => ({ ...w, description: "" }))];
    return { status: "pass", workflows: all, projectCount: project.length, globalCount: global.length };
}
export async function workflowValidate({ target, core }) {
    const errors = [];
    const defsRoot = path.join(target, DEFINITIONS_DIR);
    if (await fileExists(defsRoot)) {
        for (const f of (await readdir(defsRoot)).filter((x) => x.endsWith(".yaml"))) {
            try {
                const wf = parseWorkflowYaml(await readFile(path.join(defsRoot, f), "utf8"));
                for (const e of validateWorkflowDefinition(wf))
                    errors.push(`${f.replace(/\.yaml$/, "")}: ${e}`);
            }
            catch (e) {
                errors.push(`${f}: parse error - ${e.message}`);
            }
        }
    }
    if (core) {
        const coreRoot = path.join(core, "core", "workflows");
        if (await fileExists(coreRoot)) {
            for (const f of (await readdir(coreRoot)).filter((x) => x.endsWith(".yaml"))) {
                try {
                    const wf = parseWorkflowYaml(await readFile(path.join(coreRoot, f), "utf8"));
                    const wfId = f.replace(/\.yaml$/, "");
                    for (const e of validateWorkflowDefinition(wf))
                        errors.push(`core/${wfId}: ${e}`);
                }
                catch (e) {
                    errors.push(`core/${f}: parse error - ${e.message}`);
                }
            }
        }
    }
    return errors.length > 0 ? { status: "fail", errors } : { status: "pass", errors: [] };
}
export async function workflowBuild({ target, core, workflowId }) {
    let wf;
    const projectPath = path.join(target, DEFINITIONS_DIR, `${workflowId}.yaml`);
    if (await fileExists(projectPath)) {
        wf = parseWorkflowYaml(await readFile(projectPath, "utf8"));
    }
    else if (core) {
        const corePath = path.join(core, "core", "workflows", `${workflowId}.yaml`);
        if (await fileExists(corePath)) {
            wf = parseWorkflowYaml(await readFile(corePath, "utf8"));
        }
    }
    if (!wf) {
        throw new PlatformError(`workflow not found: ${workflowId}`, {
            code: "AI_ENGINEERING_WORKFLOW_NOT_FOUND",
        });
    }
    const errs = validateWorkflowDefinition(wf);
    if (errs.length > 0)
        return { status: "fail", workflowId, errors: errs, instructions: null };
    return { status: "pass", instructions: generateInstructions(wf), stepPlan: topologicalSort(wf.steps) };
}
export async function workflowRun({ target, workflowId, context = {} }) {
    const wf = await loadWorkflow(target, workflowId);
    const errs = validateWorkflowDefinition(wf);
    if (errs.length > 0)
        return { status: "fail", workflowId, errors: errs, instructions: null };
    const ts = new Date().toISOString().replace(/[:.]/g, "");
    const runDir = path.join(target, RUNS_DIR, workflowId, ts);
    await mkdir(path.join(runDir, "steps"), { recursive: true });
    const stepPlan = topologicalSort(wf.steps);
    await writeJsonAtomic(path.join(runDir, "state.snapshot.json"), {
        workflowId, runId: ts, startTime: new Date().toISOString(),
        status: "running", context, stepResults: {}, currentStep: null, error: null,
        stepPlan,
    });
    await logEvent(target, workflowId, ts, { type: "start", data: { workflowId, context, stepPlan } });
    return { status: "pass", workflowId, runId: ts, runDir, instructions: generateInstructions(wf), stepPlan };
}
export async function workflowStepNext({ target, workflowId, runId }) {
    const state = await readRunState(target, workflowId, runId);
    if (state.status !== "running")
        return { status: state.status, workflowId, runId };
    const wf = await loadWorkflow(target, workflowId);
    const completedSteps = new Set(Object.entries(state.stepResults)
        .filter(([, result]) => result.status === "completed")
        .map(([id]) => id));
    for (const stepId of state.stepPlan) {
        if (completedSteps.has(stepId))
            continue;
        if (state.stepResults[stepId] && state.stepResults[stepId].status === "running") {
            const step = wf.steps.find((s) => s.id === stepId);
            return { status: "pass", workflowId, runId, stepId, step, instructions: generateStepInstructions(wf, step), phase: "in_progress" };
        }
        const step = wf.steps.find((s) => s.id === stepId);
        const depsMet = (step.depends || []).every((dep) => completedSteps.has(dep));
        if (depsMet) {
            state.stepResults[stepId] = { status: "running", startedAt: new Date().toISOString() };
            state.currentStep = stepId;
            await writeRunState(target, workflowId, runId, state);
            await logEvent(target, workflowId, runId, { type: "step-start", data: { stepId } });
            return { status: "pass", workflowId, runId, stepId, step, instructions: generateStepInstructions(wf, step), phase: "started" };
        }
    }
    const failedSteps = Object.entries(state.stepResults)
        .filter(([, result]) => result.status === "failed")
        .map(([id]) => id);
    if (failedSteps.length > 0) {
        state.status = "failed";
        state.error = "Steps failed: " + failedSteps.join(", ");
        state.currentStep = null;
        await writeRunState(target, workflowId, runId, state);
        return { status: "failed", workflowId, runId, failedSteps };
    }
    state.status = "complete";
    state.completedAt = new Date().toISOString();
    state.currentStep = null;
    await writeRunState(target, workflowId, runId, state);
    await logEvent(target, workflowId, runId, { type: "complete", data: { completedSteps: [...completedSteps] } });
    return { status: "complete", workflowId, runId };
}
export async function workflowStepComplete({ target, workflowId, runId, stepId, result = {} }) {
    const state = await readRunState(target, workflowId, runId);
    if (state.status !== "running") {
        throw new PlatformError("workflow is not running (status: " + state.status + ")", {
            code: "AI_ENGINEERING_WORKFLOW_NOT_RUNNING",
        });
    }
    if (!state.stepResults[stepId] || state.stepResults[stepId].status !== "running") {
        throw new PlatformError("step " + stepId + " is not running", {
            code: "AI_ENGINEERING_WORKFLOW_STEP_NOT_RUNNING",
        });
    }
    state.stepResults[stepId] = {
        status: "completed",
        startedAt: state.stepResults[stepId].startedAt,
        completedAt: new Date().toISOString(),
        output: result.output || null,
    };
    state.currentStep = null;
    await writeRunState(target, workflowId, runId, state);
    await logEvent(target, workflowId, runId, { type: "step-complete", data: { stepId, result } });
    return { status: "pass", workflowId, runId, stepId, workflowStatus: state.status };
}
export async function workflowStepFail({ target, workflowId, runId, stepId, error = "" }) {
    const state = await readRunState(target, workflowId, runId);
    if (state.status !== "running") {
        throw new PlatformError("workflow is not running (status: " + state.status + ")", {
            code: "AI_ENGINEERING_WORKFLOW_NOT_RUNNING",
        });
    }
    if (!state.stepResults[stepId] || state.stepResults[stepId].status !== "running") {
        throw new PlatformError("step " + stepId + " is not running", {
            code: "AI_ENGINEERING_WORKFLOW_STEP_NOT_RUNNING",
        });
    }
    state.stepResults[stepId] = {
        ...state.stepResults[stepId],
        status: "failed",
        failedAt: new Date().toISOString(),
        error,
    };
    state.currentStep = null;
    await writeRunState(target, workflowId, runId, state);
    await logEvent(target, workflowId, runId, { type: "step-fail", data: { stepId, error } });
    return { status: "pass", workflowId, runId, stepId, workflowStatus: state.status };
}
export async function workflowStatus({ target, workflowId, runId }) {
    const base = path.join(target, RUNS_DIR, workflowId);
    if (!(await fileExists(base)))
        return { status: "not_found", workflowId };
    if (runId) {
        const sp = path.join(base, runId, "state.snapshot.json");
        if (!(await fileExists(sp)))
            return { status: "not_found", workflowId, runId };
        return { status: "pass", workflowId, runId, state: JSON.parse(await readFile(sp, "utf8")) };
    }
    const runs = (await readdir(base)).sort().reverse();
    if (runs.length === 0)
        return { status: "no_runs", workflowId };
    const latest = runs[0];
    const state = JSON.parse(await readFile(path.join(base, latest, "state.snapshot.json"), "utf8"));
    return { status: "pass", workflowId, runId: latest, state };
}
export async function workflowHistory({ target, workflowId }) {
    const base = path.join(target, RUNS_DIR, workflowId);
    if (!(await fileExists(base)))
        return { status: "pass", workflowId, runs: [] };
    const history = [];
    for (const runId of (await readdir(base)).sort().reverse()) {
        try {
            const s = JSON.parse(await readFile(path.join(base, runId, "state.snapshot.json"), "utf8"));
            history.push({ runId, status: s.status, startTime: s.startTime, error: s.error });
        }
        catch {
            history.push({ runId, status: "corrupted" });
        }
    }
    return { status: "pass", workflowId, runs: history };
}
export async function workflowLogs({ target, workflowId, runId }) {
    const ep = path.join(target, RUNS_DIR, workflowId, runId, "events.jsonl");
    if (!(await fileExists(ep)))
        return { status: "not_found", workflowId, runId };
    const entries = (await readFile(ep, "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return { status: "pass", workflowId, runId, events: entries };
}
export async function workflowClean({ target }) {
    const runsRoot = path.join(target, RUNS_DIR);
    if (await fileExists(runsRoot)) {
        const { rm } = await import("node:fs/promises");
        await rm(runsRoot, { recursive: true, force: true });
        await mkdir(runsRoot, { recursive: true });
    }
    return { status: "pass" };
}
export async function workflowInstall({ root, target, pluginId }) {
    const plugins = await loadPlugins(root);
    const plugin = plugins.get(pluginId);
    if (!plugin)
        throw new PlatformError(`plugin not found: ${pluginId}`, { code: "AI_ENGINEERING_UNKNOWN_PLUGIN" });
    const assets = plugin.assets?.workflows ?? [];
    if (assets.length === 0)
        return { status: "pass", pluginId, installed: [] };
    await mkdir(path.join(target, DEFINITIONS_DIR), { recursive: true });
    const installed = [];
    for (const wfAsset of assets) {
        const src = path.join(root, "plugins", pluginId, wfAsset);
        if (await fileExists(src)) {
            const wfId = path.basename(wfAsset, ".yaml");
            const content = await readFile(src, "utf8");
            const dest = path.join(target, DEFINITIONS_DIR, `${wfId}.yaml`);
            await mkdir(path.dirname(dest), { recursive: true });
            await writeFile(dest, content, "utf8");
            installed.push(wfId);
        }
    }
    return { status: "pass", pluginId, installed };
}
export const WORKFLOW_HELP = `Workflow commands:

  aie workflow init                        Create workflow directory structure
  aie workflow list                        List workflow definitions (project + global)
  aie workflow validate                    Validate workflow definitions
  aie workflow build <id>                  Generate deterministic step instructions
  aie workflow run <id>                    Start workflow execution
  aie workflow status <id> [run]           Show run status
  aie workflow history <id>                Show run history
  aie workflow logs <id> <run>             Show run log events
  aie workflow clean                       Remove all run data (keeps definitions)
  aie workflow install <plugin>            Install workflow definitions from plugin
`;
