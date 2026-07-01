export const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
export const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";

export function hasOnlyWhitespace(text) {
  return text.trim() === "";
}

export function mergeManagedBlock(existing, baseline, relativePath) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start === -1 && end === -1) {
    return `${existing.trimEnd()}\n\n${baseline.trim()}\n`;
  }
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`${relativePath} contains an invalid AI Engineering managed block`);
  }
  return `${existing.slice(0, start)}${baseline.trim()}${existing.slice(end + END.length)}`;
}

export function removeManagedBlock(existing) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start === -1 || end === -1 || end < start) return existing;
  const out = `${existing.slice(0, start)}${existing.slice(end + END.length)}`;
  return hasOnlyWhitespace(out) ? "" : out;
}
