import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function exists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(pathname) {
  try {
    return await readFile(pathname, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function addRecommendation(recommendations, pluginId, confidence, reason) {
  const current = recommendations.get(pluginId) ?? {
    pluginId,
    confidence: 0,
    reasons: [],
  };
  current.confidence = Math.max(current.confidence, confidence);
  if (!current.reasons.includes(reason)) current.reasons.push(reason);
  recommendations.set(pluginId, current);
}

export async function detectInstallRecommendations({ projectRoot }) {
  const recommendations = new Map();
  addRecommendation(recommendations, "platform", 0.9, "baseline AI Engineering runtime is recommended for project installs");

  const packageJson = await readTextIfExists(path.join(projectRoot, "package.json"));
  if (packageJson) {
    const lower = packageJson.toLowerCase();
    addRecommendation(recommendations, "quality", 0.7, "package.json indicates a JavaScript project");
    if (lower.includes("react") || lower.includes("next") || lower.includes("vite")) {
      addRecommendation(recommendations, "application", 0.85, "package.json includes react/next/vite application signals");
    }
  }

  const javaSignals = ["pom.xml", "build.gradle", "build.gradle.kts"];
  if ((await Promise.all(javaSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "architecture", 0.8, "Java build files indicate backend architecture work");
    addRecommendation(recommendations, "quality", 0.7, "Java build files indicate test and quality automation needs");
  }

  const pythonSignals = ["pyproject.toml", "requirements.txt", "setup.py"];
  if ((await Promise.all(pythonSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "architecture", 0.7, "Python project files indicate service or application design work");
    addRecommendation(recommendations, "quality", 0.7, "Python project files indicate test and quality automation needs");
  }

  const lockSignals = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock"];
  if ((await Promise.all(lockSignals.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "security", 0.7, "dependency lockfile indicates supply-chain review value");
  }

  if (await exists(path.join(projectRoot, ".github", "workflows"))) {
    addRecommendation(recommendations, "quality", 0.7, "CI workflow directory indicates quality automation value");
    addRecommendation(recommendations, "security", 0.65, "CI workflow directory indicates security review value");
  }

  const docDirs = ["docs", "adr", "architecture"];
  if ((await Promise.all(docDirs.map((name) => exists(path.join(projectRoot, name))))).some(Boolean)) {
    addRecommendation(recommendations, "architecture", 0.65, "documentation or ADR directories indicate architecture assets");
  }

  return {
    plugins: [...recommendations.values()].sort((left, right) => left.pluginId.localeCompare(right.pluginId)),
  };
}
