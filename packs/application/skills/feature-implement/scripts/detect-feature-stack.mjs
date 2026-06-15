import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const signalFiles = new Set([
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "pyproject.toml",
  "requirements.txt",
  "package.json",
]);
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  ".venv",
]);
const javaFiles = new Set(["pom.xml", "build.gradle", "build.gradle.kts"]);
const pythonFiles = new Set(["pyproject.toml", "requirements.txt"]);
const reactDependency = /["']react["']\s*:/i;

function modulePath(root, directory) {
  const relative = path.relative(root, directory);
  return (relative || ".").split(path.sep).join("/");
}

async function collectSignals(root, directory, modules) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectSignals(root, path.join(directory, entry.name), modules);
      }
      continue;
    }

    if (!entry.isFile() || !signalFiles.has(entry.name)) {
      continue;
    }

    const directoryPath = path.join(directory, entry.name);
    const content = (await readFile(directoryPath, "utf8")).toLowerCase();
    const module = modulePath(root, directory);
    const signals = modules.get(module) ?? {
      javaSpring: false,
      python: false,
      fastapi: false,
      django: false,
      react: false,
    };

    if (javaFiles.has(entry.name) && content.includes("spring")) {
      signals.javaSpring = true;
    }
    if (pythonFiles.has(entry.name)) {
      signals.python = true;
      signals.fastapi ||= content.includes("fastapi");
      signals.django ||=
        content.includes("djangorestframework") || content.includes("django");
    }
    if (entry.name === "package.json" && reactDependency.test(content)) {
      signals.react = true;
    }

    modules.set(module, signals);
  }
}

export async function detectFeatureStacks(root) {
  const resolvedRoot = path.resolve(root);
  const modules = new Map();
  await collectSignals(resolvedRoot, resolvedRoot, modules);

  const detected = [];
  for (const [module, signals] of modules) {
    if (signals.javaSpring) {
      detected.push({ module, stack: "java-spring" });
    }
    if (signals.django) {
      detected.push({ module, stack: "django-drf" });
    }
    if (signals.fastapi) {
      detected.push({ module, stack: "fastapi" });
    }
    if (signals.python && !signals.django && !signals.fastapi) {
      detected.push({ module, stack: "python-ambiguous" });
    }
    if (signals.react) {
      detected.push({ module, stack: "react" });
    }
  }

  return detected.sort((left, right) =>
    `${left.module}:${left.stack}`.localeCompare(`${right.module}:${right.stack}`),
  );
}
