import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(testRoot, "..", "..");
export const cliPath = path.join(repoRoot, "platform", "bin", "ai-engineering.mjs");

export function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}
