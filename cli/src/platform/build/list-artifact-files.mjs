import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function listArtifactFiles(root, current = "") {
  const directory = path.join(root, current);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listArtifactFiles(root, relative));
    } else if (entry.isFile()) {
      files.push(relative.replaceAll(path.sep, "/"));
    }
  }

  return files;
}

export async function sha256File(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}
