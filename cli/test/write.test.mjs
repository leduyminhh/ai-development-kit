import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeEntry, removeFileAndPruneEmpty, readIfExists } from "../lib/write.mjs";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aie-write-"));
}

test("writeEntry ghi content ra đúng path tương đối", () => {
  const dir = tmp();
  const res = writeEntry(dir, { path: "a/b.txt", content: "hi" }, { root: dir });
  assert.equal(res.file, "a/b.txt");
  assert.equal(fs.readFileSync(path.join(dir, "a/b.txt"), "utf8"), "hi");
});

test("writeEntry copyDir sao chép cây thư mục (kể cả khi symlink không được)", () => {
  const dir = tmp();
  const src = path.join(dir, "src");
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, "f.txt"), "x");
  const res = writeEntry(dir, { path: "dst", copyDir: "src" }, { root: dir });
  const dst = path.join(dir, "dst");
  assert.ok(fs.existsSync(dst));
  assert.ok(res.file === "dst" || res.link === "dst");
  // Nội dung tồn tại dù là symlink hay copy
  assert.equal(fs.readFileSync(path.join(dst, "f.txt"), "utf8"), "x");
});

test("removeFileAndPruneEmpty xoá file và thư mục rỗng", () => {
  const dir = tmp();
  const f = path.join(dir, "x/y/z.txt");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, "1");
  removeFileAndPruneEmpty(f, dir);
  assert.equal(fs.existsSync(f), false);
  assert.equal(fs.existsSync(path.join(dir, "x")), false);
});

test("readIfExists trả null khi thiếu file", () => {
  assert.equal(readIfExists(path.join(tmp(), "none")), null);
});
