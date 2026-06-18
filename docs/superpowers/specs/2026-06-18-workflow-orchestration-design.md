# Workflow Orchestration Design

Status: approved

## Mục tiêu

Xây dựng hệ thống skill composition generic cho phép ghép **bất kỳ skill nào từ bất kỳ plugin nào** thành workflow khai báo (YAML), validate deterministic, và thực thi qua agent interpret.

Workflow là một **dependency graph của các skill steps**, mỗi step gọi một skill cụ thể
từ plugin registry, nhận input từ context hoặc step trước, kiểm tra gate, và xử lý lỗi
theo policy.

## Phạm vi

Trong phạm vi:

- Workflow DSL (YAML) — generic, không hardcode domain logic
- Workflow definitions: lưu ở project scope + global scope (shareable)
- Workflow runtime: state, logs, events — chỉ project scope
- CLI: init, validate, build, list, run, status, history, logs, clean, install
- Agent interpret runtime: agent đọc instruction, thực thi step-by-step, ghi state file
- Error handling: per-step policy (stop, retry, skip, fallbackStep)
- Versioning: workflow YAML version, phát hiện drift, migration hint
- Plugin integration: workflow definitions là asset type mới trong plugin.yaml
- Integration với existing CLI: mount, doctor, lifecycle, projection

Ngoài phạm vi:

- MCP server runtime cho workflow execution
- Web UI dashboard
- Remote workflow registry
- Cross-provider execution (ví dụ Codex call Claude tool qua MCP bridge)

## Thiết kế

### 1. Workflow DSL (Generic)

```yaml
# Schema: workflow-definition.schema.json

id: <string>                    # unique, ví dụ: "feature-delivery", "deploy-checkout"
description: "<string>"         # human-readable
version: "<semver>"
changelog:
  <version>: "<change notes>"

input:                          # context variables cần khi start
  <key>: "<template string>"    # $context.<key>, $context.source, v.v.

steps:
  - id: <string>                # unique trong workflow
    uses: <plugin>/<skill>      # plugin + skill từ skill-registry.yaml
    depends: [<step-id>, ...]   # optional, mặc định là sequential
    input:                      # template variables
      <key>: "<value | $steps[n].output | $context.key>"
    gates: [<condition>, ...]   # optional, "pass" | "fail" | custom
    onError:                    # optional, mặc định "stop"
      policy: stop | retry(N) | skip | fallback
      retryDelay: "<duration>"  # "30s", "1m"
      fallbackStep: <step-id>   # chỉ với policy: fallback
      notify: true | false
```

Các step mặc định chạy **sequential** theo thứ tự trong danh sách. `depends` chỉ cần khi
cần parallel hoặc dependency đặc biệt (skip intermediate steps).

### 2. Ví dụ workflow (generic, nhiều domain)

#### Ví dụ 1: Full-stack feature delivery (thay thế feature-delivery skill hiện tại)

```yaml
id: fullstack-feature
description: "Feature delivery: architecture → backend → frontend → integrate → review → test"
version: 1.0.0
changelog:
  1.0.0: "Initial workflow"

input:
  feature: "$context.feature"
  source: "$context.source"

steps:
  - id: design-arch
    uses: architecture/architecture-onion-design
    input:
      feature: "$context.feature"

  - id: design-api
    uses: application/api-contract-design
    depends: [design-arch]
    input:
      feature: "$context.feature"
      architecture: "$steps.design-arch.output"

  - id: plan-data
    uses: data/data-migration
    depends: [design-api]
    input:
      schema: "$steps.design-api.output.schema"

  - id: implement-backend
    uses: application/python-backend-engineer
    depends: [design-api]
    input:
      api: "$steps.design-api.output"

  - id: implement-frontend
    uses: application/react-code-generate
    depends: [design-api, implement-backend]
    input:
      api: "$steps.design-api.output"
      source: "$context.source"

  - id: integrate
    uses: application/feature-integrate
    depends: [implement-backend, implement-frontend, plan-data]
    input:
      backend: "$steps.implement-backend.output"
      frontend: "$steps.implement-frontend.output"

  - id: code-review
    uses: quality/test-qa-review
    depends: [integrate]
    input:
      source: "$context.source"

  - id: security-check
    uses: security/security-code-review
    depends: [integrate]
    input:
      source: "$context.source"
    gates: [pass]
    onError:
      policy: stop
```

#### Ví dụ 2: Database migration pipeline

