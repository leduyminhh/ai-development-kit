# Plugin Projection And Command Contract Design

Status: approved design reconstructed from the prior thread and the current
plugin-platform migration.

## Mục tiêu

Chuẩn hóa hai phần đang bị trộn trách nhiệm:

1. Một command contract chuẩn duy nhất cho plugin, routing, MCP và provider
   projection.
2. Một projection contract chung để Codex, Claude và Cursor sinh artifact native
   mà không đưa logic đường dẫn provider vào lifecycle.

Kết quả cần đạt:

- `plugins/<plugin>/commands/*.md` là nguồn chuẩn duy nhất của command semantics.
- `plugin.yaml` chỉ khai báo command asset bằng đường dẫn file, không lặp metadata
  command.
- `core/routing/command-registry.yaml` là chỉ mục dẫn xuất, không phải nguồn khai
  báo song song.
- Adapter là lớp duy nhất quyết định đường dẫn và định dạng provider-native.
- Lifecycle chỉ resolve graph, materialize projection, quản lý ownership/state và
  áp dụng transaction.
- Project install, global install, artifact build và doctor dùng cùng một
  projection model.

## Phạm vi

Thiết kế áp dụng cho:

- Bảy plugin chuẩn dưới `plugins/`.
- Ba provider `codex`, `claude`, `cursor`.
- Project và global install scope.
- CLI install, update, remove, check, doctor, build và validate.
- Command có hoặc không có MCP tool.

Ngoài phạm vi:

- Thêm provider mới.
- Đổi MCP transport khỏi stdio.
- Remote plugin registry hoặc tự động tải plugin.
- Thay đổi nội dung nghiệp vụ của skill, command hay MCP handler.
- Cung cấp một command surface giả cho provider không hỗ trợ native slash
  command.

## Vấn đề hiện tại

### Command có nhiều nguồn khai báo

Một command hiện có thể xuất hiện dưới bốn danh tính:

```text
assets.commands: review-backend
frontmatter id: review-backend
plugin.commands.id: application.review_backend
mcp_tool: application.review_source_code
```

`core/routing/command-registry.yaml` tiếp tục lặp `id`, `plugin` và `file`. Các
nguồn này có thể lệch nhau dù cùng mô tả một command.

### Provider projection chưa có ranh giới rõ

`cli/src/providers.mjs` render một phần artifact, trong khi
`cli/src/lifecycle.mjs` tự quyết định:

- skill destination;
- Codex agent destination;
- instruction destination;
- project/global provider behavior.

Do đó provider layout bị phân tán, artifact build và install có nguy cơ tạo output
khác nhau.

### Projection output chưa đủ giàu ngữ nghĩa

Projection hiện chủ yếu trả `files` chứa content. Nó chưa mô tả rõ:

- file được copy từ canonical asset hay được render;
- asset id dùng để gắn ownership;
- file instruction cần managed merge;
- file MCP config cần structured merge;
- provider artifact nào hợp lệ theo scope.

## Quyết định kiến trúc

Luồng chuẩn:

```text
plugin.yaml + canonical command/skill/agent assets
                    |
                    v
          canonical plugin graph
                    |
                    v
          common projection input
                    |
          +---------+---------+
          |         |         |
        Codex     Claude    Cursor
          |         |         |
          +---------+---------+
                    |
                    v
          provider projection plan
                    |
                    v
 lifecycle materialization + ownership + transaction
```

Ranh giới trách nhiệm:

| Thành phần | Trách nhiệm |
| --- | --- |
| Plugin contract loader | Đọc và validate manifest, command và canonical assets |
| Resolver | Resolve dependency graph, provider compatibility và ownership |
| Projection input builder | Tạo model provider-neutral từ resolved graph |
| Provider adapter | Chọn destination, render provider-native content và scope behavior |
| Lifecycle | Materialize source/content, merge managed files, transaction, state và rollback |
| Doctor | So sánh installed state với projection dự kiến |
| Builder | Đóng gói canonical assets và projection bằng cùng adapter contract |

Lifecycle không được chứa điều kiện kiểu:

```js
if (provider === "codex") {
  // chọn đường dẫn .agents hoặc .codex
}
```

Điều kiện layout provider chỉ tồn tại trong adapter tương ứng.

## Canonical Command Contract

