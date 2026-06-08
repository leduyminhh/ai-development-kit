# Docs

`docs/` contains stable repository documentation: migration records, design
decisions, cleanup rationale, and implementation notes that should outlive a
single task or PR.

Do not use this directory as a dumping ground for generated reports. Promote a
report into `docs/` only when it becomes a maintained project reference.

## Folder Map

| Folder | What It Owns | Edit When |
| --- | --- | --- |
| `migration/` | The MCP-first migration specification, legacy review matrix, and completion checklist. | The repository migration plan, canonical structure, deprecated path list, or acceptance criteria changes. |

## Migration Documents

- `migration/implementation-spec-v1.1.md`: source-of-truth migration design for
  the MCP-first capability-pack architecture, target project layout, CLI
  lifecycle, adapter generation, validation, doctor, and cleanup phases.
- `migration/legacy-review-matrix.md`: decision table for legacy folders and
  whether they are replaced, deprecated, retained, or removed.
- `migration/completion-checklist.md`: final checklist showing which migration
  work is complete and which acceptance criteria were verified.

## What Belongs Here

- Architecture or migration documentation that explains why repository structure
  exists.
- Durable handoff notes for future maintainers.
- Cleanup decisions that must be traceable after legacy paths are removed.
- Cross-package documentation that does not belong to one pack.

## What Does Not Belong Here

- Temporary command output, scan reports, or local debugging notes.
- Pack-owned usage docs; place those in `packs/<pack>/README.md`.
- MCP server runtime docs; place those in `mcp-servers/README.md` or the owning
  server directory.

## Change Checklist

- Keep claims traceable to code, configs, tests, migration specs, or explicit
  decisions.
- Preserve historical context when updating migration docs; do not silently
  rewrite past decisions as if they never changed.
- Update English `README.md` first, then synchronize `README_VI.md`.
- Run `npm run validate` after documentation changes that affect structure,
  command ids, MCP tool ids, or migration acceptance rules.