```yaml
id: db-migration-pipeline
description: "Schema review → migration plan → dry-run → execute → verify"
version: 1.0.0
input:
  source: "$context.source"
  schema: "$context.schema"

steps:
  - id: schema-review
    uses: data/data-migration
    input:
      schema: "$context.schema"
    gates: [pass]

  - id: migration-plan
    uses: data/data-migration
    depends: [schema-review]
    input:
      schema: "$context.schema"
      source: "$context.source"

  - id: plan-approval
    uses: application/feature-review      # reuse review skill từ plugin khác
    depends: [migration-plan]
    input:
      artifact: "$steps.migration-plan.output"
    gates: [pass]

  - id: dry-run
    uses: data/data-migration
    depends: [plan-approval]
    input:
      plan: "$steps.migration-plan.output"
      dryRun: true

  - id: execute
    uses: data/data-migration
    depends: [dry-run]
    input:
      plan: "$steps.migration-plan.output"
    onError:
      policy: stop
      notify: true

  - id: verify
    uses: quality/test-automation-validate
    depends: [execute]
    input:
      target: "$context.source.database"
    onError:
      policy: retry(3)
      retryDelay: 10s
```

#### Ví dụ 3: Legacy workflow (deploy-checkout)

```yaml
id: deploy-checkout
description: "Security review → deploy staging → smoke test → notify"
version: 1.0.0
input:
  source: "$context.source"
  env: "staging"

steps:
  - id: security-review
    uses: security/security-code-review
    input:
      source: "$context.source"
    gates: [pass]
    onError:
      policy: stop

  - id: deploy-staging
    uses: platform/git-workflow-design
    depends: [security-review]
    input:
      env: staging
      source: "$steps.security-review.output"
    onError:
      policy: retry(3)
      retryDelay: 30s

  - id: smoke-test
    uses: quality/test-automation-validate
    depends: [deploy-staging]
    input:
      target: "$steps.deploy-staging.url"
    onError:
      policy: skip
      notify: true

  - id: create-release-note
    uses: knowledge/youtube-transcript
    depends: [smoke-test]
    input:
      result: "$steps.smoke-test.status"
    onError:
      policy: skip
```

### 3. Scope Model

#### Definitions (chia sẻ được — giữa các project)

```
Load definitions:
  ① project/.ai-engineering/workflows/definitions/    ưu tiên cao nhất
  ② ~/.ai-engineering/workflows/definitions/          fallback, merge

Project trùng id → override global.
```

| Nguồn | Đường dẫn | Cách tạo |
|-------|-----------|----------|
| Plugin ships workflow | `plugins/<plugin>/workflows/*.yaml` | Soạn tay, install sẽ copy |
| Project-specific | `project/.ai-engineering/workflows/definitions/` | Soạn tay, commit vào repo |
| User global | `~/.ai-engineering/workflows/definitions/` | Soạn tay, dùng được mọi project |

`aie install <plugin>` sẽ copy workflow definitions từ plugin vào scope tương ứng:

```
Project install:  plugin workflows → project/.../definitions/
Global install:   plugin workflows → ~/.ai-engineering/.../definitions/
```

#### Runtime (KHÔNG chia sẻ)

Tất cả generated files ghi vào project scope duy nhất:

```
project/.ai-engineering/workflows/runs/<workflow-id>/
├── state.json                 # real-time execution state
├── events.jsonl               # append-only event log
└── <run-timestamp>/
    ├── state.snapshot.json    # snapshot khi run kết thúc
    ├── summary.json           # tóm tắt run
    └── steps/
        └── <N>-<step-id>/
            ├── input.json
            ├── output.json
            ├── gates.json
            └── step.log
```

#### Decision Matrix

| Hành vi | Project có `.ai-engineering/` | Project KHÔNG có |
|---------|------------------------------|------------------|
| Đọc definitions | Project → Global (merge, project wins) | Global |
| Ghi runs/state/logs | ✅ Project | ❌ `aie workflow init` |
| List workflows | Project + Global (ghi chú source) | Global |
| `-g` flag list | Global definitions only | Global definitions only |
| Resume workflow | ✅ Chỉ project | ❌ |

### 4. Quy tắc Load (resolution algorithm)

```
resolveDefinitions(projectRoot, homeDir):
  projectDefs = projectRoot/.ai-engineering/workflows/definitions/
  globalDefs  = homeDir/.ai-engineering/workflows/definitions/

  defs = {}

  // Load global trước
  if globalDefs exists:
    for each yaml in globalDefs/*.yaml:
      defs[yaml.id] = { source: "global", path, yaml }

  // Load project sau — override nếu trùng id
  if projectDefs exists:
    for each yaml in projectDefs/*.yaml:
      defs[yaml.id] = { source: "project", path, yaml }

  return defs
```

