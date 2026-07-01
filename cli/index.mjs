#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROVIDERS, isProvider } from "./lib/paths.mjs";
import { knownPluginIds } from "./lib/plugins.mjs";
import { runBuild } from "./build.mjs";
import { install, uninstall, check, readManifest } from "./lib/install.mjs";
import { runWizard } from "./lib/wizard.mjs";
import { selectOne, selectMany, confirmStep } from "./lib/prompt.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(argv) {
  const a = { _: [], scope: "project", providers: null, plugins: null, explicit: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "-g" || v === "--global") a.scope = "global";
    else if (v === "--yes" || v === "-y") a.yes = true;
    else if (v === "--provider" || v === "--target") {
      const val = argv[++i];
      if (!val) throw new Error(`Thiếu giá trị cho ${v}`);
      a.providers = val.split(","); a.explicit = true;
    } else if (v === "--plugin") {
      const val = argv[++i];
      if (!val) throw new Error(`Thiếu giá trị cho ${v}`);
      a.plugins = val.split(","); a.explicit = true;
    }
    else a._.push(v);
  }
  return a;
}

const HELP = `aie — AI Engineering Platform CLI

Cách dùng:
  aie                      Mở menu wizard (install | uninstall | build | check)
  aie install   [--provider all|<p>...] [--plugin all|<id>...] [-g] [--yes]
  aie uninstall [--provider ...] [--plugin ...] [-g] [--yes]
  aie build     [--provider all|<p>...] [--plugin all|<id>...]
  aie check     [-g]
  aie list                 Liệt kê provider + plugin
  aie --help

Provider: ${PROVIDERS.join(", ")}
`;

function report(out, streams) {
  streams.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

export async function run(argv, streams = { stdout: process.stdout, stderr: process.stderr }) {
  const args = parseArgs(argv);
  const cmd = args._[0];

  if (args._.includes("--help") || cmd === "help" || cmd === "--help") {
    streams.stdout.write(HELP);
    return 0;
  }

  if (cmd === "list") {
    report({ providers: PROVIDERS, plugins: knownPluginIds(REPO_ROOT) }, streams);
    return 0;
  }

  const deps = {
    selectOne, selectMany, confirmStep,
    providers: PROVIDERS,
    pluginIds: knownPluginIds(REPO_ROOT),
    readInstalled: (s) => readManifest(s).installs,
  };

  // Menu tổng khi không có lệnh
  if (!cmd) {
    const pick = await selectOne("Chọn hành động", [
      { label: "install — cài đặt", value: "install" },
      { label: "uninstall — gỡ", value: "uninstall" },
      { label: "build — dựng đầu ra", value: "build" },
      { label: "check — kiểm tra", value: "check" },
    ]);
    if (typeof pick !== "string") return 0;
    return dispatchInteractive(pick, deps, streams);
  }

  const known = new Set(["install", "uninstall", "remove", "build", "check"]);
  const action = cmd === "remove" ? "uninstall" : cmd;
  if (!known.has(cmd)) { streams.stderr.write(`Lệnh không hỗ trợ: ${cmd}\n${HELP}`); return 1; }

  // Interactive nếu TTY và không truyền cờ chọn rõ ràng và không --yes
  const interactive = !args.explicit && !args.yes && Boolean(process.stdin.isTTY) &&
    (action === "install" || action === "uninstall" || action === "build" || action === "check");
  if (interactive) return dispatchInteractive(action, deps, streams);

  // Non-interactive
  if (action === "build") {
    const providers = normalizeProviders(args.providers);
    report(runBuild({ root: REPO_ROOT, providers, pluginIds: args.plugins ?? "all" }), streams);
    return 0;
  }
  if (action === "check") { report(check({ scope: args.scope }), streams); return 0; }
  if (action === "install") {
    if (!args.providers || !args.plugins) { streams.stderr.write("Cần --provider và --plugin ở chế độ non-interactive.\n"); return 1; }
    report(install({ root: REPO_ROOT, providers: normalizeProviders(args.providers), plugins: args.plugins, scope: args.scope }), streams);
    return 0;
  }
  if (action === "uninstall") {
    report(uninstall({ root: REPO_ROOT, providers: normalizeProviders(args.providers), plugins: args.plugins ?? "all", scope: args.scope }), streams);
    return 0;
  }
  return 0;
}

function normalizeProviders(sel) {
  if (!sel || (sel.length === 1 && sel[0] === "all")) return PROVIDERS;
  const bad = sel.filter((p) => !isProvider(p));
  if (bad.length) throw new Error(`Provider không hỗ trợ: ${bad.join(", ")}`);
  return sel;
}

async function dispatchInteractive(action, deps, streams) {
  const answer = await runWizard(action, deps);
  if (!answer) { streams.stdout.write("Đã huỷ.\n"); return 0; }
  // Graceful empty uninstall — wizard returned empty:true when nothing is installed
  if (answer.empty) {
    streams.stdout.write("Chưa có gì được cài ở scope này.\n");
    return 0;
  }
  if (action === "install") report(install({ root: REPO_ROOT, providers: answer.providers, plugins: answer.plugins, scope: answer.scope }), streams);
  else if (action === "uninstall") report(uninstall({ root: REPO_ROOT, providers: answer.providers, plugins: answer.plugins, scope: answer.scope }), streams);
  else if (action === "build") report(runBuild({ root: REPO_ROOT, providers: answer.providers, pluginIds: "all" }), streams);
  else if (action === "check") report(check({ scope: answer.scope }), streams);
  return 0;
}

// Auto-run khi gọi trực tiếp
const isMain = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` ||
  process.argv[1].endsWith("index.mjs")
);
if (isMain) {
  run(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}