### Nguồn chuẩn

Mỗi command có đúng một file:

```text
plugins/<plugin-id>/commands/<slug>.md
```

File command sở hữu toàn bộ semantic metadata. `plugin.yaml` chỉ tham chiếu file:

```json
{
  "assets": {
    "commands": [
      "commands/review-backend.md"
    ]
  }
}
```

Không giữ top-level `commands` metadata song song trong `plugin.yaml`.

### Frontmatter chuẩn

```yaml
---
id: application.review_backend
slug: review-backend
description: Review backend source code for production readiness.
version: 1.0.0
mcpTool: application.review_source_code
---
```

Quy tắc:

- `id` bắt buộc, namespaced theo `<plugin-id>.<action_name>`.
- Phần namespace phải khớp plugin sở hữu file.
- `slug` bắt buộc, dùng kebab-case và phải khớp tên file.
- `description` bắt buộc và không được rỗng.
- `version` bắt buộc, dùng semantic version và khớp version plugin.
- `mcpTool` tùy chọn.
- Khi có `mcpTool`, id phải namespaced và tool phải tồn tại trong MCP contract.
- Command không có `mcpTool` vẫn hợp lệ và chạy theo workflow/skill semantics.
- Provider filename luôn lấy từ `slug`, không suy diễn trực tiếp từ `id`.

### Body chuẩn

Command tiếp tục dùng các section:

```markdown
# Review Backend

## Intent

Review backend implementation and return prioritized findings.

## Inputs

- source scope

## Required Skills

- java-analyze

## Steps

1. Inspect project structure and stack.

## Output Contract

- summary
- findings
- verification
```

Mỗi section bắt buộc có nội dung. `Required Skills` chỉ được tham chiếu skill có
trong resolved plugin graph.

### Canonical model trong runtime

Loader chuẩn hóa command thành:

```js
{
  id: "application.review_backend",
  pluginId: "application",
  slug: "review-backend",
  description: "Review backend source code for production readiness.",
  version: "1.0.0",
  mcpTool: "application.review_source_code",
  intent: "...",
  inputs: ["source scope"],
  requiredSkills: ["java-analyze"],
  steps: ["Inspect project structure and stack."],
  outputContract: ["summary", "findings", "verification"],
  sourcePath: "plugins/application/commands/review-backend.md",
  markdown: "..."
}
```

Không consumer nào tự parse lại Markdown.

### Command registry

`core/routing/command-registry.yaml` trở thành chỉ mục dẫn xuất:

```json
{
  "schemaVersion": 2,
  "commands": [
    {
      "id": "application.review_backend",
      "plugin": "application",
      "slug": "review-backend",
      "file": "commands/review-backend.md",
      "mcpTool": "application.review_source_code"
    }
  ]
}
```

Quy tắc:

- Registry không chứa semantic body, required skills, steps hoặc output contract.
- `registry generate` sinh registry theo thứ tự command id.
- `validate` fail khi registry đã commit không khớp canonical command files.
- Loader/runtime không cần registry để đọc command; registry phục vụ routing index,
  kiểm tra và consumer cần lookup nhanh.

## Common Projection Contract

### Projection input

Mọi adapter nhận cùng một input:

```js
{
  schemaVersion: 1,
  scope: "project",
  provider: "claude",
  plugins: [
    { id: "architecture", version: "1.0.0" },
    { id: "application", version: "1.0.0" }
  ],
  skills: [
    {
      id: "java-analyze",
      sourcePath: "plugins/application/skills/java-analyze",
      owners: ["application"]
    }
  ],
  commands: [
    {
      id: "application.review_backend",
      slug: "review-backend",
      sourcePath: "plugins/application/commands/review-backend.md",
      owners: ["application"]
    }
  ],
  agents: [],
  hooks: [],
  mcpServers: {}
}
```

Input không chứa provider destination path.

### Projection output

Adapter trả một projection plan:

