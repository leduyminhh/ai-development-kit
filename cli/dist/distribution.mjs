import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { createPluginArchive } from "./archive.mjs";
import { writeJsonAtomic } from "./io.mjs";
export async function preparePluginDistribution({ pluginId, version, artifactRoot, npmRoot, releaseRoot, }) {
    const npmPackageRoot = path.join(npmRoot, pluginId);
    const npmArtifactRoot = path.join(npmPackageRoot, "artifact");
    await rm(npmPackageRoot, { recursive: true, force: true });
    await mkdir(npmPackageRoot, { recursive: true });
    await cp(artifactRoot, npmArtifactRoot, { recursive: true });
    await writeJsonAtomic(path.join(npmPackageRoot, "package.json"), {
        name: `@ai-engineering-platform/plugin-${pluginId}`,
        version,
        type: "module",
        files: ["artifact"],
        aiEngineering: {
            artifact: "./artifact/plugin.json",
        },
    });
    const githubArchive = path.join(releaseRoot, `ai-engineering-platform-${pluginId}-${version}.tgz`);
    await createPluginArchive({ source: artifactRoot, destination: githubArchive });
    return {
        npmPackageRoot,
        githubArchive,
    };
}
