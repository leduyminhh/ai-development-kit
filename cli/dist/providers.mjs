import { validateProjectionInput, validateProjectionPlan, } from "./projection-contracts.mjs";
import { PlatformError } from "./errors.mjs";
import { SUPPORTED_PROVIDERS } from "./provider-list.mjs";
const adapterUrl = (provider) => new URL(`../../adapters/${provider}/projector.mjs`, import.meta.url).href;
const dynamicImport = new Function("specifier", "return import(specifier)");
const projectorEntries = await Promise.all(SUPPORTED_PROVIDERS.map(async (provider) => {
    const { project } = await dynamicImport(adapterUrl(provider));
    return [provider, project];
}));
const PROJECTORS = Object.fromEntries(projectorEntries);
export function projectProvider(input) {
    const projector = PROJECTORS[input.provider];
    if (!projector) {
        throw new PlatformError(`unsupported provider ${input.provider}`, {
            code: "AI_ENGINEERING_INCOMPATIBLE",
        });
    }
    return validateProjectionPlan(projector(validateProjectionInput(input)));
}
function legacyInput(context, provider) {
    const pluginIds = context.plugin?.metadata?.id
        ? [context.plugin.metadata.id]
        : ["platform"];
    return {
        schemaVersion: 1,
        provider,
        scope: context.scope ?? "project",
        plugins: pluginIds.map((id) => ({
            id,
            version: context.plugin?.metadata?.version ?? "1.0.0",
        })),
        skills: (context.skills ?? []).map((id) => ({
            id,
            sourcePath: `plugins/platform/skills/${id}`,
            owners: pluginIds,
        })),
        commands: (context.commands ?? []).map((command) => ({
            ...command,
            pluginId: command.pluginId ?? command.id.split(".")[0],
            owners: command.owners ?? pluginIds,
        })),
        agents: (context.agents ?? []).map((id) => ({
            id,
            sourcePath: `adapters/codex/agents/${id}.toml`,
            owners: pluginIds,
        })),
        hooks: (context.hooks ?? []).map((id) => ({
            id,
            owners: pluginIds,
        })),
        workflows: [],
        mcpServers: context.mcpServers ?? {},
    };
}
function legacyProjection(plan, input) {
    const files = plan.assets
        .filter((asset) => asset.operation === "render")
        .map((asset) => ({
        path: asset.destinationPath,
        content: asset.content,
    }));
    const commandAsset = plan.assets.find((asset) => asset.assetType === "command");
    const workflowAsset = plan.assets.find((asset) => asset.assetType === "command-catalog");
    return {
        manifest: JSON.parse(plan.assets.find((asset) => asset.assetType === "provider-manifest")
            ?.content ?? "{}"),
        workflow: workflowAsset?.content ?? "",
        command: commandAsset?.content ?? "",
        rule: commandAsset?.content ?? "",
        intent: input.commands[0]?.intent ?? "",
        files,
        mcpConfig: {
            provider: plan.provider,
            format: plan.mcpConfig.format,
            path: plan.mcpConfig.destinationPath,
            servers: plan.mcpConfig.servers,
        },
    };
}
function projectLegacy(context, provider) {
    const input = legacyInput(context, provider);
    return legacyProjection(projectProvider(input), input);
}
export function projectCodex(context) {
    return projectLegacy(context, "codex");
}
export function projectClaude(context) {
    return projectLegacy(context, "claude");
}
export function projectCursor(context) {
    return projectLegacy(context, "cursor");
}
export function projectAntigravity(context) {
    return projectLegacy(context, "antigravity");
}
export function projectProviders(input) {
    if (Array.isArray(input)) {
        return Object.fromEntries(input.map((item) => [item.provider, projectProvider(item)]));
    }
    return {
        antigravity: projectAntigravity(input),
        claude: projectClaude(input),
        codex: projectCodex(input),
        cursor: projectCursor(input),
    };
}