```js
{
  schemaVersion: 1,
  provider: "claude",
  scope: "project",
  assets: [
    {
      operation: "copy",
      assetType: "skill",
      assetId: "java-analyze",
      sourcePath: "plugins/application/skills/java-analyze",
      destinationPath: ".claude/skills/java-analyze",
      owners: ["application"],
      shared: false
    },
    {
      operation: "render",
      assetType: "command",
      assetId: "application.review_backend",
      destinationPath: ".claude/commands/review-backend.md",
      content: "...",
      owners: ["application"],
      shared: false
    }
  ],
  instructions: [
    {
      destinationPath: "CLAUDE.md",
      templatePath: "core/agents/AGENTS.template.md"
    }
  ],
  mcpConfig: {
    destinationPath: ".mcp.json",
    format: "json",
    rootKey: "mcpServers",
    servers: {}
  }
}
```

Allowed asset operations:

- `copy`: copy canonical file hoặc directory.
- `render`: ghi content do adapter sinh.

Instruction và MCP config là descriptor riêng vì chúng dùng managed merge, không
phải replace file thông thường.

Mọi `destinationPath`:

- là relative path;
- không chứa `..`;
- được resolve bên trong install target;
- duy nhất trong một projection plan, trừ managed merge descriptor được khai báo
  rõ.

### Ownership

Adapter nhận owners đã resolve và chuyển nguyên vẹn vào projected asset.
Lifecycle ghi ownership metadata dựa trên:

```text
destinationPath + assetType + assetId + owners + shared
```

Adapter không đọc hoặc ghi state. Lifecycle không tự đoán owner từ destination.

## Provider Layout

### Codex

Project:

```text
<project>/AGENTS.md
<project>/.agents/skills/<skill>/
<project>/.codex/agents/<agent>.toml
<project>/.codex/agents/openai.yaml
<project>/.codex/workflows/commands.md
<project>/.codex/config.toml
```

Global:

```text
<home>/.codex/AGENTS.md
<home>/.agents/skills/<skill>/
<home>/.codex/agents/<agent>.toml
<home>/.codex/agents/openai.yaml
<home>/.codex/workflows/commands.md
<home>/.codex/config.toml
```

Codex command projection là một workflow catalog tổng hợp. Catalog phải giữ
canonical command id và slug; không quảng bá nó như native slash command.

### Claude

Project:

```text
<project>/CLAUDE.md
<project>/.claude/skills/<skill>/
<project>/.claude/commands/<slug>.md
<project>/.claude-plugin/plugin.json
<project>/.mcp.json
```

Global:

```text
<home>/.claude/CLAUDE.md
<home>/.claude/skills/<skill>/
<home>/.claude/commands/<slug>.md
<home>/.claude.json
```

Global projection không ghi `.claude-plugin/plugin.json`.

### Cursor

Project:

```text
<project>/AGENTS.md
<project>/.cursor/rules/<slug>.mdc
<project>/.cursor/rules/provider.json
<project>/.cursor/mcp.json
```

Global:

```text
<home>/.cursor/mcp.json
```

Cursor global scope không projection project rule, command hoặc skill.

## Install, Build Và Doctor

### Install/update

1. Load và validate canonical plugins.
2. Resolve dependency graph và ownership.
3. Load command model một lần.
4. Tạo common projection input.
5. Gọi adapter cho từng provider.
6. Materialize `copy` và `render` assets.
7. Merge instructions và MCP config.
8. Plan/apply transaction.
9. Ghi ownership, lock và installed state.

### Artifact build

Builder dùng cùng common projection input và adapter. Nó không tự dựng destination
khác với install.

Artifact giữ:

- canonical plugin assets;
- provider projection output;
- projection schema version;
- checksums.

### Doctor/check

Doctor tạo lại expected projection từ installed lock và kiểm tra:

- projected asset tồn tại;
- checksum/managed content hợp lệ;
- instruction managed block tồn tại;
- MCP managed registrations khớp;
- không còn managed legacy path;
- command id, slug và provider filename khớp canonical model.

Asset discovery không dựa vào regex path chung làm nguồn chính. Ownership metadata
phải lưu `assetType` và `assetId`; regex chỉ dùng để đọc state version cũ.

## Error Handling

Validation fail-loud với lỗi có thể hành động:

```text
command application.review_backend slug must match review-backend.md
command application.review_backend references unknown skill java-analyze
command application.review_backend references missing MCP tool application.review_source_code
projection claude/project contains duplicate destination .claude/commands/review-backend.md
projection codex/global escapes target root: ../AGENTS.md
```

Không áp dụng một phần projection khi adapter trả plan không hợp lệ.

