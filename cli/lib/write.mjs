import fs from "node:fs";
import path from "node:path";

export function readIfExists(absPath) {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function copyDirRec(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRec(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function writeEntry(baseDir, entry, { root }) {
  const dest = path.join(baseDir, entry.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (typeof entry.content === "string") {
    fs.writeFileSync(dest, entry.content, "utf8");
    return { file: entry.path };
  }
  // copyDir: thử symlink trước, fallback copy
  const src = path.isAbsolute(entry.copyDir) ? entry.copyDir : path.join(root, entry.copyDir);
  fs.rmSync(dest, { recursive: true, force: true });
  try {
    fs.symlinkSync(path.resolve(src), dest, "junction");
    return { link: entry.path };
  } catch {
    copyDirRec(src, dest);
    return { file: entry.path };
  }
}

export function removeFileAndPruneEmpty(absPath, root) {
  try {
    fs.rmSync(absPath, { recursive: true, force: true });
  } catch { /* bỏ qua */ }
  let dir = path.dirname(absPath);
  const rootResolved = path.resolve(root);
  while (path.resolve(dir).startsWith(rootResolved) && path.resolve(dir) !== rootResolved) {
    try {
      if (fs.readdirSync(dir).length > 0) break;
      fs.rmdirSync(dir);
    } catch { break; }
    dir = path.dirname(dir);
  }
}
