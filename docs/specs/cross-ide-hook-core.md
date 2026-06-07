# Cross-IDE Hook Core

## Status

- State: approved for implementation planning
- Audience: maintainers of `codex-workflow-kit`
- Scope: reusable lifecycle hook core, Codex adapter, Claude Code adapter, audit, installation, verification, and rollout

## Context

The repository currently provides a project hook framework with:

- configuration loading from `.codex/config.toml`
- agent registration gating
- event construction using schema `codex.project.event.v1`
- text, JSONL, and CSV formatting
- append-only audit writing
- retention cleanup
- an optional local HTTP service exposing `POST /events`

The verified current flow is:

```text
wrapper or POST /events
  -> validate required fields
  -> check project and agent gates
  -> construct event
  -> format event
  -> append audit file
  -> apply retention
```

The current implementation does not register native Codex or Claude Code hooks, normalize provider lifecycle payloads, return provider-specific decisions, validate complete agent flows, or reliably record skill and subagent selection.

## Goals

1. Provide one IDE-independent core for lifecycle processing.
2. Support these native lifecycle hooks:
   - `PreToolUse`
   - `PostToolUse`
   - `PermissionRequest`
   - `UserPromptSubmit`
   - `SubagentStart`
   - `SubagentStop`
   - `Stop`
3. Preserve and reuse the existing event, dispatch, audit writer, and retention behavior where compatible.
4. Add canonical audit events for agent, skill, subagent, tool, permission, prompt, and stop activity.
5. Support Codex and Claude Code through thin adapters.
6. Install without overwriting or silently modifying external hooks.
7. Coexist with built-in, managed, user, project, and plugin hooks.
8. Support gradual rollout through `observe`, `warn`, and `enforce` modes.

## Non-Goals

- Replacing the native hook engines of Codex or Claude Code.
- Depending on execution order between multiple native hooks.
- Automatically modifying an external hook owned by another package or user.
- Requiring the HTTP service for local operation.
- Guaranteeing skill selection visibility when the provider exposes no corresponding lifecycle signal.
- Providing a dashboard in the initial release.

## Architectural Decision

Use a hybrid architecture:

```text
Codex native hook  ----> Codex adapter  ----\
Claude native hook ----> Claude adapter -----> CLI transport ----\
Other provider     ----> Provider adapter ---/                    |
                                                                  v
                                                        Canonical Hook Core
                                                                  |
                                      +---------------------------+------------------+
                                      |                           |                  |
                                  Policy pipeline          Audit pipeline      Flow validator
                                      |                           |                  |
                                      +---------------------------+------------------+
                                                                  |
                                                     Decision and audit result

Optional HTTP transport ------------------------------------------^
```

The CLI transport accepts native JSON on stdin and writes a native-compatible decision to stdout. The optional HTTP transport calls the same application pipeline. No policy, audit rule, or lifecycle logic may be implemented only inside an adapter or transport.

## Module Boundaries

### Canonical Contract

Owns:

- canonical event names
- versioned input and output schemas
- identifiers and correlation fields
- normalized status and decision values

It must not depend on provider-specific field names.

### Provider Adapters

Each adapter:

1. parses the native payload
2. maps the native event to a canonical event
3. calls the core pipeline
4. maps the core result to the provider response format

Adapters must not write audit files, evaluate project policy, or maintain lifecycle state.

### Core Pipeline

The pipeline stages are:

```text
parse
  -> normalize
  -> validate contract
  -> deduplicate
  -> correlate trace/span
  -> evaluate policy
  -> emit audit
  -> update flow state
  -> return canonical result
```

Stages use explicit input/output contracts and fail with structured errors.

### Audit Pipeline

The audit pipeline reuses the existing formatter, writer, and retention capabilities after they are separated from Codex-specific naming. Audit failures are fail-open by default and must not block provider actions.

### Policy Pipeline

Policy modes:

| Mode | Behavior |
|---|---|
| `observe` | Record evidence and return `abstain`. |
| `warn` | Record evidence and return a warning or additional context without blocking. |
| `enforce` | Return an allow, ask, or deny decision when the provider supports it. |

Decision precedence inside this package is:

```text
deny > ask > allow > abstain
```

The package does not attempt to override decisions from other native hooks. Native IDE behavior remains authoritative when multiple hooks return decisions.

### Flow Validator

The flow validator evaluates correlated audit events and reports missing, duplicated, or invalid transitions. It does not infer that a skill or subagent ran solely because a prompt file exists.

### Shared HTTP Server MVP

The HTTP transport may run on another machine and serve multiple team members. Each member keeps a native provider adapter locally and points it to the shared endpoint:

```text
Codex or Claude Code
  -> local native command hook
  -> local provider adapter
  -> POST /v1/events
  -> shared canonical pipeline
  -> shared audit and flow state
  -> canonical decision
  -> provider-native response
```

Minimum client configuration:

