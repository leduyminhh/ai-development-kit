# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-23

### Changed

- **Plugin standardization refactor** — Unified skill, command, and workflow naming across all 7 plugins
  - Renamed workflows: `fullstack-feature` → `feature-delivery-pipeline`
  - Renamed commands: `migration-plan` → `plan-migration`, `deployment-plan` → `plan-deployment`
  - Renamed skills: `java-analyze` → `java-implement`, `react-code-generate` → `react-implement`, `python-backend-engineer` → `python-implement`
  - Consolidated 7 phase-specific feature-* skills into required implementation skills

- **Plugin structure cleanup**
  - Removed phantom skill references (non-existent skills in plugin manifests)
  - Removed duplicate top-level identity fields from plugin.yaml (metadata is now single source of truth)
  - Promoted optional dependencies to required where skills are directly used in commands (quality, security, data)

- **Schema denormalization** — Cleaned up plugin.yaml structure to eliminate redundant metadata

### Fixed

- Fixed stale workflow references in core/workflows/ after command renames
- Updated all skill registry entries to reflect renamed skills
- Updated README tables and documentation with new skill/command names
- Fixed stale skill name references in SKILL.md documentation files

### Improved

- CLI now reads from metadata block (no fallback to top-level fields)
- Validation stricter: metadata.id is authoritative
- All 95 files touched; 812 insertions, 1010 deletions net

### Validation

- All 7 plugins validate successfully for 4 providers (codex, claude, cursor, antigravity)
- No broken workflow references or missing skill registry entries
- CLI commands (validate, workflow list, plugin list) all functional

## [1.0.0] - 2026-06-xx

### Initial Release

- AI engineering platform CLI with plugin system
- Support for 7 plugins: application, architecture, data, knowledge, platform, quality, security
- Adapter generation for Codex, Claude Code, Cursor, and Antigravity
- Interactive install/uninstall/upgrade wizards
- Plugin validation and doctor commands
