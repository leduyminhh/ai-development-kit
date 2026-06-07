# CLI Shell Utilities

This directory contains shell-native hook utilities that are not duplicated by
the TypeScript CLI.

## Layout

| Path | Purpose |
| --- | --- |
| `bin/` | Runnable tools: installer, hook service, hook doctor, hook invocation, audit query, trace view, and output-path resolver. |
| `hooks/core/` | Canonical hook contract, identity, policy, audit, flow, redaction, and pipeline logic. |
| `hooks/adapters/` | Provider adapters for Codex and Claude hook payloads. |
| `hooks/transports/` | CLI and HTTP hook transports. |
| `hooks/fixtures/` | Provider payload fixtures used by tests. |
| `lib/` | Shared Codex config and output-path helpers. |
| `tests/` | Focused PowerShell tests for this shell runtime. |

Run focused checks with:

```powershell
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-resolve-output-file.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-hook-core.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-install-hooks.ps1
```
