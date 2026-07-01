import { test } from "node:test";
import assert from "node:assert/strict";
import { keyToAction, reduceMany, selectMany, BACK } from "../lib/prompt.mjs";

test("keyToAction ánh xạ phím", () => {
  assert.equal(keyToAction("up", {}), "up");
  assert.equal(keyToAction("k", {}), "up");
  assert.equal(keyToAction("space", {}), "toggle");
  assert.equal(keyToAction("a", {}), "all");
  assert.equal(keyToAction("return", {}), "confirm");
  assert.equal(keyToAction("b", {}), "back");
  assert.equal(keyToAction("q", {}), "quit");
  assert.equal(keyToAction("c", { ctrl: true }), "quit");
});

test("reduceMany toggle và di chuyển cursor", () => {
  let s = { cursor: 0, selected: new Set() };
  s = reduceMany(s, "toggle", { count: 3, min: 1 });
  assert.ok(s.selected.has(0));
  s = reduceMany(s, "down", { count: 3, min: 1 });
  assert.equal(s.cursor, 1);
});

test("reduceMany confirm bị chặn khi dưới min", () => {
  const s = { cursor: 0, selected: new Set() };
  const r = reduceMany(s, "confirm", { count: 3, min: 1 });
  assert.notEqual(r.done, true);
});

test("selectMany với readKey giả trả về lựa chọn", async () => {
  const keys = [{ name: "space" }, { name: "return" }]; // chọn item 0 rồi confirm
  let i = 0;
  const deps = { readKey: async () => keys[i++], write: () => {} };
  const items = [{ label: "A", value: "a" }, { label: "B", value: "b" }];
  const out = await selectMany("Chọn", items, { min: 1 }, deps);
  assert.deepEqual(out, ["a"]);
});
