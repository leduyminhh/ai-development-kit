# PlantUML Output Rules

## Required Output

Return complete PlantUML source:

```plantuml
@startuml
title Short descriptive title
' diagram content
@enduml
```

For non-UML diagram syntaxes that use specialized start tags, use the correct PlantUML start/end pair, such as `@startjson`, `@startyaml`, `@startmindmap`, or `@startgantt`.

## Persistent Output Files

When the user asks to save a diagram, use the diagram writer setting from `.codex/config.toml`:

```toml
[output.file]
filenamePattern = "filename_yyyyMMdd_HHmm"
timezone = "Asia/Saigon"

[output.file.extensionsBySubpath]
"docs/diagram" = "puml"

[diagram.writer]
rootPath = "docs/diagram"
subagentPath = true
filenamePattern = "filename_yyyyMMdd_HHmm"
defaultExtension = "puml"
```

Default path format:

```text
docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml
```

Rules:

- Resolve the path with `scripts/resolve-output-file.ps1` before proposing a persistent file.
- Use the current local date and time in `Asia/Saigon` for `yyyyMMdd_HHmm`.
- Use the selected diagram subagent folder name for `subagent`, without the `-agent` suffix when helpful.
- Convert `filename` to lowercase kebab-case or snake_case based on the user's supplied name; prefer kebab-case when not specified.
- Resolve the extension from `[output.file.extensionsBySubpath]` using the most specific matching subpath; fall back to `[diagram.writer].defaultExtension`.
- Keep the `.puml` extension for PlantUML source unless a more specific subpath mapping or explicit user request changes it.
- All persistent response files should follow the global `filename_yyyyMMdd_HHmm` suffix pattern unless a more specific writer setting overrides only the root path or extension.
- Because `docs/` is protected, present the proposed path, purpose, and short content summary before writing.
- Proceed only after explicit confirmation.

Confirmation template:

```text
Proposed change:
- Path: docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml
- Purpose: save PlantUML diagram source
- Summary: diagram type, scope, key participants/entities

Confirm? (yes/no)
```

Resolver example:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/resolve-output-file.ps1 `
  -Writer diagram `
  -Subagent sequence `
  -Filename "Payment Flow"
```

## Style Rules

- Use short, stable names.
- Prefer labels that match the user's domain language.
- Keep diagrams readable before exhaustive.
- Use `title` for context.
- Use `skinparam` or style blocks sparingly.
- Avoid decorative styling unless the user asks for presentation polish.
- Do not include secrets, tokens, real credentials, or private hostnames unless the user explicitly provided them for documentation.

## Assumption Rules

- Label inferred systems, actors, states, and relationships.
- Do not invent APIs, tables, states, or infrastructure without marking them as assumptions.
- If PlantUML syntax is uncertain for a rare diagram type, prefer a simpler supported notation and state the tradeoff.

## Rendering Guidance

Use one of these when the user asks how to view the diagram:

- PlantUML online server: paste the source into the PlantUML server or supported editor plugin.
- Local CLI: `java -jar plantuml.jar diagram.puml`
- SVG output: `java -jar plantuml.jar -tsvg diagram.puml`

Do not claim the diagram rendered successfully unless a render command was actually executed.

## Review Checklist

- Source starts and ends with a valid PlantUML directive.
- Every opened block is closed.
- Diagram type matches the user goal.
- The diagram omits unrelated implementation detail.
- Vietnamese explanation is concise and actionable.
