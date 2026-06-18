import { access, appendFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
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
    return yaml.load(content);
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
    const wf = await loadWorkflow(target, workflowId);
    const errs = validateWorkflowDefinition(wf);
    if (errs.length > 0)
        return { status: "fail", workflowId, errors: errs, instructions: null };
    return { status: "pass", workflowId, errors: [], instructions: generateInstructions(wf) };
}
export async function workflowRun({ target, workflowId, context = {} }) {
    const wf = await loadWorkflow(target, workflowId);
    const errs = validateWorkflowDefinition(wf);
    if (errs.length > 0)
        return { status: "fail", workflowId, errors: errs, instructions: null };
    const ts = new Date().toISOString().replace(/[:.]/g, "");
    const runDir = path.join(target, RUNS_DIR, workflowId, ts);
    await mkdir(path.join(runDir, "steps"), { recursive: true });
    await writeJsonAtomic(path.join(runDir, "state.snapshot.json"), {
        workflowId, runId: ts, startTime: new Date().toISOString(),
        status: "running", context, stepResults: {}, currentStep: null, error: null,
    });
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), type: "start", data: { workflowId, context } }) + "\n";
    await appendFile(path.join(runDir, "events.jsonl"), entry, "utf8");
    return { status: "pass", workflowId, runId: ts, runDir, instructions: generateInstructions(wf) };
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
