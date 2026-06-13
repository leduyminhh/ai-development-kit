import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function checksumText(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function sha256File(pathname) {
  return createHash("sha256").update(await readFile(pathname)).digest("hex");
}

export async function listFiles(root) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const pathname = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`symlink is not allowed: ${pathname}`);
      }
      if (entry.isDirectory()) {
        await visit(pathname);
      } else if (entry.isFile()) {
        files.push(path.relative(root, pathname).split(path.sep).join("/"));
      }
    }
  }
  await visit(root);
  return files.sort();
}

export function resolveInside(root, relativePath) {
  if (
    path.isAbsolute(relativePath) ||
    /^[A-Za-z]:[\\/]/.test(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  ) {
    throw new Error(`path resolves outside root: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`path resolves outside root: ${relativePath}`);
  }
  return resolved;
}

export async function writeJsonAtomic(pathname, value) {
  await mkdir(path.dirname(pathname), { recursive: true });
  const temporary = `${pathname}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rm(pathname, { force: true });
  await rename(temporary, pathname);
}

export async function replaceDirectoryAtomic(staged, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await rename(staged, destination);
}
