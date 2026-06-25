# Docs

`docs/` contains stable repository documentation: migration records, design
decisions, cleanup rationale, and implementation notes that should outlive a
single task or PR.

Do not use this directory as a dumping ground for generated reports. Promote a
report into `docs/` only when it becomes a maintained project reference.

## Structure

| Folder | What It Owns | Edit When |
| --- | --- | --- |
| `migration/` | Migration specifications, historical implementation context, and completion checklist. | The repository migration plan, canonical structure, deprecated path list, or acceptance criteria changes. |
| `superpowers/plans/` | Implementation plans created during structured development work. | A maintained plan needs to remain traceable after the task. |
| `superpowers/specs/` | Design specs created during structured development work. | A design decision or implementation boundary should remain traceable. |

## Migration Documents

- `migration/migrate-existing-source-to-plugins-platform.md`: current
  plugin-first migration target for AI IDE plugins and adapter-generated
  artifacts.
- `migration/implementation-spec-v1.1.md`: historical MCP-first migration design
  kept as context for earlier structure decisions.
- `migration/completion-checklist.md`: historical checklist showing earlier
  migration acceptance criteria.

## What Belongs Here

- Architecture or migration documentation that explains why repository structure
  exists.
- Durable handoff notes for future maintainers.
- Cleanup decisions that must be traceable after legacy paths are removed.
- Cross-package documentation that does not belong to one plugin.

## What Does Not Belong Here

- Temporary command output, scan reports, or local debugging notes.
- Plugin-owned usage docs. Prefer real maintained docs in the owning plugin
  directory; do not add README placeholders just to keep folders alive.
- MCP provider registry docs; place those in `providers/README.md` or
  `providers/mcp/`.

## Change Checklist

- Keep claims traceable to code, configs, tests, migration specs, or explicit
  decisions.
- Preserve historical context when updating migration docs; do not silently
  rewrite past decisions as if they never changed.
- Update English `README.md` first, then synchronize `README_VI.md`.
- Run `npm run validate` after documentation changes that affect structure,
  command ids, MCP tool ids, or migration acceptance rules.
