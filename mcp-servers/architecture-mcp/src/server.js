export function createServer() {
  return {
    name: "architecture-mcp",
    tools: ["architecture.generate_system_design", "architecture.review_architecture", "architecture.generate_adr"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
