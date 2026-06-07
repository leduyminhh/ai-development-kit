import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createPluginArchive, extractPluginArchive } from "../src/archive.mjs";
import { resolveInside } from "../src/io.mjs";

test("rejects paths outside the approved root", () => {
  const root = path.resolve("safe-root");
  assert.throws(() => resolveInside(root, "../escape"), /outside root/);
  assert.throws(() => resolveInside(root, "/absolute"), /outside root/);
  assert.throws(() => resolveInside(root, "C:\\escape"), /outside root/);
  assert.equal(resolveInside(root, "plugins/backend").startsWith(root), true);
});

test("round-trips a plugin archive through safe extraction", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aiep-archive-"));
  try {
    const source = path.join(root, "source");
    const destination = path.join(root, "destination");
    await mkdir(source);
    await writeFile(path.join(source, "plugin.json"), '{"id":"backend"}\n');
    const archive = path.join(root, "backend.tgz");

    await createPluginArchive({ source, destination: archive });
    await extractPluginArchive({ archive, destination });

    assert.equal(
      await readFile(path.join(destination, "plugin.json"), "utf8"),
      '{"id":"backend"}\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