```toml
[hooks.http]
url = "http://hook-server.internal:42890/v1/events"
timeout_ms = 1500
failure_mode = "abstain"
team_id = "backend"
project_id = "payment-service"
client_name = "developer-01"
shared_token_env = "AI_HOOK_TOKEN"
```

`shared_token_env` is optional. The MVP does not implement OAuth, OIDC, role-based authorization, multi-tenant policy isolation, signed policy distribution, or replay protection. Deployments should initially bind to a trusted internal network or VPN.

The shared server exposes:

```text
POST /v1/events
GET  /health
GET  /status
POST /reload
```

The request carries simple team, project, and client labels for filtering and audit correlation. These labels are not authorization boundaries in the MVP.

When the shared server is unavailable:

- `observe` and audit-only events return `abstain`
- the adapter may use the local CLI core when `failure_mode = "fallback-cli"`
- no cached local policy may silently weaken a future organization-level deny rule
- `enforce` mode remains opt-in and requires an explicit per-policy failure mode

## Canonical Event Model

Minimum envelope:

```json
{
  "schema": "ai.hook.event.v1",
  "eventId": "sha256:...",
  "eventName": "tool.before",
  "eventVersion": "1.0",
  "provider": "codex",
  "nativeEvent": "PreToolUse",
  "sourceHook": "workflow-kit",
  "mode": "observe",
  "sessionId": "...",
  "traceId": "...",
  "spanId": "...",
  "parentSpanId": "...",
  "timestamp": "2026-06-06T00:00:00Z",
  "cwd": "...",
  "actor": {},
  "resource": {},
  "payload": {},
  "metadata": {}
}
```

Required rules:

- `eventId` is stable for retries of the same native event.
- `traceId` groups one agent workflow.
- `spanId` identifies one agent, skill, subagent, tool, or permission activity.
- provider-native payloads may be retained only under a bounded, redacted field.
- secrets, prompt contents, tool outputs, and file contents are redacted by default.
- unknown fields are preserved only in `metadata` or provider payload extensions.

## Canonical Lifecycle Events

Native mappings:

| Native hook | Canonical event |
|---|---|
| `PreToolUse` | `tool.before` |
| `PostToolUse` | `tool.completed` |
| `PermissionRequest` | `permission.requested` |
| `UserPromptSubmit` | `prompt.submitted` |
| `SubagentStart` | `subagent.started` |
| `SubagentStop` | `subagent.completed` |
| `Stop` | `agent.completed` or `session.stopped` according to provider context |

Audit events required for workflow evidence:

```text
agent.started
skill.selected
skill.loaded
subagent.selected
subagent.started
subagent.completed
agent.completed
```

Additional useful events:

```text
prompt.submitted
tool.before
tool.completed
tool.failed
permission.requested
permission.resolved
session.stopped
flow.warning
flow.invalid
```

`skill.selected`, `skill.loaded`, and `subagent.selected` may be emitted only when supported by provider evidence or an explicit workflow-kit wrapper. Otherwise, the flow validator reports them as unavailable rather than fabricating evidence.

## Installation And Coexistence

The installer scans all supported hook sources before making changes and classifies each matching hook as:

- `owned`: created by this package and safe to update
- `external`: created by a user, IDE, organization, or another package
- `managed`: controlled by organization policy
- `unknown`: ownership cannot be proven

Ownership uses stable package markers and command identity, not command-text similarity alone.

Installation modes:

| Mode | Behavior |
|---|---|
| `safe-skip` | Skip an event when any non-owned matching hook exists. |
| `additive-observe` | Install an observer alongside existing hooks when the provider supports multiple hooks. |
| `explicit-merge` | Modify integration only after explicit approval and with a backup/rollback record. |

Default behavior:

- use `additive-observe` when coexistence is supported and verified
- otherwise use `safe-skip`
- never use `explicit-merge` implicitly

Installer output reports every event as `installed`, `updated`, `skipped`, `blocked`, or `unsupported`, including source and reason.

The uninstaller removes only entries carrying this package's ownership marker.

## Compatibility Rules

1. Audit handlers return `abstain` unless enforcement is explicitly enabled.
2. Processing must not depend on native hook ordering.
3. Duplicate delivery is handled through `eventId`.
4. Audit and telemetry use bounded timeouts and fail open.
5. Enforced security policy has an explicit fail-open or fail-closed setting.
6. The CLI works without a daemon.
7. HTTP port, storage path, and retention are configurable.
8. A single-instance lock protects the optional service without blocking CLI execution.
9. Provider adapters preserve existing native hooks and settings.
10. Unsupported native capabilities produce diagnostics instead of simulated success.

## Codex Adapter

The Codex adapter is installed as a command hook and must:

- consume Codex hook JSON from stdin
- map supported Codex matchers and lifecycle events
- emit only Codex-supported response fields
- use repository-root-stable paths
- tolerate concurrent execution of matching hooks
- expose package ownership for trust review and uninstall
- report when a changed command hook requires renewed trust

The adapter must not assume prompt or agent hook handlers execute when the current Codex runtime supports command handlers only.

## Claude Code Adapter

The Claude Code adapter must:

