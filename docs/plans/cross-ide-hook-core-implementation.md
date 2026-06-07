# Cross-IDE Hook Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable PowerShell hook core with CLI and shared HTTP transports, thin Codex and Claude Code adapters, non-invasive installation, canonical audit events, and flow validation.

**Architecture:** Provider adapters convert native stdin payloads into `ai.hook.event.v1` and call one provider-neutral pipeline. The CLI and HTTP transports reuse the same pipeline, audit writer, retention, deduplication, and flow validator. Installation uses structured JSON updates, ownership markers, and safe coexistence defaults.

**Tech Stack:** PowerShell 7/Windows PowerShell compatibility, JSON/JSONL, TOML configuration through existing helpers, native Codex and Claude Code command hooks.

---

## File Map

Create these shared project artifacts:

```text
scripts/hooks/
  core/
    hook-contract.ps1          # Canonical event/result construction and validation
    hook-identity.ps1          # Stable event, trace, and span identifiers
    hook-redaction.ps1         # Bounded payload and secret redaction
    hook-policy.ps1            # observe/warn/enforce decision aggregation
    hook-audit.ps1             # Provider-neutral audit conversion and writing
    hook-flow.ps1              # Lifecycle state updates and trace validation
    hook-pipeline.ps1          # Ordered application pipeline
  adapters/
    codex-hook-adapter.ps1     # Codex native/canonical mapping
    claude-hook-adapter.ps1    # Claude Code native/canonical mapping
  transports/
    hook-cli-transport.ps1     # stdin/stdout invocation
    hook-http-client.ps1       # Shared server client with timeout/fallback
  install/
    hook-install-common.ps1    # Ownership and structured JSON helpers
    hook-install-codex.ps1     # Codex hooks.json installation
    hook-install-claude.ps1    # Claude settings.json installation
  fixtures/
    codex/*.json               # Native Codex lifecycle fixtures
    claude/*.json              # Native Claude lifecycle fixtures
scripts/invoke-hook.ps1        # Public local adapter entry point
scripts/install-hooks.ps1      # Public idempotent installer
scripts/hook-doctor.ps1        # Configuration and connectivity diagnostics
scripts/test-hook-core.ps1
scripts/test-hook-adapters.ps1
scripts/test-hook-install.ps1
scripts/test-hook-flow.ps1
```

Modify:

```text
.codex/hooks/lib/project-hook-event.ps1
.codex/hooks/lib/project-hook-dispatch.ps1
.codex/hooks/lib/project-hook-format.ps1
.codex/hooks/lib/project-hook-writer.ps1
.codex/hooks/lib/project-hook-retention.ps1
.codex/hooks/log-agent-event.ps1
.codex/config.toml
.codex/test-map.toml
scripts/hook-service.ps1
scripts/test-hook-service.ps1
.codex/hooks/test-log-agent-event.ps1
README.md
README_VI.md
```

The existing `.codex/hooks/lib/project-hook-*.ps1` files remain compatibility wrappers during this plan. Shared implementation moves under `scripts/hooks/core/`; existing callers continue to pass until migrated.

### Task 1: Canonical Contract, Identity, And Redaction

**Files:**
- Create: `scripts/hooks/core/hook-contract.ps1`
- Create: `scripts/hooks/core/hook-identity.ps1`
- Create: `scripts/hooks/core/hook-redaction.ps1`
- Create: `scripts/test-hook-core.ps1`
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Register the new core test before adding implementation**

Add `scripts/test-hook-core.ps1` to `test.core.project-hook.commands` and add `scripts/hooks` plus the test path to that group's `paths`. Keep the test mapped in exactly one group.

- [ ] **Step 2: Write failing tests for the canonical envelope**

Test that `New-AiHookEvent` produces:

```powershell
$event = New-AiHookEvent `
    -Provider 'codex' `
    -NativeEvent 'PreToolUse' `
    -EventName 'tool.before' `
    -SessionId 'session-1' `
    -SourceName 'Bash' `
    -Payload @{ toolName = 'Bash'; command = 'git status' } `
    -Timestamp '2026-06-06T01:00:00Z'

