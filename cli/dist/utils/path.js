import path from "node:path";
export function resolveTarget(input = ".") {
    return path.resolve(input);
}
