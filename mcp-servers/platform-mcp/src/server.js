export function createServer() {
  return {
    name: "platform-mcp",
    tools: ["platform.review_docker", "platform.review_kubernetes", "platform.deployment_plan"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
