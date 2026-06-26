import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateBuildArtifactManifest } from "../contracts/artifact.mjs";
import { generatePlatformLockfile } from "../lockfile/generate-lockfile.mjs";
import { resolvePlatform } from "../resolver/resolve-platform.mjs";
import { listArtifactFiles, sha256File } from "./list-artifact-files.mjs";
import { stagePlatformArtifact } from "./stage-platform-artifact.mjs";

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function buildChecksums(stagedRoot) {
  const files = {};
  for (const relative of await listArtifactFiles(stagedRoot)) {
    if (relative !== "artifact.json" && relative !== "checksums.json") {
      files[relative] = await sha256File(path.join(stagedRoot, relative));
    }
  }
  return { algorithm: "sha256", files };
}

export async function buildPlatformArtifact({ root, requested, optional = [], platformVersion, providers, outputRoot }) {
  const resolution = await resolvePlatform({ root, requested, optional, platformVersion, providers });
  const lockfile = generatePlatformLockfile(resolution);
  const artifactId = requested.slice().sort((left, right) => left.localeCompare(right)).join("+");
  const artifactPath = path.join(outputRoot, artifactId, platformVersion);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "platform-artifact-"));

  try {
    await stagePlatformArtifact({ root, resolution, stagedRoot: temporaryRoot });
    await writeJson(path.join(temporaryRoot, "lockfile.json"), lockfile);

    let checksums = await buildChecksums(temporaryRoot);
    const manifest = validateBuildArtifactManifest({
      apiVersion: "ai-engineering.dev/v1alpha1",
      kind: "PlatformBuildArtifact",
      id: artifactId,
      version: platformVersion,
      platformVersion,
      plugins: lockfile.plugins,
      files: Object.entries(checksums.files).map(([filePath, sha256]) => ({ path: filePath, sha256 })),
      checksums,
    });
    await writeJson(path.join(temporaryRoot, "artifact.json"), manifest);

    checksums = await buildChecksums(temporaryRoot);
    await writeJson(path.join(temporaryRoot, "checksums.json"), checksums);
    const finalFiles = Object.entries(checksums.files).map(([filePath, sha256]) => ({ path: filePath, sha256 }));
    finalFiles.push({ path: "artifact.json", sha256: await sha256File(path.join(temporaryRoot, "artifact.json")) });
    finalFiles.push({ path: "checksums.json", sha256: await sha256File(path.join(temporaryRoot, "checksums.json")) });
    const finalManifest = validateBuildArtifactManifest({
      ...manifest,
      files: finalFiles.sort((left, right) => left.path.localeCompare(right.path)),
      checksums,
    });
    await writeJson(path.join(temporaryRoot, "artifact.json"), finalManifest);

    await rm(artifactPath, { recursive: true, force: true });
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await import("node:fs/promises").then(({ cp }) => cp(temporaryRoot, artifactPath, { recursive: true }));
    return { id: artifactId, version: platformVersion, path: artifactPath, manifest: finalManifest };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

