import readline from "node:readline";

export const BACK = Symbol("BACK");
export const CANCEL = Symbol("CANCEL");

export function keyToAction(name, { ctrl = false } = {}) {
  if (ctrl && name === "c") return "quit";
  switch (name) {
    case "up": case "k": return "up";
    case "down": case "j": return "down";
    case "space": return "toggle";
    case "a": return "all";
    case "return": case "enter": return "confirm";
    case "b": return "back";
    case "q": case "escape": return "quit";
    default: return null;
  }
}

export function reduceMany(state, action, { count, min }) {
  const cursor = state.cursor ?? 0;
  const selected = new Set(state.selected ?? []);
  switch (action) {
    case "up": return { cursor: (cursor - 1 + count) % count, selected };
    case "down": return { cursor: (cursor + 1) % count, selected };
    case "toggle":
      if (selected.has(cursor)) selected.delete(cursor); else selected.add(cursor);
      return { cursor, selected };
    case "all":
      if (selected.size === count) return { cursor, selected: new Set() };
      return { cursor, selected: new Set(Array.from({ length: count }, (_, i) => i)) };
    case "confirm":
      if (selected.size < min) return { cursor, selected, min: true };
      return { cursor, selected, done: true };
    default: return { cursor, selected };
  }
}

// ==== wrapper I/O (deps injectable: { readKey, write }) ====
function defaultDeps() {
  return {
    write: (s) => process.stdout.write(s),
    readKey: () =>
      new Promise((resolve) => {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        const onKey = (_str, key) => {
          process.stdin.off("keypress", onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          resolve(key.ctrl ? "c" : key.name);
        };
        process.stdin.on("keypress", onKey);
      }),
  };
}

export async function selectMany(title, items, { min = 1 } = {}, deps = defaultDeps()) {
  let state = { cursor: 0, selected: new Set() };
  for (;;) {
    deps.write(`\n${title}\n`);
    items.forEach((it, i) => {
      const mark = state.selected.has(i) ? "[x]" : "[ ]";
      const point = i === state.cursor ? ">" : " ";
      deps.write(`${point} ${mark} ${it.label}\n`);
    });
    const name = await deps.readKey();
    const action = keyToAction(name, {});
    if (action === "quit") return CANCEL;
    if (action === "back") return BACK;
    const next = reduceMany(state, action, { count: items.length, min });
    if (next.done) return [...next.selected].sort((a, b) => a - b).map((i) => items[i].value);
    state = { cursor: next.cursor, selected: next.selected };
  }
}

export async function selectOne(title, items, deps = defaultDeps()) {
  let cursor = 0;
  for (;;) {
    deps.write(`\n${title}\n`);
    items.forEach((it, i) => deps.write(`${i === cursor ? ">" : " "} ${it.label}\n`));
    const action = keyToAction(await deps.readKey(), {});
    if (action === "quit") return CANCEL;
    if (action === "back") return BACK;
    if (action === "up") cursor = (cursor - 1 + items.length) % items.length;
    if (action === "down") cursor = (cursor + 1) % items.length;
    if (action === "confirm") return items[cursor].value;
  }
}

export async function confirmStep(title, lines = [], deps = defaultDeps()) {
  const items = [{ label: "Xác nhận & chạy", value: true }, { label: "Quay lại sửa", value: BACK }];
  deps.write(`\n${title}\n${lines.map((l) => `  ${l}`).join("\n")}\n`);
  return selectOne("", items, deps);
}
