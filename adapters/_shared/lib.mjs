// adapters/_shared/lib.mjs  (bản dùng thật)
import fs from "node:fs";
import path from "node:path";

export function readSource(root, relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

export function agentBody(agent) {
  const d = agent.definition ?? {};
  const instructions = d.instructions || `Apply the ${agent.id} skill.`;
  return `---\nname: ${d.name || agent.id}\ndescription: ${d.description || ""}\n---\n\n${instructions}\n`;
}

export function jsonFile(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
