import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateBuildArtifactManifest } from "../contracts/artifact.mjs";
import { assertCondition, PLATFORM_ERROR_CODES } from "../errors/platform-error.mjs";
import { listArtifactFiles, sha256File } from "./list-artifact-files.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function verifyPlatformArtifact({ artifactRoot }) {
  const manifest = validateBuildArtifactManifest(await readJson(path.join(artifactRoot, "artifact.json")));
  const checksums = await readJson(path.join(artifactRoot, "checksums.json"));
  assertCondition(checksums.algorithm === "sha256", "artifact checksums algorithm must be sha256", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });

  const files = (await listArtifactFiles(artifactRoot)).filter((relative) => relative !== "artifact.json" && relative !== "checksums.json");
  for (const relative of files) {
    const expected = checksums.files[relative];
    assertCondition(typeof expected === "string", `missing checksum for ${relative}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
    });
    const actual = await sha256File(path.join(artifactRoot, relative));
    assertCondition(actual === expected, `checksum mismatch for ${relative}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
    });
  }

  return { status: "pass", manifest, fileCount: files.length };
}

