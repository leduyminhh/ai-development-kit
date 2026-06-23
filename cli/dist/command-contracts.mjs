import { readFile } from "node:fs/promises";
import path from "node:path";
import { PlatformError } from "./errors.mjs";
const FRONTMATTER_KEYS = new Set([
    "id",
    "slug",
    "description",
    "version",
    "outputSchema",
]);
const REQUIRED_SECTIONS = [
    "Intent",
    "Inputs",
    "Required Skills",
    "Steps",
    "Output Contract",
];
function commandError(message) {
    return new PlatformError(message, {
        code: "AI_ENGINEERING_INVALID_COMMAND",
    });
}
function parseFrontmatter(markdown, sourcePath) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) {
        throw commandError(`command ${sourcePath} has invalid frontmatter`);
    }
    const metadata = {};
    for (const line of match[1].split(/\r?\n/).filter(Boolean)) {
        const separator = line.indexOf(":");
        if (separator <= 0) {
            throw commandError(`command ${sourcePath} has invalid frontmatter`);
        }
        const key = line.slice(0, separator).trim();
        if (!FRONTMATTER_KEYS.has(key)) {
            throw commandError(`command ${sourcePath} has unknown frontmatter key ${key}`);
        }
        metadata[key] = line.slice(separator + 1).trim();
    }
    return { metadata, body: markdown.slice(match[0].length) };
}
function sectionText(markdown, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = markdown.match(new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
    return match?.[1].trim() ?? "";
}
function sectionList(markdown, heading) {
    return [...sectionText(markdown, heading).matchAll(/^- (.+)$/gm)].map((item) => item[1].trim());
}
function relativeSourcePath(sourcePath, repositoryRoot) {
    if (!repositoryRoot) {
        const normalized = sourcePath.replaceAll("\\", "/");
        const marker = normalized.lastIndexOf("/plugins/");
        return marker >= 0 ? normalized.slice(marker + 1) : normalized;
    }
    return path.relative(repositoryRoot, sourcePath).replaceAll("\\", "/");
}
export function validateCanonicalCommand(command, { knownSkills = new Set(), validateReferences = false, } = {}) {
    const errors = [];
    const label = command.id ?? command.sourcePath ?? "unknown";
    if (!/^[a-z0-9-]+\.[a-z0-9_]+$/.test(command.id ?? "")) {
        errors.push(`command ${label} id must be namespaced`);
    }
    else if (command.id.split(".")[0] !== command.pluginId) {
        errors.push(`command ${label} namespace must match plugin ${command.pluginId}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(command.slug ?? "")) {
        errors.push(`command ${label} slug must use kebab-case`);
    }
    const expectedSlug = path.basename(command.absoluteSourcePath ?? command.sourcePath, ".md");
    if (command.slug !== expectedSlug) {
        errors.push(`command ${label} slug must match ${expectedSlug}.md`);
    }
    if (!command.description?.trim()) {
        errors.push(`command ${label} description is required`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(command.version ?? "")) {
        errors.push(`command ${label} version must use semantic version`);
    }
    else if (command.pluginVersion &&
        command.version !== command.pluginVersion) {
        errors.push(`command ${label} version must match plugin version ${command.pluginVersion}`);
    }
    for (const [field, value] of [
        ["intent", command.intent],
        ["inputs", command.inputs],
        ["requiredSkills", command.requiredSkills],
        ["steps", command.steps],
        ["outputContract", command.outputContract],
    ]) {
        if (!value || value.length === 0) {
            errors.push(`command ${label} has empty ${field}`);
        }
    }
    if (validateReferences) {
        for (const skill of command.requiredSkills ?? []) {
            if (!knownSkills.has(skill)) {
                errors.push(`command ${label} references unknown skill ${skill}`);
            }
        }
    }
    return errors;
}
export async function loadCanonicalCommand(input) {
    const options = typeof input === "string"
        ? {
            sourcePath: input,
            pluginId: path.basename(path.dirname(path.dirname(input))),
        }
        : input;
    const { sourcePath, pluginId, pluginVersion, repositoryRoot, knownSkills, validateReferences = false, } = options;
    let markdown;
    try {
        markdown = await readFile(sourcePath, "utf8");
    }
    catch {
        throw commandError(`missing command ${sourcePath ? path.basename(sourcePath, ".md") : "unknown"}`);
    }
    const { metadata, body } = parseFrontmatter(markdown, sourcePath);
    for (const heading of REQUIRED_SECTIONS) {
        if (!sectionText(body, heading)) {
            throw commandError(`command ${metadata.id ?? sourcePath} has empty ${heading}`);
        }
    }
    const command = {
        id: metadata.id,
        pluginId,
        slug: metadata.slug,
        description: metadata.description,
        version: metadata.version,
        intent: sectionText(body, "Intent"),
        inputs: sectionList(body, "Inputs"),
        requiredSkills: sectionList(body, "Required Skills"),
        steps: [...sectionText(body, "Steps").matchAll(/^\d+\. (.+)$/gm)].map((item) => item[1].trim()),
        outputContract: sectionList(body, "Output Contract"),
        outputSchema: metadata.outputSchema,
        sourcePath: relativeSourcePath(sourcePath, repositoryRoot),
        absoluteSourcePath: sourcePath,
        pluginVersion: pluginVersion ?? metadata.version,
        markdown,
    };
    const errors = validateCanonicalCommand(command, {
        knownSkills,
        validateReferences,
    });
    if (errors.length > 0) {
        throw commandError(errors.join("\n"));
    }
    return command;
}
export async function loadPluginCommands({ root, pluginId, plugin, knownSkills = new Set(), validateReferences = false, }) {
    const commands = [];
    for (const asset of plugin.assets?.commands ?? []) {
        const relativePath = asset.includes("/")
            ? asset
            : `commands/${asset}.md`;
        commands.push(await loadCanonicalCommand({
            sourcePath: path.join(root, "plugins", pluginId, relativePath),
            pluginId,
            pluginVersion: plugin.metadata.version,
            repositoryRoot: root,
            knownSkills,
            validateReferences,
        }));
    }
    return commands.sort((left, right) => left.id.localeCompare(right.id));
}
