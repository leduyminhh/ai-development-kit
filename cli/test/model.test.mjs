import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, parseCommandMarkdown } from "../lib/plugins.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("parseCommandMarkdown tách frontmatter và section", () => {
  const md = [
    "---", "id: x.y", "slug: plan-feature", "description: Desc", "---", "",
    "# Plan", "", "## Intent", "", "Do the thing.", "",
    "## Inputs", "", "- a", "- b", "",
    "## Required Skills", "", "- api-contract-design", "",
    "## Steps", "", "1. one", "2. two", "",
    "## Output Contract", "", "- ctx", "",
  ].join("\n");
  const parsed = parseCommandMarkdown(md);
  assert.equal(parsed.frontmatter.slug, "plan-feature");
  assert.equal(parsed.intent, "Do the thing.");
  assert.deepEqual(parsed.inputs, ["a", "b"]);
  assert.deepEqual(parsed.requiredSkills, ["api-contract-design"]);
  assert.deepEqual(parsed.steps, ["one", "two"]);
  assert.deepEqual(parsed.outputContract, ["ctx"]);
});

test("loadModel dựng model cho application (đã kéo deps)", () => {
  const model = loadModel({ root: ROOT, pluginIds: ["application"], scope: "project" });
  assert.ok(model.pluginIds.includes("architecture"));
  assert.ok(model.skills.some((s) => s.id === "application.java_implement"));
  assert.ok(model.commands.some((c) => c.slug === "plan-feature"));
  const plan = model.commands.find((c) => c.slug === "plan-feature");
  assert.ok(plan.steps.length >= 3);
  assert.ok(model.agents.some((a) => a.id === "java-implement"));
});