- consume Claude Code hook JSON from stdin
- use project or plugin root placeholders for stable paths
- map Claude decision fields and exit behavior correctly
- coexist with user, project, managed, built-in, session, skill, agent, and plugin hooks
- avoid installing when managed policy allows only managed hooks
- support plugin packaging for portable distribution

The first release uses command hooks even where Claude Code supports HTTP, prompt, agent, or MCP handlers, keeping one shared execution path across providers.

## Verification

### Unit Tests

- canonical contract validation
- event mapping
- redaction
- deterministic event ID generation
- decision aggregation
- flow transition validation
- writer formats and retention

### Contract Tests

Fixture-based contract tests cover every supported native event for Codex and Claude Code:

```text
native input -> canonical event -> canonical result -> native output
```

### Coexistence Tests

- existing external hook is preserved
- owned hook is updated idempotently
- unknown hook is skipped safely
- managed hook is not modified
- duplicate native events produce one audit record
- multiple hooks do not require execution ordering
- audit failure does not block tool execution in `observe`

### End-To-End Tests

- CLI invocation through stdin/stdout
- optional HTTP service invocation
- full agent/subagent correlated trace
- installer, doctor, update, and uninstall
- Windows path handling and PowerShell execution

### Required Repository Verification

After implementation:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Any new `*test*.ps1` file must be mapped under exactly one group in `.codex/test-map.toml`.

## Rollout

1. Preserve current audit behavior behind a compatibility wrapper.
2. Introduce the canonical core and CLI transport.
3. Run both old and canonical audit formatting against fixtures and compare output.
4. Release Codex and Claude adapters in `observe`.
5. Use `doctor` to report missing events, conflicts, trust, policy, and runtime dependencies.
6. Enable `warn` only after contract and coexistence tests pass.
7. Enable `enforce` per policy and event, never globally by default.
8. Retain rollback commands and remove only package-owned configuration.

## Packaging And Portability

Copying only `skills/` is insufficient. Portable distribution includes:

- skills
- hook core
- CLI and optional HTTP transports
- Codex and Claude Code adapters
- provider configuration templates
- installer, doctor, updater, and uninstaller
- tests and versioned event contracts

The preferred distribution unit is a versioned package or plugin with a repository-local development install option. Installation must validate PowerShell/runtime availability and run a smoke test before reporting success.

## Migration

Existing components are migration inputs:

- `.codex/hooks/lib/project-hook-event.ps1`
- `.codex/hooks/lib/project-hook-dispatch.ps1`
- `.codex/hooks/lib/project-hook-format.ps1`
- `.codex/hooks/lib/project-hook-writer.ps1`
- `.codex/hooks/lib/project-hook-retention.ps1`
- `.codex/hooks/log-agent-event.ps1`
- `scripts/hook-service.ps1`

Migration should preserve public behavior where useful while replacing Codex-specific core names with provider-neutral names. Compatibility wrappers should be removed only after callers and tests have migrated.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Native schemas change | Version provider fixtures and isolate mapping in adapters. |
| Hook latency affects tools | Keep audit synchronous work minimal; use bounded timeout and fail-open defaults. |
| Duplicate or reordered events | Stable IDs, idempotent writes, and transition-tolerant flow validation. |
| Sensitive data reaches audit | Default redaction, field allowlists, size limits, and explicit opt-in capture. |
| Existing hooks behave differently | No ordering assumptions; observer defaults; conflict diagnostics. |
| Installer damages settings | Structured parsing, ownership markers, backups for explicit merge, and idempotent tests. |
| Provider lacks skill events | Report evidence gaps; do not infer execution from configuration alone. |

## Open Implementation Decisions

These decisions belong in the implementation plan:

- final neutral directory names
- exact event ID input fields for each provider
- state storage strategy for deduplication and flow correlation
- compatibility duration for `codex.project.event.v1`

The MVP remains PowerShell-only to reuse the existing hook service and audit libraries. A future runtime migration must preserve the versioned canonical contract and adapter behavior.

## Sources

- User-approved requirements in the design conversation
- `.codex/config.toml`
- `.codex/hooks/log-agent-event.ps1`
- `.codex/hooks/lib/project-hook-config.ps1`
- `.codex/hooks/lib/project-hook-dispatch.ps1`
- `.codex/hooks/lib/project-hook-event.ps1`
- `.codex/hooks/lib/project-hook-format.ps1`
- `.codex/hooks/lib/project-hook-writer.ps1`
- `.codex/hooks/lib/project-hook-retention.ps1`
- `.codex/hooks/test-log-agent-event.ps1`
- `scripts/hook-service.ps1`
- `scripts/test-hook-service.ps1`
- `.codex/test-map.toml`
- Codex Hooks documentation
- Claude Code Hooks documentation

## Update Triggers

Update this specification when:

- Codex or Claude Code changes supported lifecycle events or decision schemas
- the canonical event schema changes
- a new provider adapter is added
- installation ownership or coexistence behavior changes
- rollout defaults move beyond `observe`
