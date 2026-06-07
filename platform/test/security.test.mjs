import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveInside } from "../src/io.mjs";

test("rejects paths outside the approved root", () => {
  const root = path.resolve("safe-root");
  assert.throws(() => resolveInside(root, "../escape"), /outside root/);
  assert.throws(() => resolveInside(root, "/absolute"), /outside root/);
  assert.throws(() => resolveInside(root, "C:\\escape"), /outside root/);
  assert.equal(resolveInside(root, "plugins/backend").startsWith(root), true);
});
