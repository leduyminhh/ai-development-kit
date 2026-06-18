import path from "node:path";
import { PlatformError } from "./errors.mjs";
const PROVIDERS = new Set(["codex", "claude", "cursor"]);
const SCOPES = new Set(["project", "global"]);
const OPERATIONS = new Set(["copy", "render"]);
function projectionError(message) {
    return new PlatformError(message, {
        code: "AI_ENGINEERING_INVALID_PROJECTION",
    });
}
export function assertContainedRelativePath(value, label) {
    if (typeof value !== "string" ||
        value.length === 0 ||
        path.isAbsolute(value) ||
        value.split(/[\\/]/).includes("..")) {
        throw projectionError(`${label} escapes target root: ${value}`);
    }
    return value.replaceAll("\\", "/");
}
function validateHeader(value) {
    if (value?.schemaVersion !== 1) {
        throw projectionError("projection schemaVersion must be 1");
    }
    if (!PROVIDERS.has(value.provider)) {
        throw projectionError(`unsupported projection provider ${value.provider}`);
    }
    if (!SCOPES.has(value.scope)) {
        throw projectionError(`unsupported projection scope ${value.scope}`);
    }
}
export function validateProjectionInput(input) {
    validateHeader(input);
    for (const collection of [
        input.plugins,
        input.skills,
        input.commands,
        input.agents,
        input.hooks,
    ]) {
        if (!Array.isArray(collection)) {
            throw projectionError("projection input collections must be arrays");
        }
    }
    return input;
}
export function validateProjectionPlan(plan) {
    validateHeader(plan);
    const destinations = new Set();
    for (const asset of plan.assets ?? []) {
        if (!OPERATIONS.has(asset.operation)) {
            throw projectionError(`projection ${plan.provider}/${plan.scope} has invalid operation ${asset.operation}`);
        }
        asset.destinationPath = assertContainedRelativePath(asset.destinationPath, `projection ${plan.provider}/${plan.scope}`);
        if (destinations.has(asset.destinationPath)) {
            throw projectionError(`projection ${plan.provider}/${plan.scope} contains duplicate destination ${asset.destinationPath}`);
        }
        destinations.add(asset.destinationPath);
        if (asset.operation === "copy") {
            assertContainedRelativePath(asset.sourcePath, `projection ${plan.provider}/${plan.scope} source`);
            if (Object.hasOwn(asset, "content")) {
                throw projectionError("copy projection asset cannot contain content");
            }
        }
        if (asset.operation === "render") {
            if (typeof asset.content !== "string") {
                throw projectionError("render projection asset requires content");
            }
            if (Object.hasOwn(asset, "sourcePath")) {
                throw projectionError("render projection asset cannot contain sourcePath");
            }
        }
        if (!asset.assetType || !asset.assetId) {
            throw projectionError("projection asset identity is required");
        }
        if (!Array.isArray(asset.owners) ||
            asset.owners.length === 0 ||
            JSON.stringify(asset.owners) !==
                JSON.stringify([...new Set(asset.owners)].sort())) {
            throw projectionError(`projection asset ${asset.assetId} owners must be sorted and unique`);
        }
        if (typeof asset.shared !== "boolean") {
            throw projectionError(`projection asset ${asset.assetId} shared must be boolean`);
        }
    }
    for (const instruction of plan.instructions ?? []) {
        assertContainedRelativePath(instruction.destinationPath, `projection ${plan.provider}/${plan.scope} instruction`);
        assertContainedRelativePath(instruction.templatePath, `projection ${plan.provider}/${plan.scope} instruction template`);
    }
    if (plan.mcpConfig) {
        assertContainedRelativePath(plan.mcpConfig.destinationPath, `projection ${plan.provider}/${plan.scope} MCP config`);
    }
    return plan;
}
