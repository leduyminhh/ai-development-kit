export function createServer() {
  return {
    name: "data-mcp",
    tools: ["data.analyze_schema", "data.review_index", "data.migration_plan"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
