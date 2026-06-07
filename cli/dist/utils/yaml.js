export function parseStructuredYaml(text) {
    return JSON.parse(text);
}
export function stringifyStructuredYaml(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