### 5. Workflow Execution Model

#### Agent là runtime chính

Mỗi workflow build sinh một section trong AGENTS.md instruction.
Agent đọc instruction và tự interpret:

```
## Workflow: fullstack-feature

Steps (execute in order, respect depends):
1. architecture/architecture-onion-design
   Input: { feature: $context.feature }
   → Save output to state.json

2. application/api-contract-design
   Depends on: step 1
   Input: { feature: $context.feature, architecture: $steps[1].output }
   → Save output to state.json

3. ... (remaining steps)

State file: .ai-engineering/workflows/runs/fullstack-feature/state.json
Logs: .ai-engineering/workflows/runs/fullstack-feature/<run-id>/steps/<N>-<id>/step.log
Events: .ai-engineering/workflows/runs/fullstack-feature/events.jsonl

Error policy:
  - Nếu step fail: kiểm tra onError
    - stop → dừng, report lỗi
    - retry(N) → thử lại tối đa N lần
    - skip → ghi warning, chạy step kế
    - fallback → chạy step thay thế
```

#### Agent execution loop

```
1. Đọc workflow instruction từ AGENTS.md
2. Kiểm tra state.json có run đang dang dở không → resume?
3. Tạo run ID
4. For each step:
   a. Kiểm tra depends hoàn thành (state.json)
   b. Resolve input ($steps[n].output, $context.*)
   c. Ghi input.json
   d. Thực thi skill
   e. Kiểm tra gate
   f. Ghi output.json, step.log, gates.json
   g. Append event vào events.jsonl
   h. Update state.json: currentStep++
5. Kết thúc: snapshot, summary
```

### 6. CLI Commands

```
Usage:
  aie workflow init                    # Tạo .ai-engineering/workflows/{definitions,runs}/
  aie workflow list [--json] [-g]      # List definitions (merge, ghi chú source)
  aie workflow validate [<id>]         # Validate graph, skill, cycle, schema
  aie workflow build [<id>]            # Project definitions vào AGENTS.md
  aie workflow run <id>                # Check + signal agent
  aie workflow status <id> [--run id]  # Đọc state.json → trạng thái
  aie workflow history <id>            # Đọc events.jsonl → timeline
  aie workflow logs <id> --run <id> [--step <id>]  # step.log
  aie workflow clean [<id>] [--keep N] [--dry-run]  # Xóa runs/, giữ definitions/
  aie workflow install <plugin>        # Copy workflow definitions từ plugin vào scope
```

### 7. Error Handling

```
onError:
  policy: stop             # Mặc định. Dừng workflow, báo lỗi + list errors.
         | retry(N)        # Thử lại N lần, delay giữa các lần
         | skip            # Bỏ qua, chạy step kế (ghi warning vào events)
         | fallback        # Chạy step thay thế
  retryDelay: "<duration>" # "30s", "1m" — chỉ dùng với retry
  fallbackStep: <step-id>  # Step thay thế — chỉ dùng với fallback
  notify: true | false     # Ghi event đặc biệt vào events.jsonl
```

**Gates behavior:**
- `gates: [pass]` → output phải có status pass
- `gates: [fail]` → output phải có status fail
- Nếu gate không đạt → xử lý như error, dùng `onError` policy
- Mặc định cho gate fail: `stop` (security, critical paths)

### 8. Versioning & Migration

```
workflow definition:
  version: 1.2.0
  changelog:
    1.2.0: "Add notify step after smoke test"
    1.1.0: "Change deploy target"
    1.0.0: "Initial"

Phát hiện drift (doctor):
  - definitions/<id>.yaml → version 1.2.0
  - AGENTS.md → projected version 1.0.0
  → "Workflow <id> cần build lại. Chạy: aie workflow build"

Runtime pin:
  - state.json ghi version: 1.0.0 (tại thời điểm start)
  - latestVersion: 1.2.0 (definition hiện tại)
  - Nếu có run đang running + version drift:
    Hỏi user: (1) Tiếp tục version cũ (2) Restart version mới
```

### 9. Cấu trúc thư mục đầy đủ