Nếu materialization hoặc merge thất bại, transaction rollback cả:

- provider assets;
- instruction managed blocks;
- MCP config;
- ownership và installed state.

## Migration Compatibility

Trong một migration window:

- Loader có thể đọc `assets.commands` dạng command slug cũ.
- Loader có thể đọc top-level `plugin.commands` để xác định legacy id và MCP tool.
- Loader chuẩn hóa cả hai dạng về canonical command model.
- Validation cảnh báo legacy input; canonical repository validation vẫn yêu cầu
  format mới.
- Update xóa legacy managed paths chỉ khi ownership chứng minh platform sở hữu.
- Không xóa user-owned `commands/`, `skills/` hoặc provider files.

Sau migration:

- `plugin.yaml` không còn top-level `commands`.
- `assets.commands` chỉ chứa relative command file paths.
- command frontmatter dùng namespaced id và explicit slug.
- registry schema version là `2`.

## File Boundaries Dự Kiến

Thiết kế ưu tiên tách trách nhiệm thay vì tiếp tục mở rộng
`cli/src/lifecycle.mjs`:

```text
cli/src/command-contracts.mjs
  load, normalize và validate canonical commands

cli/src/projection-contracts.mjs
  validate common projection input/output và contained paths

cli/src/projection-input.mjs
  build provider-neutral input từ resolved graph

cli/src/providers.mjs
  dispatch sang adapter tương ứng, không chứa lifecycle/state

cli/src/lifecycle.mjs
  materialize projection và transaction

adapters/codex/projector.mjs
adapters/claude/projector.mjs
adapters/cursor/projector.mjs
  provider layout và rendering
```

`cli/src/contracts.mjs` tiếp tục quản lý platform/plugin contract, nhưng command
parsing chuyển sang module riêng.

## Chiến Lược Test

### Command contract

- Parse command hợp lệ có namespaced id, slug và optional MCP tool.
- Từ chối id namespace sai plugin.
- Từ chối slug không khớp filename.
- Từ chối version không khớp plugin.
- Từ chối skill hoặc MCP tool không tồn tại.
- Generate registry schema version 2 deterministically.

### Projection contract

- Cùng input tạo output deterministic.
- Mọi path relative và contained.
- Không destination trùng.
- Ownership được giữ nguyên.
- Project/global matrix đúng cho cả ba provider.

### Lifecycle

- Install/update/remove dùng projection plan.
- Rollback khi copy, render, instruction merge hoặc MCP merge lỗi.
- Managed legacy path được cleanup; user-owned path được giữ.

### Builder và doctor

- Build và install tạo cùng provider asset set.
- Doctor phát hiện thiếu hoặc sai projected command.
- Doctor dùng ownership metadata mới và vẫn đọc state cũ.

### Verification

```powershell
npm test
npm run validate
npm run build:cli
```

Smoke matrix:

| Scope | Codex | Claude | Cursor |
| --- | --- | --- | --- |
| Project | required | required | required |
| Global | required | required | required |

## Tiêu Chí Hoàn Thành

- Mỗi command chỉ có một semantic source file.
- Không còn command metadata trùng trong `plugin.yaml`.
- Registry được generate và khớp canonical commands.
- Lifecycle không chứa provider-specific destination path.
- Builder, install và doctor dùng cùng projection contract.
- Codex, Claude và Cursor tạo đúng native layout theo scope.
- Command không bắt buộc phải có MCP tool.
- Ownership lưu asset type/id thay vì phụ thuộc path regex.
- Migration giữ nguyên user content và chỉ cleanup managed legacy assets.
- Full test, validate, build và sáu smoke combinations đều đạt.

## Rủi Ro Và Kiểm Soát

- **Breaking manifest change:** hỗ trợ legacy read trong migration window và
  chuyển canonical repository trong một commit có validation.
- **Projection trùng path:** validate toàn bộ plan trước transaction.
- **Provider layout thay đổi:** cô lập trong adapter và khóa bằng matrix tests.
- **Registry drift:** generate deterministic và fail validation khi khác.
- **Doctor false positive:** dùng ownership metadata mới, giữ fallback cho state
  cũ.
- **MCP coupling:** `mcpTool` là optional; command workflow không phụ thuộc MCP khi
  plugin không yêu cầu runtime tool.
