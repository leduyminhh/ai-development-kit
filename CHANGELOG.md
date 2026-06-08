# Changelog

## 1.0.0 - AI Engineering Platform Migration

- Replaced the legacy flat repository with core contracts and seven capability packs.
- Added MCP server skeletons and canonical command-to-tool metadata.
- Added the TypeScript `ai-engineering` CLI with init, install, uninstall, list,
  update, upgrade, validate, doctor, adapter generation, and migration commands.
- Added safe AGENTS managed-block merge, synchronized install state, and
  backup-first legacy cleanup.
- Removed obsolete root plugin, registry, schema, skill, and installer flows.

## Unreleased

- Add AI Engineering Platform plugin distribution with independently installable package plugins.
- Add canonical provider-neutral commands, transactional install/update/remove lifecycle, and Codex, Claude Code, and Cursor adapter outputs.
- Add npm-style plugin package staging and GitHub Release archive equivalence checks.
- Keep legacy AIDK and `npx skills` flows available as compatibility paths.
- Refactor repository structure to align runtime skills under root `skills/`.
- Add scaffold directories for `.codex/profiles`, `.codex/prompts`, `references/`, and `examples/`.