```
project/.ai-engineering/
├── workflows/
│   ├── definitions/              # COMMITTED (git)
│   │   ├── fullstack-feature.yaml
│   │   ├── db-migration-pipeline.yaml
│   │   └── deploy-checkout.yaml
│   └── runs/                     # GITIGNORED (trong .gitignore)
│       ├── fullstack-feature/
│       │   ├── state.json
│       │   ├── events.jsonl
│       │   └── 20260618T100000Z/
│       │       ├── state.snapshot.json
│       │       ├── summary.json
│       │       └── steps/
│       │           ├── 01-design-arch/
│       │           ├── 02-design-api/
│       │           └── ...
│       ├── db-migration-pipeline/
│       └── deploy-checkout/
├── manifest.yaml                 # existing
├── platform.lock                 # existing
├── ownership.json                # existing
├── backups/                      # existing
└── core/                         # existing
```

### 10. Integration với Plugin System

Plugin có thể ship workflow definitions như một asset type:

```yaml
# plugins/application/plugin.yaml
assets:
  skills: [...]
  commands: [...]
  workflows:
    - workflows/fullstack-feature.yaml
```

```yaml
# plugins/security/plugin.yaml
assets:
  workflows:
    - workflows/security-audit-pipeline.yaml
```

Khi install:
- `aie install application` → copy `workflows/fullstack-feature.yaml` vào `.ai-engineering/workflows/definitions/`
- `aie install application -g` → copy vào `~/.ai-engineering/workflows/definitions/`

Dependency validation:
- Workflow reference skill `application/python-backend-engineer`
- Plugin `application` phải được install
- `aie workflow validate` kiểm tra điều này

### 11. Relationship với existing feature-delivery skill

`application/feature-delivery` hiện tại là orchestration hardcoded trong skill logic.
Với workflow system:

- Workflow `fullstack-feature` là **declarative replacement** cho feature-delivery
- Plugin vẫn giữ feature-delivery skill cho backward compat
- User có thể chọn: dùng skill cũ (nếu muốn) hoặc workflow mới (nếu muốn customize)
- Migration path: `aie workflow install application` → có sẵn fullstack-feature workflow

### 12. Tác động lên hiện tại

| Module | Tác động |
|--------|----------|
| `cli/src/lifecycle.mjs` | Thêm workflow asset type vào projection (copy YAML) |
| `cli/src/providers.mjs` | Projector xử lý workflow definitions |
| `cli/src/doctor.mjs` | Thêm workflow checks (definitions tồn tại, skill reference hợp lệ, version drift) |
| `cli/src/cli.mjs` | Thêm `workflow` subcommand group |
| `core/routing/skill-registry.yaml` | Dùng để validate `uses:` reference |
| `core/schemas/` | Thêm `workflow-definition.schema.json` |
| `plugins/*/plugin.yaml` | Thêm `assets.workflows` (optional) |

Không tác động:
- Command contracts (`commands/*.md`)
- Projection contracts
- Install wizard
- Transaction mechanism
- Existing skills

### 13. Rủi ro và kiểm soát

| Rủi ro | Kiểm soát |
|--------|-----------|
| Agent interpret không deterministic | Workflow build sinh instruction tường minh, step-by-step |
| Skill không tồn tại | Validate với skill-registry.yaml |
| Cycle dependency | Graph cycle detection trong validate |
| Version drift | Doctor detect + hint build lại |
| State file corrupt | events.jsonl append-only → rebuild state từ events |
| Global definition thay đổi giữa run | Pin version vào state.json lúc start |
| feature-delivery skill cũ vs workflow mới | Dual support, migration path rõ ràng |
| Plugin dependency missing | Validate kiểm tra plugin được install |

### 14. Tiêu chí hoàn thành

- [ ] Workflow DSL schema + JSON Schema
- [ ] Validate: graph, cycle, skill-exists, gate, error policy
- [ ] `aie workflow init` → tạo structure đúng
- [ ] `aie workflow list` → merge project + global, ghi chú source
- [ ] `aie workflow build` → project vào AGENTS.md
- [ ] Agent instruction đủ deterministic để thực thi
- [ ] Agent ghi state.json, events.jsonl, step artifacts đúng path
- [ ] `aie workflow status/history/logs` → đọc và hiển thị
- [ ] `aie workflow clean` → chỉ xóa runs/, giữ definitions/
- [ ] `aie workflow install <plugin>` → copy workflow definitions
- [ ] Per-step error policy hoạt động (stop, retry, skip, fallback)
- [ ] Plugin.yaml có assets.workflows (optional)
- [ ] Lifecycle/doctor xử lý workflow definitions
- [ ] Backward compat: feature-delivery skill vẫn hoạt động
- [ ] 3 workflow examples đều validate pass
