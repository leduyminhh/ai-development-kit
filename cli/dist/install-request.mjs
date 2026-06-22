import { PlatformError } from "./errors.mjs";
function field(value, source = "default") {
    return {
        value,
        source,
        locked: source === "explicit",
    };
}
function list(value) {
    return [...new Set((value ?? "").split(",").filter(Boolean))].sort();
}
function argumentError(message) {
    return new PlatformError(message, {
        code: "AI_ENGINEERING_INVALID_INSTALL_REQUEST",
        exitCode: 2,
    });
}
export function parseInstallRequest(args) {
    const positional = [];
    let providers;
    let optionalPlugins;
    let scope;
    let all = false;
    let yes = false;
    let force = false;
    let json = false;
    for (let index = 0; index < args.length; index += 1) {
        const item = args[index];
        if (item === "--target" || item === "--provider") {
            providers = list(args[++index]);
            continue;
        }
        if (item === "--with") {
            optionalPlugins = list(args[++index]);
            continue;
        }
        if (item === "--scope") {
            scope = args[++index];
            continue;
        }
        if (item === "-g" || item === "--global") {
            scope = "global";
            continue;
        }
        if (item === "--all") {
            all = true;
            continue;
        }
        if (item === "--yes") {
            yes = true;
            continue;
        }
        if (item === "--force") {
            force = true;
            continue;
        }
        if (item === "--json") {
            json = true;
            continue;
        }
        if (item.startsWith("--"))
            continue;
        positional.push(item.split("@")[0]);
    }
    if (all && positional.length > 0) {
        throw argumentError("--all cannot be combined with positional plugins");
    }
    if (scope && !["project", "global"].includes(scope)) {
        throw argumentError("scope must be project or global");
    }
    return {
        rootPlugins: field([...new Set(positional)].sort(), positional.length > 0 || all ? "explicit" : "default"),
        all: field(all, all ? "explicit" : "default"),
        providers: field(providers ?? [], providers ? "explicit" : "default"),
        optionalPlugins: field(optionalPlugins ?? [], optionalPlugins ? "explicit" : "default"),
        scope: field(scope ?? "project", scope ? "explicit" : "default"),
        confirm: field(yes, yes ? "explicit" : "default"),
        force,
        json,
    };
}
export function applyDetectedProviders(draft, providers) {
    if (draft.providers.locked)
        return draft;
    return {
        ...draft,
        providers: field([...new Set(providers)].sort(), "detected"),
    };
}
export function toInstallIntent(draft) {
    return {
        rootPlugins: draft.rootPlugins.value,
        all: draft.all.value,
        providers: draft.providers.value,
        optionalPlugins: draft.optionalPlugins.value,
        scope: draft.scope.value,
        force: draft.force,
    };
}
export function finalizeNonInteractiveDraft(draft) {
    const missing = [];
    if (!draft.all.value && draft.rootPlugins.value.length === 0) {
        missing.push("rootPlugins");
    }
    if (draft.providers.source !== "explicit" ||
        draft.providers.value.length === 0) {
        missing.push("providers");
    }
    if (missing.length > 0) {
        throw argumentError(`Missing install choices in non-interactive mode: ${missing.join(", ")}.\n` +
            "Pass --target codex,claude,cursor,antigravity and --yes, or run in an interactive terminal.");
    }
    return toInstallIntent(draft);
}
