import path from "node:path";

export function resolveTarget(input = "."): string {
  return path.resolve(input);
}
