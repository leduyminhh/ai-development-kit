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

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function modulePath(root, directory) {
  const relative = path.relative(root, directory);
  return (relative || ".").split(path.sep).join("/");
}

function normalizePythonPackage(requirement) {
  const match = requirement
    .trim()
    .match(/^([a-z0-9][a-z0-9._-]*)(?:\[[^\]]*\])?/i);
  return match?.[1].toLowerCase().replaceAll(/[-_.]+/g, "-");
}

function detectPythonPackages(packages) {
  return {
    fastapi: packages.has("fastapi"),
    django: packages.has("django") || packages.has("djangorestframework"),
  };
}

function parseRequirements(content) {
  const packages = new Set();
  for (const line of content.split(/\r?\n/)) {
    const requirement = line.replace(/\s+#.*$/, "").trim();
    if (!requirement || requirement.startsWith("#") || requirement.startsWith("-")) {
      continue;
    }
    const packageName = normalizePythonPackage(requirement);
    if (packageName) {
      packages.add(packageName);
    }
  }
  return detectPythonPackages(packages);
}

function stripTomlComment(line) {
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== "\\") {
      quote = quote === character ? "" : quote || character;
    } else if (character === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function parsePyproject(content) {
  const packages = new Set();
  let section = "";
  let dependencyArray = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim();
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      dependencyArray = false;
      continue;
    }

    let dependencyText = "";
    if (dependencyArray) {
      dependencyText = line;
    } else if (section === "project") {
      const dependencies = line.match(/^dependencies\s*=\s*(.*)$/);
      if (dependencies) {
        dependencyText = dependencies[1];
        dependencyArray = !dependencyText.includes("]");
      }
    } else if (section === "project.optional-dependencies") {
      const optionalDependencies = line.match(/^[a-z0-9._-]+\s*=\s*(.*)$/i);
      if (optionalDependencies) {
        dependencyText = optionalDependencies[1];
        dependencyArray = !dependencyText.includes("]");
      }
    }

    for (const match of dependencyText.matchAll(/(["'])(.*?)\1/g)) {
      const packageName = normalizePythonPackage(match[2]);
      if (packageName) {
        packages.add(packageName);
      }
    }
    if (dependencyArray && line.includes("]")) {
      dependencyArray = false;
    }
  }

  return detectPythonPackages(packages);
}

function parsePackageJson(content) {
  const manifest = JSON.parse(content);
  return Boolean(
    Object.hasOwn(manifest.dependencies ?? {}, "react") ||
      Object.hasOwn(manifest.devDependencies ?? {}, "react"),
  );
}

function isSpringCoordinate(group, artifact) {
  return group.startsWith("org.springframework") || artifact.startsWith("spring-");
}

function parsePom(content) {
  const dependencies = content.replace(/<!--[\s\S]*?-->/g, "");
  for (const dependency of dependencies.matchAll(
    /<dependency\b[^>]*>([\s\S]*?)<\/dependency>/gi,
  )) {
    const group = dependency[1].match(/<groupId>\s*([^<]+)\s*<\/groupId>/i)?.[1].trim() ?? "";
    const artifact =
      dependency[1].match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/i)?.[1].trim() ?? "";
    if (isSpringCoordinate(group, artifact)) {
      return true;
    }
  }
  return false;
}

function parseGradle(content) {
  const declarations = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const dependency =
    /\b(?:api|implementation|compile|compileOnly|runtimeOnly|testImplementation|testCompileOnly|testRuntimeOnly|annotationProcessor|developmentOnly|kapt)\s*(?:\(\s*)?["']([^:"']+):([^:"']+):[^"']+["']/gi;

  for (const match of declarations.matchAll(dependency)) {
    if (isSpringCoordinate(match[1], match[2])) {
      return true;
    }
  }
  return false;
}

async function collectSignals(root, directory, modules) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareText(left.name, right.name));

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
    const content = await readFile(directoryPath, "utf8");
    const module = modulePath(root, directory);
    const signals = modules.get(module) ?? {
      javaSpring: false,
      python: false,
      fastapi: false,
      django: false,
      react: false,
    };

    if (javaFiles.has(entry.name)) {
      signals.javaSpring ||=
        entry.name === "pom.xml" ? parsePom(content) : parseGradle(content);
    }
    if (pythonFiles.has(entry.name)) {
      signals.python = true;
      const python =
        entry.name === "requirements.txt"
          ? parseRequirements(content)
          : parsePyproject(content);
      signals.fastapi ||= python.fastapi;
      signals.django ||= python.django;
    }
    if (entry.name === "package.json") {
      signals.react ||= parsePackageJson(content);
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

  return detected.sort((left, right) => {
    const leftKey = `${left.module}:${left.stack}`;
    const rightKey = `${right.module}:${right.stack}`;
    return compareText(leftKey, rightKey);
  });
}
