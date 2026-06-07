# CLI Shell Utilities

This directory contains retained shell utilities whose behavior is not
duplicated by the TypeScript CLI:

- project hook installation, transport, audit, query, and diagnostics
- Codex configuration parsing
- deterministic output-path resolution
- focused PowerShell verification for those utilities

The legacy AIDK package installer, flat-skill linker, workflow bootstrap, and
their tests were removed after equivalent capability-pack behavior became
available through `cli/src` and the platform runtime.

Run focused checks with:

```powershell
powershell -ExecutionPolicy Bypass -File cli/scripts/test-resolve-output-file.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/test-hook-core.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/test-install-hooks.ps1
```