Assert-Equal 'ai.hook.event.v1' $event.schema 'Canonical schema mismatch.'
Assert-Equal 'observe' $event.mode 'Default mode must be observe.'
Assert-Equal 'abstain' $event.decision 'Default decision must be abstain.'
Assert-True ($event.eventId -match '^sha256:[0-9a-f]{64}$') 'Event ID must be deterministic SHA-256.'
```

Also test rejection of unsupported canonical names, missing provider/native event, payloads above the configured byte limit, and invalid timestamps.

- [ ] **Step 3: Run the test and verify the contract functions are missing**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-core.ps1
```

Expected: FAIL because `New-AiHookEvent` and validation helpers do not exist.

- [ ] **Step 4: Implement the minimal versioned contract**

Define:

```powershell
function New-AiHookEvent {
    param(
        [Parameter(Mandatory)][string]$Provider,
        [Parameter(Mandatory)][string]$NativeEvent,
        [Parameter(Mandatory)][string]$EventName,
        [Parameter(Mandatory)][string]$SessionId,
        [Parameter(Mandatory)][string]$SourceName,
        [hashtable]$Payload = @{},
        [string]$Mode = 'observe',
        [string]$Timestamp,
        [string]$TeamId,
        [string]$ProjectId,
        [string]$ClientName
    )
}
```

Allow only the canonical event names defined in the specification. Return a structured validation error with `code`, `message`, and `field`.

- [ ] **Step 5: Implement deterministic identity**

Build `eventId` from provider, native event, session ID, source name, native call/tool identifier when present, and normalized timestamp. Hash UTF-8 bytes with SHA-256. Generate `traceId` from session ID when absent and generate `spanId` from `eventId`.

- [ ] **Step 6: Implement redaction and size limits**

Redact keys matching:

```text
token
secret
password
authorization
api_key
apikey
cookie
```

Replace redacted values with `[REDACTED]`, truncate strings above 4096 characters, limit nesting depth to 8, and reject canonical request bodies above 256 KiB.

- [ ] **Step 7: Run the core tests**

Run the Task 1 test command. Expected: PASS with one summary line, `hook core tests passed`.

### Task 2: Policy Pipeline And Canonical Result

**Files:**
- Create: `scripts/hooks/core/hook-policy.ps1`
- Modify: `scripts/hooks/core/hook-contract.ps1`
- Modify: `scripts/test-hook-core.ps1`

- [ ] **Step 1: Add failing decision aggregation tests**

Cover:

```powershell
Assert-Equal 'deny' (Merge-AiHookDecision @('allow', 'deny', 'ask', 'abstain'))
Assert-Equal 'ask' (Merge-AiHookDecision @('allow', 'ask', 'abstain'))
Assert-Equal 'allow' (Merge-AiHookDecision @('allow', 'abstain'))
Assert-Equal 'abstain' (Merge-AiHookDecision @('abstain'))
```

Verify `observe` always returns `abstain`; `warn` may add warnings but cannot deny; `enforce` can return `allow`, `ask`, or `deny`.

- [ ] **Step 2: Run tests and verify failure**

Expected: FAIL because `Merge-AiHookDecision` and `Invoke-AiHookPolicy` are missing.

- [ ] **Step 3: Implement policy mode behavior**

Use the fixed precedence:

```powershell
$script:AiHookDecisionRank = @{
    abstain = 0
    allow   = 1
    ask     = 2
    deny    = 3
}
```

Return:

```json
{
  "schema": "ai.hook.result.v1",
  "eventId": "...",
  "mode": "observe",
  "decision": "abstain",
  "reason": "",
  "warnings": [],
  "policyIds": [],
  "auditWritten": false
}
```

- [ ] **Step 4: Run tests**

Expected: all core tests pass.

### Task 3: Provider-Neutral Audit And Compatibility Wrappers

