import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateReadmeStandard } from "../src/contracts.mjs";

const TIER_A = ["", "core", "plugins", "providers", "docs", "cli"];
const TIER_B = ["cli/scripts", "adapters/codex", "adapters/antigravity"];

function readme(title, h2 = 1) {
  const sections = Array.from(
    { length: h2 },
    (_, i) => `## Section ${i + 1}\n\nBody.\n`,
  ).join("\n");
  return `# ${title}\n\nLead paragraph.\n\n${sections}`;
}

function compliantFiles() {
  const files = {};
  files["core/standards/readme-authoring-standard.md"] = "# Readme Authoring Standard\n\n- Rule.\n";
  for (const dir of TIER_A) {
    files[path.join(dir, "README.md")] = readme("Component");
    files[path.join(dir, "README_VI.md")] = readme("Component");
  }
  for (const dir of TIER_B) {
    files[path.join(dir, "README.md")] = readme("Component");
  }
  return files;
}

async function runWith(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-readme-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(root, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content);
    }
    const errors = [];
    await validateReadmeStandard(root, errors);
    return errors;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("compliant readme tree produces no errors", async () => {
  const errors = await runWith(compliantFiles());
  assert.deepEqual(errors, []);
});

test("missing README_VI in a tier A dir is an error", async () => {
  const files = compliantFiles();
  delete files[path.join("cli", "README_VI.md")];
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /cli is missing README_VI\.md/.test(e)));
});

test("orphan README_VI without README is an error", async () => {
  const files = compliantFiles();
  delete files[path.join("core", "README.md")];
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /core is missing README\.md/.test(e)));
  assert.ok(
    errors.some((e) => /core has README_VI\.md without README\.md/.test(e)),
  );
});

test("a readme without exactly one H1 is an error", async () => {
  const files = compliantFiles();
  files["README.md"] = "No title here.\n\n## Section 1\n\nBody.\n";
  const errors = await runWith(files);
  assert.ok(
    errors.some((e) => /root\/README\.md must have exactly one H1/.test(e)),
  );
});

test("hash comments inside code fences are not counted as headings", async () => {
  const files = compliantFiles();
  files["README.md"] =
    "# Title\n\nLead.\n\n## Section 1\n\n```bash\n# Bash\n# Zsh\n```\n";
  const errors = await runWith(files);
  assert.deepEqual(
    errors.filter((e) => /root\/README\.md/.test(e)),
    [],
  );
});

test("tier A H2 count mismatch is an error", async () => {
  const files = compliantFiles();
  files[path.join("docs", "README.md")] = readme("Component", 3);
  files[path.join("docs", "README_VI.md")] = readme("Component", 2);
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /docs EN\/VI heading count mismatch/.test(e)));
});

test("missing readme authoring standard doc is an error", async () => {
  const files = compliantFiles();
  delete files["core/standards/readme-authoring-standard.md"];
  const errors = await runWith(files);
  assert.ok(
    errors.some((e) =>
      /readme-authoring-standard\.md is missing/.test(e),
    ),
  );
});
