import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const INSTALL_DIR = path.join(".ai-engineering", "install");
const SESSION_FILE = "session.json";
const EVENTS_FILE = "events.jsonl";

function installPath(target, filename) {
  return path.join(target, INSTALL_DIR, filename);
}

async function appendEvent(target, type, data = {}) {
  const pathname = installPath(target, EVENTS_FILE);
  await mkdir(path.dirname(pathname), { recursive: true });
  const event = { type, data, timestamp: new Date().toISOString() };
  await writeFile(pathname, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

async function readSessionFile(target) {
  try {
    return JSON.parse(await readFile(installPath(target, SESSION_FILE), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readInstallSession({ target }) {
  return readSessionFile(target);
}

export async function writeInstallSession({
  target,
  currentStep,
  draft,
  detectedProviders = [],
  detectedPlugins = [],
  planHash = "",
}) {
  const existing = await readSessionFile(target);
  const now = new Date().toISOString();
  const session = {
    schemaVersion: 1,
    sessionId: existing?.sessionId ?? randomUUID(),
    status: "running",
    currentStep,
    draft,
    detectedProviders,
    detectedPlugins,
    planHash,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const pathname = installPath(target, SESSION_FILE);
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-written", { sessionId: session.sessionId, currentStep });
  return session;
}

export async function completeInstallSession({ target }) {
  const existing = await readSessionFile(target);
  if (!existing) return null;
  const session = { ...existing, status: "completed", updatedAt: new Date().toISOString() };
  await writeFile(installPath(target, SESSION_FILE), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-completed", { sessionId: session.sessionId });
  return session;
}

export async function cancelInstallSession({ target }) {
  const existing = await readSessionFile(target);
  if (!existing) return null;
  const session = { ...existing, status: "cancelled", updatedAt: new Date().toISOString() };
  await writeFile(installPath(target, SESSION_FILE), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendEvent(target, "session-cancelled", { sessionId: session.sessionId });
  return session;
}
