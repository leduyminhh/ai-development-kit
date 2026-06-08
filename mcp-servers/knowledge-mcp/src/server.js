export function createServer() {
  return {
    name: "knowledge-mcp",
    tools: ["knowledge.generate_readme", "knowledge.generate_runbook", "knowledge.review_docs"],
    start() {
      process.stdout.write(`${JSON.stringify({ status: "ready", server: this.name })}\n`);
    },
  };
}
