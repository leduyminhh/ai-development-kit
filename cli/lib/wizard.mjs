import { BACK, CANCEL } from "./prompt.mjs";

export async function runSteps(steps) {
  const state = {};
  let i = 0;
  while (i < steps.length) {
    const res = await steps[i].run(state);
    if (res === CANCEL) return null;
    if (res === BACK) { i = Math.max(i - 1, 0); continue; }
    state[steps[i].key] = res;
    i += 1;
  }
  return state;
}

const SCOPE_ITEMS = [
  { label: "project — workspace hiện tại", value: "project" },
  { label: "global — cấu hình toàn hệ thống", value: "global" },
];

export async function runWizard(action, deps) {
  const providerItems = deps.providers.map((p) => ({ label: p, value: p }));
  const pluginItems = deps.pluginIds.map((p) => ({ label: p, value: p }));

  if (action === "install") {
    const st = await runSteps([
      { key: "scope", run: () => deps.selectOne("Chọn scope cài đặt", SCOPE_ITEMS) },
      { key: "providers", run: () => deps.selectMany("Chọn provider", providerItems, { min: 1 }) },
      { key: "plugins", run: () => deps.selectMany("Chọn plugin", pluginItems, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận cài đặt", [
        `scope=${s.scope}`, `providers=${s.providers.join(", ")}`, `plugins=${s.plugins.join(", ")}`]) },
    ]);
    return (st && st.ok) ? { action, scope: st.scope, providers: st.providers, plugins: st.plugins } : null;
  }

  if (action === "uninstall") {
    const scope = await deps.selectOne("Chọn scope gỡ", SCOPE_ITEMS);
    if (scope === CANCEL || scope === BACK) return null;
    const installed = deps.readInstalled(scope);
    const installedProviders = [...new Set(installed.map((e) => e.provider))];
    if (installedProviders.length === 0) return { action, scope, providers: [], plugins: "all", empty: true };
    const items = installedProviders.map((p) => ({ label: p, value: p }));
    const st = await runSteps([
      { key: "providers", run: () => deps.selectMany("Chọn provider để gỡ", items, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận gỡ", [`scope=${scope}`, `providers=${s.providers.join(", ")}`]) },
    ]);
    return (st && st.ok) ? { action, scope, providers: st.providers, plugins: "all" } : null;
  }

  if (action === "build") {
    const st = await runSteps([
      { key: "providers", run: () => deps.selectMany("Chọn provider để build", providerItems, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận build", [`providers=${s.providers.join(", ")}`]) },
    ]);
    return (st && st.ok) ? { action, providers: st.providers } : null;
  }

  if (action === "check") {
    const st = await runSteps([{ key: "scope", run: () => deps.selectOne("Chọn scope kiểm tra", SCOPE_ITEMS) }]);
    return st ? { action, scope: st.scope } : null;
  }

  return null;
}