**Files:**
- Create: `scripts/hooks/core/hook-audit.ps1`
- Modify: `.codex/hooks/lib/project-hook-event.ps1`
- Modify: `.codex/hooks/lib/project-hook-dispatch.ps1`
- Modify: `.codex/hooks/lib/project-hook-format.ps1`
- Modify: `.codex/hooks/lib/project-hook-writer.ps1`
- Modify: `.codex/hooks/lib/project-hook-retention.ps1`
- Modify: `.codex/hooks/log-agent-event.ps1`
- Modify: `.codex/hooks/test-log-agent-event.ps1`
- Modify: `scripts/test-hook-core.ps1`

- [ ] **Step 1: Add failing compatibility and JSONL tests**

Verify:

- canonical events write to JSONL with schema `ai.hook.event.v1`
- old `log-agent-event.ps1` still writes the existing expected fields
- audit exceptions return `auditWritten = false` in `observe` instead of throwing
- the same `eventId` is written once

- [ ] **Step 2: Run both audit tests and verify new assertions fail**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-core.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/test-log-agent-event.ps1
```

- [ ] **Step 3: Extract provider-neutral audit functions**

Implement:

```powershell
function Write-AiHookAuditEvent {
    param(
        [Parameter(Mandatory)][pscustomobject]$Event,
        [Parameter(Mandatory)][pscustomobject]$Settings
    )
}
```

Use JSONL as the canonical default. Preserve text and CSV only for compatibility callers.

- [ ] **Step 4: Add idempotent event writing**

Maintain a daily event-ID index beside the JSONL output. Check and append under a named mutex keyed by normalized audit root and date. Do not hold the lock while running policy evaluation.

- [ ] **Step 5: Convert old files into compatibility wrappers**

Keep existing public function names and script parameters, but delegate construction, formatting, writing, and retention to the neutral implementation. Preserve `codex.project.event.v1` output for `log-agent-event.ps1` until migration is explicitly removed.

- [ ] **Step 6: Run audit tests**

Expected: both commands pass and existing output compatibility remains intact.

### Task 4: Flow State And Trace Validator

**Files:**
- Create: `scripts/hooks/core/hook-flow.ps1`
- Create: `scripts/test-hook-flow.ps1`
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Map and write failing flow tests**

Register `scripts/test-hook-flow.ps1` in `test.core.project-hook`.

Test the valid sequence:

```text
agent.started
skill.selected
skill.loaded
subagent.selected
subagent.started
subagent.completed
agent.completed
```

Test warnings for duplicate starts, completion without start, missing subagent completion, and unavailable skill evidence.

- [ ] **Step 2: Run tests and verify failure**

Expected: FAIL because flow functions do not exist.

- [ ] **Step 3: Implement append-only flow state**

Store state under configurable runtime storage:

```text
reports/audit/runtime/flows/20260606/trace-123.jsonl
```

Implement `Add-AiHookFlowEvent` and `Test-AiHookFlowTrace`. Do not mutate prior entries. Return findings with `severity`, `code`, `eventName`, and `message`.

- [ ] **Step 4: Distinguish unavailable evidence from invalid flow**

Missing `skill.selected`, `skill.loaded`, or `subagent.selected` is `unavailable` when the provider exposes no evidence source. It is `warning` only when a workflow-kit wrapper declared that event mandatory.

- [ ] **Step 5: Run flow tests**

Expected: `hook flow tests passed`.

### Task 5: Unified Pipeline And CLI Transport

**Files:**
- Create: `scripts/hooks/core/hook-pipeline.ps1`
- Create: `scripts/hooks/transports/hook-cli-transport.ps1`
- Create: `scripts/invoke-hook.ps1`
- Modify: `scripts/test-hook-core.ps1`

- [ ] **Step 1: Add failing pipeline ordering tests**

Inject test handlers that record stage order and assert:

```text
normalize -> validate -> deduplicate -> correlate -> policy -> audit -> flow
```

Verify malformed JSON returns a JSON error on stderr and a non-zero exit code. Verify `observe` audit failure still emits a valid `abstain` result on stdout.

- [ ] **Step 2: Run tests and verify failure**

Expected: FAIL because pipeline and CLI entry points do not exist.

- [ ] **Step 3: Implement `Invoke-AiHookPipeline`**

The function accepts a canonical event or adapter normalization callback and returns only `ai.hook.result.v1`. It must not emit diagnostic text to stdout.

- [ ] **Step 4: Implement stdin/stdout CLI**

Public usage:

```powershell
'{"provider":"codex","nativeEvent":"PreToolUse","payload":{}}' |
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/invoke-hook.ps1 -Provider codex -Event PreToolUse
```

Stdout contains exactly one compressed JSON result. Diagnostics go to stderr.

- [ ] **Step 5: Run core tests**

Expected: PASS.

### Task 6: Codex And Claude Code Adapters

**Files:**
- Create: `scripts/hooks/adapters/codex-hook-adapter.ps1`
- Create: `scripts/hooks/adapters/claude-hook-adapter.ps1`
- Create: `scripts/hooks/fixtures/codex/*.json`
- Create: `scripts/hooks/fixtures/claude/*.json`
- Create: `scripts/test-hook-adapters.ps1`
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Add fixture tests for all seven lifecycle hooks**

For each provider add fixtures for:

```text
PreToolUse
PostToolUse
PermissionRequest
UserPromptSubmit
SubagentStart
SubagentStop
Stop
```

Test:

```text
native fixture -> canonical event -> canonical result -> native response
```

- [ ] **Step 2: Verify adapter tests fail**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-adapters.ps1
```

Expected: FAIL because adapter functions are missing.

- [ ] **Step 3: Implement Codex mapping**

Map lifecycle names exactly as specified. In `observe`, emit a native response that does not block or mutate the tool call. Preserve Codex hook correlation identifiers when provided.

- [ ] **Step 4: Implement Claude Code mapping**

Map Claude Code native fields into the same canonical contract. In `observe`, return no deny decision and preserve native exit semantics.

- [ ] **Step 5: Add unsupported capability diagnostics**

Return `unsupported` diagnostics when a provider payload lacks evidence needed for `skill.selected`, `skill.loaded`, or `subagent.selected`. Do not synthesize these events.

- [ ] **Step 6: Run adapter tests**

Expected: all 14 lifecycle fixtures pass.

### Task 7: Shared HTTP Transport

**Files:**
- Create: `scripts/hooks/transports/hook-http-client.ps1`
- Modify: `scripts/hook-service.ps1`
- Modify: `scripts/test-hook-service.ps1`
- Modify: `.codex/config.toml`

- [ ] **Step 1: Add failing `/v1/events` tests**

Extend service tests to verify:

- `POST /v1/events` invokes the canonical pipeline
- `POST /events` remains a compatibility endpoint
- `teamId`, `projectId`, and `clientName` survive normalization
- optional shared token is checked only when configured
- oversized requests return HTTP 413
- malformed JSON returns HTTP 400
- audit-only requests return `abstain`

- [ ] **Step 2: Add failing HTTP client tests**

Test `failure_mode` values:

```text
abstain
fallback-cli
fail
```

Use a 1500 ms default timeout and verify timeout produces a structured result.

- [ ] **Step 3: Run service tests and verify failure**

Expected: existing tests pass until the new assertions, then fail on missing `/v1/events`.

- [ ] **Step 4: Route HTTP requests through the unified pipeline**

Keep:

```text
GET /health
GET /status
POST /reload
POST /events
```

Add:

```text
POST /v1/events
```

The server must never execute commands from event payloads.

- [ ] **Step 5: Add MVP shared-server configuration**

Add neutral configuration keys:

```toml
[hooks.core]
enabled = true
mode = "observe"
transport = "cli"
timeoutMs = 1500
failureMode = "abstain"

[hooks.http]
url = "http://127.0.0.1:42890/v1/events"
sharedTokenEnv = ""
teamId = ""
projectId = ""
clientName = ""
maxRequestBytes = 262144
```

Preserve `[hooks.project]` during compatibility migration.

- [ ] **Step 6: Run hook service tests**

Expected: `hook-service tests passed`.

### Task 8: Non-Invasive Codex And Claude Installation

**Files:**
- Create: `scripts/hooks/install/hook-install-common.ps1`
- Create: `scripts/hooks/install/hook-install-codex.ps1`
- Create: `scripts/hooks/install/hook-install-claude.ps1`
- Create: `scripts/install-hooks.ps1`
- Create: `scripts/test-hook-install.ps1`
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Write failing installer classification tests**

Use temporary homes/projects and test classifications:

```text
owned
external
managed
unknown
```

Verify default outcomes:

- owned hook: update idempotently
- external hook with verified multi-hook support: add observer
- unknown hook: safe skip
- managed hook: blocked
- no hook: install

- [ ] **Step 2: Run installer tests and verify failure**

Expected: FAIL because installer helpers do not exist.

- [ ] **Step 3: Implement structured JSON installation**

Use `ConvertFrom-Json` and object mutation for Codex `hooks.json` and Claude Code `settings.json`. Do not use regex replacement. Attach ownership metadata:

```json
{
  "owner": "codex-workflow-kit",
  "schemaVersion": "1",
  "adapter": "codex"
}
```

When the native schema cannot carry metadata, use a sidecar manifest containing the exact installed command hash and target path.

- [ ] **Step 4: Implement install modes**

Expose:

```powershell
scripts/install-hooks.ps1 `
    -Provider codex `
    -Mode additive-observe `
    -Scope project `
    -TargetRoot 'E:\work\payment-service'
```

Supported modes are `safe-skip`, `additive-observe`, and `explicit-merge`. `explicit-merge` requires `-ConfirmExternalModification`.

- [ ] **Step 5: Implement uninstall ownership safety**

Remove only entries whose ownership marker or sidecar command hash matches the package. Never remove external entries.

- [ ] **Step 6: Run installer tests**

Expected: `hook install tests passed`.

### Task 9: Doctor And Rollout Diagnostics

**Files:**
- Create: `scripts/hook-doctor.ps1`
- Modify: `scripts/test-hook-install.ps1`

- [ ] **Step 1: Add failing doctor tests**

Test status output for:

- adapter installed/missing
- external conflict
- pending Codex trust review
- HTTP reachable/unreachable
- provider event unsupported
- duplicate package hook
- audit path writable/unwritable
- mode `observe`, `warn`, or `enforce`

- [ ] **Step 2: Implement structured doctor output**

Default text output uses:

```text
PASS    codex.PreToolUse       owned adapter installed
SKIP    claude.Stop            external hook preserved
WARN    http                   endpoint unreachable; client will abstain
```

Support `-Format json` for automation.

- [ ] **Step 3: Verify doctor never modifies configuration**

Hash all inspected config files before and after doctor execution and assert equality.

- [ ] **Step 4: Run installer/doctor tests**

Expected: PASS.

### Task 10: Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `docs/specs/cross-ide-hook-core.md` only if implementation differs from the approved design
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Document installation and operation**

Keep `README.md` and `README_VI.md` aligned. Include:

- local CLI mode
- shared HTTP server mode
- Codex and Claude installation commands
- safe coexistence behavior
- doctor usage
- `observe -> warn -> enforce`
- uninstall and rollback

- [ ] **Step 2: Run each focused test**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-core.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-flow.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-adapters.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/test-log-agent-event.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-hook-service.ps1
```

Expected: every command exits 0 with its pass summary.

- [ ] **Step 3: Run the structure validator with fix**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Expected: exit 0 and no unrelated file changes.

- [ ] **Step 4: Run selected verification**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Expected: all selected groups pass.

- [ ] **Step 5: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
```

Verify protected files were changed only under the approved scope, unrelated user changes remain untouched, and no runtime audit output was committed.

## Implementation Order And Checkpoints

Implement Tasks 1-5 first to produce a working local CLI core. Then implement adapters, HTTP transport, installation, and doctor in Tasks 6-9. Task 10 is the final documentation and repository gate.

Do not enable `enforce` by default in any task. The first working release is successful when:

1. Codex and Claude fixtures map to one canonical schema.
2. Local CLI and shared HTTP requests execute the same pipeline.
3. Existing audit tests remain compatible.
4. External hooks are preserved.
5. Audit failures do not block IDE behavior in `observe`.
6. Flow reports distinguish missing evidence from invalid execution.
