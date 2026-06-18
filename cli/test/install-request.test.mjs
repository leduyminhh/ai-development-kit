import assert from "node:assert/strict";
import test from "node:test";

import {
  finalizeNonInteractiveDraft,
  parseInstallRequest,
} from "../src/install-request.mjs";

test("locks positional plugins and explicit flags", () => {
  const draft = parseInstallRequest([
    "application",
    "--target",
    "codex,claude",
    "--with",
    "quality",
    "--scope",
    "global",
  ]);

  assert.deepEqual(draft.rootPlugins, {
    value: ["application"],
    source: "explicit",
    locked: true,
  });
  assert.deepEqual(draft.providers.value, ["claude", "codex"]);
  assert.equal(draft.providers.locked, true);
  assert.deepEqual(draft.optionalPlugins.value, ["quality"]);
  assert.equal(draft.scope.value, "global");
});

test("keeps deterministic defaults editable", () => {
  const draft = parseInstallRequest([]);
  assert.deepEqual(draft.optionalPlugins, {
    value: [],
    source: "default",
    locked: false,
  });
  assert.deepEqual(draft.scope, {
    value: "project",
    source: "default",
    locked: false,
  });
});

test("rejects positional plugins combined with --all", () => {
  assert.throws(
    () => parseInstallRequest(["application", "--all"]),
    /--all cannot be combined with positional plugins/,
  );
});

test("--yes requires explicit providers and accepts deterministic defaults", () => {
  assert.throws(
    () =>
      finalizeNonInteractiveDraft(
        parseInstallRequest(["application", "--yes"]),
      ),
    /Missing install choices in non-interactive mode: providers/,
  );
  const intent = finalizeNonInteractiveDraft(
    parseInstallRequest([
      "application",
      "--target",
      "codex",
      "--yes",
    ]),
  );
  assert.equal(intent.scope, "project");
  assert.deepEqual(intent.optionalPlugins, []);
});
