export function createServer() {
  return {
    name: "quality-mcp",
    tools: ["quality.generate_test_plan", "quality.review_coverage", "quality.performance_review"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
