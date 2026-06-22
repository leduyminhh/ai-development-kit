import assert from "node:assert/strict";
import test from "node:test";

import { renderChecklistStep, parseChecklistKey } from "../src/install-wizard.mjs";

test("renders plugin checklist with install all and recommendation reasons", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["application", "platform", "quality"],
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
    detected: [{ pluginId: "platform", reasons: ["baseline runtime"] }],
  });

  assert.match(output, /Plugins/);
  assert.match(output, /Install all plugins/);
  assert.match(output, /platform/);
  assert.match(output, /baseline runtime/);
});

test("parses checklist keys for toggle, submit, and movement", () => {
  assert.equal(parseChecklistKey(" "), "toggle");
  assert.equal(parseChecklistKey("\r"), "submit");
  assert.equal(parseChecklistKey("\n"), "submit");
  assert.equal(parseChecklistKey("j"), "down");
  assert.equal(parseChecklistKey("k"), "up");
  assert.equal(parseChecklistKey("a"), "all");
  assert.equal(parseChecklistKey("q"), "cancel");
});

test("renderChecklistStep highlights install all when active", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["quality"],
    selected: [],
    cursor: -1,
    allowAll: true,
    all: true,
  });

  assert.match(output, /\u203a.*\[x\] Install all plugins/);
});

test("parseChecklistKey fallback for escape and back keys", () => {
  assert.equal(parseChecklistKey("\u001b"), "cancel");
  assert.equal(parseChecklistKey("b"), "back");
  assert.equal(parseChecklistKey("x"), "ignore");
});
