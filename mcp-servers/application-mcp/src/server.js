export function createServer() {
  return {
    name: "application-mcp",
    tools: ["application.review_source_code", "application.generate_service", "application.review_api"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
