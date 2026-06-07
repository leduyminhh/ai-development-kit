export function parseStructuredYaml<T>(text: string): T {
  return JSON.parse(text) as T;
}

export function stringifyStructuredYaml(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
