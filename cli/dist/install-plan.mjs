import { planTransaction } from "./transaction.mjs";
function providerForPath(projections, relativePath) {
    for (const [provider, projection] of Object.entries(projections)) {
        if (projection.assets.some((asset) => relativePath === asset.destinationPath ||
            relativePath.startsWith(`${asset.destinationPath}/`)) ||
            projection.instructions.some((item) => item.destinationPath === relativePath) ||
            projection.mcpConfig?.destinationPath === relativePath) {
            return provider;
        }
    }
    return "runtime";
}
export async function buildInstallPlan({ prepared, context, force = false, }) {
    const transaction = await planTransaction({
        target: context.targetRoot,
        desiredFiles: prepared.desiredFiles,
        lock: prepared.lock,
        ownership: prepared.ownership,
        force,
    });
    const actionByPath = new Map(transaction.actions.map((item) => [item.relativePath, item.action]));
    const managedFiles = [];
    const managedMerges = [];
    for (const [relativePath, metadata] of Object.entries(prepared.ownership.files)) {
        const item = {
            provider: providerForPath(prepared.projections, relativePath),
            path: relativePath,
            operation: actionByPath.get(relativePath) ?? "unchanged",
            assetType: metadata.assetType,
            assetId: metadata.assetId,
        };
        if (metadata.mergeStrategy) {
            managedMerges.push({
                provider: item.provider,
                path: relativePath,
                kind: metadata.mergeStrategy,
            });
        }
        else {
            managedFiles.push(item);
        }
    }
    const compare = (left, right) => left.provider.localeCompare(right.provider) ||
        left.path.localeCompare(right.path);
    managedFiles.sort(compare);
    managedMerges.sort(compare);
    return {
        rootPlugins: prepared.graph.rootPlugins,
        requiredPlugins: prepared.graph.requiredPlugins,
        optionalPlugins: prepared.graph.optionalPlugins,
        providers: prepared.providers,
        scope: context.scope,
        targetRoot: context.targetRoot,
        runtime: {
            mcpServers: Object.keys(prepared.mcpServers).sort(),
        },
        managedFiles,
        managedMerges,
        conflicts: [],
        backups: [...transaction.backupRelativePaths].sort(),
    };
}
export function renderInstallPlan(plan) {
    const lines = [
        `Providers: ${plan.providers.join(", ")}`,
        `Scope: ${plan.scope}`,
        `Target: ${plan.targetRoot}`,
        `Root plugins: ${plan.rootPlugins.join(", ")}`,
        `Required plugins: ${plan.requiredPlugins.join(", ") || "none"}`,
        `Optional plugins: ${plan.optionalPlugins.join(", ") || "none"}`,
        `Managed files: ${plan.managedFiles.length}`,
        `Managed merges: ${plan.managedMerges.length}`,
    ];
    return `${lines.join("\n")}\n`;
}
