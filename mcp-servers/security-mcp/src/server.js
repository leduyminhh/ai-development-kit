export function createServer() {
  return {
    name: "security-mcp",
    tools: ["security.scan_source", "security.scan_dependencies", "security.generate_threat_model"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
