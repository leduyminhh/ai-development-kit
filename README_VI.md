# Codex Workflow Kit

**Bộ workflow skill production-grade cho Codex, Claude Code, Cursor và các AI coding agent khác.**

Phiên bản tiếng Anh: [README.md](README.md)

Repository này đóng gói các agent skill tái sử dụng, validator, bộ định tuyến test, và template agent cục bộ theo project. Mục tiêu là giúp AI coding agent làm việc theo workflow kỹ thuật nhất quán: đọc trước khi viết, chỉnh sửa gọn đúng phạm vi, validate cấu trúc, chạy selected tests, review bảo mật, và ship qua một git workflow dự đoán được.

---

## Commands

Các lệnh phổ biến theo vòng đời repository.

| Nhu cầu | Command | Nguyên tắc |
|---|---|---|
| Liệt kê skill có thể install | `npx skills add . --list` | Inspect trước khi install |
| Xem CLI help | `npx skills --help` | Help ở top-level command |
| Xem help dạng ngắn | `npx skills -h` | Alias-friendly usage |
| Install default allowlist | `npx skills add . --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent codex -y` | Chỉ install danh sách được cho phép |
| Install một skill | `npx skills add . --skill security-code-review --agent codex -y` | Mặc định hẹp phạm vi |
| Alias add | `npx skills a . --skill security-code-review --agent codex -y` | Hỗ trợ command ngắn |
| Alias list | `npx skills ls --agent codex` | Xác minh trạng thái target |
| Update skill đã install | `npx skills update security-code-review` | Refresh có chủ đích |
| Validate repository | `powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix` | Fail loud |
| Chạy selected tests | `powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit` | Chỉ test phạm vi liên quan |

Không thêm `--help` sau command `skills add <source>`; CLI sẽ hiểu `<source>` là target install.

---

## Quick Start

<details open>
<summary><b>Codex local link</b></summary>

Clone repository này, sau đó link skills vào native skill discovery của Codex:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
```

Installer tạo Windows junction hoặc symlink:

```text
~\.codex\skills\codex-workflow-kit -> <repo>\skills
```

Sau đó cập nhật repository bằng:

```powershell
git pull
```

Skills sẽ cập nhật ngay qua link. Agents, hooks, và workflow config vẫn là template cục bộ theo project; chỉ import vào project khác khi thực sự cần.

</details>

<details>
<summary><b>Install từ GitHub URL</b></summary>

Dùng flow này trên máy khác khi bạn chỉ có link GitHub repository.

Step 1. Install Node.js LTS.

`npx` đi kèm với `npm`, nên install Node.js LTS là đủ cho flow `npx skills`. Kiểm tra tool:

```powershell
node --version
npm --version
npx --version
```

Step 2. Set repository URL:

```powershell
$repo = "leduyminhh/ai-development-kit"
```

Step 3. Xác nhận `skills` CLI chạy được qua `npx`:

```powershell
npx skills --help
npx skills -h
```

Step 4. Liệt kê skill có sẵn mà chưa install:

```powershell
npx skills add $repo --list
```

Step 5. Install một skill được cho phép vào Claude Code global skills:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

Command này phải tạo:

```text
~\.claude\skills\security-code-review\SKILL.md
```

Step 6. Install default allowed skills vào Codex:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent codex -y
```

Step 7. Install cùng danh sách skill được cho phép vào Claude Code:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent claude-code -g -y --copy
```

Step 8. Verify trên máy target:

```powershell
npx skills list --agent codex
npx skills list --agent claude-code
Test-Path "$HOME\.claude\skills\security-code-review\SKILL.md"
```

</details>

<details>
<summary><b>Claude Code</b></summary>

Install một skill global:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

Dùng `-g` để skill được đặt dưới thư mục global skills của Claude Code, và dùng `--copy` khi Claude Code cần nhận file vật lý thay vì link.

</details>

<details>
<summary><b>Cursor</b></summary>

`skills` CLI target Cursor thông qua shared agent skills path:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent cursor -y --copy
```

Cursor cũng có thể dùng skill text đã copy qua project rules nếu project không dùng CLI.

</details>

<details>
<summary><b>Agent khác</b></summary>

Skills là các file Markdown thuần dưới `skills/<name>/SKILL.md`. Agent nào hỗ trợ instruction file có thể đọc trực tiếp `SKILL.md` tương ứng, hoặc bạn có thể copy nội dung skill vào rule system của agent đó.

</details>

---

## Cross-IDE Hooks

Hook core cung cap mot event model chung cho Codex, Claude Code, va cac AI IDE adapter khac. Core normalize cac lifecycle hook nhu `PreToolUse`, `PostToolUse`, `PermissionRequest`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, va `Stop` thanh audit events nhu `agent.started`, `skill.selected`, `skill.loaded`, `subagent.started`, `subagent.completed`, va `agent.completed`.

Install hook runtime vao target project:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-hooks.ps1 -TargetRoot <project> -Provider all -Transport cli
```

Installer mac dinh khong xam lan. Neu `.codex/hooks` hoac `.claude/hooks` da co custom hook files, provider shims se duoc skip tru khi dung `-Force`. Core runtime files duoc copy vao `.ai-hooks`, va cac section `[hooks.core]` / `[hooks.http]` bi thieu se duoc append ma khong replace section da ton tai.

Chay hook doctor cuc bo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/hook-doctor.ps1 -Root .
```

Voi team HTTP transport, chay mot shared hook service va tro moi member ve cung endpoint:

```toml
[hooks.core]
enabled = true
mode = "observe"
transport = "http"
timeoutMs = 1500
failureMode = "abstain"

[hooks.http]
url = "http://127.0.0.1:42890/v1/events"
sharedTokenEnv = ""
teamId = ""
projectId = ""
clientName = ""
maxRequestBytes = 262144

[hooks.policy]
enabled = false
path = ".codex/hooks/policy.json"
```

HTTP endpoint nhan `POST /v1/events`, ghi canonical JSONL audit, giu `/events` cho legacy compatibility, tra `400` voi malformed JSON, `413` voi request qua lon, va chi check shared token khi `sharedTokenEnv` duoc cau hinh.

Inspect runtime evidence:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/query-hook-audit.ps1 -TraceId <trace-id> -Json
powershell -ExecutionPolicy Bypass -File scripts/view-hook-trace.ps1 -TraceId <trace-id> -Json
```

---
## Skill Catalog

Repository hiện có 15 skills. Default install allowlist được giữ nhỏ có chủ đích:

```text
agent-operating-rules
diagram-generate
doc-write
git-workflow-design
security-code-review
```

### Operating And Validation

| Skill | Chức năng | Dùng khi |
|---|---|---|
| [agent-operating-rules](skills/agent-operating-rules/SKILL.md) | Áp dụng execution discipline cấp repository: đọc trước, chỉnh sửa gọn, test đúng intent, fail loud. | Planning, editing, validating, hoặc xử lý instruction conflict. |
| [codex-structure-validate](skills/codex-structure-validate/SKILL.md) | Validate AGENTS.md, skills, agents, config, hooks, test mapping, và compliance theo skill spec. | Sau structure change hoặc trước khi xem repository work là hoàn tất. |
| [naming-rule-validate](skills/naming-rule-validate/SKILL.md) | Kiểm tra naming convention cho agents, skills, subagents, workflows, hooks, scripts, và validators. | Tạo hoặc rename Codex project artifacts. |

### Build And Architecture

| Skill | Chức năng | Dùng khi |
|---|---|---|
| [java-analyze](skills/java-analyze/SKILL.md) | Review Java/Spring architecture, flow, persistence, async risks, clean code boundaries, và test strategy. | Thiết kế hoặc review JVM backend services. |
| [architecture-onion-design](skills/architecture-onion-design/SKILL.md) | Áp dụng Onion Architecture và Palermo-style inward dependency rules. | Thiết kế domain-centered Java/Spring modules hoặc review framework leakage. |
| [code-shared-design](skills/code-shared-design/SKILL.md) | Thiết kế shared internal APIs, contracts, SDKs, và shared logic modules. | Xây module tái sử dụng hoặc publish/reuse giữa nhiều service. |
| [code-design-pattern](skills/code-design-pattern/SKILL.md) | Tư vấn design pattern với approval gates và overuse checks. | Chọn creational, structural, behavioral, hoặc architectural patterns. |
| [react-code-generate](skills/react-code-generate/SKILL.md) | Build hoặc chỉnh React UI từ Figma, ticket, text requirements, hoặc API examples. | Implement frontend application flows. |

### Verify, Document, And Ship

| Skill | Chức năng | Dùng khi |
|---|---|---|
| [security-code-review](skills/security-code-review/SKILL.md) | Thực hiện source-first security review, scoped scans, optional SonarQube/Trivy enrichment, report contracts, và `/fix` từ report trước. | Review source, diffs, configs, dependencies, hoặc project scan scope. |
| [test-qa-review](skills/test-qa-review/SKILL.md) | Suy ra QA scenarios, regression risks, verification commands, và findings ngắn gọn bằng tiếng Việt. | Sau architecture hoặc implementation work. |
| [test-automation-validate](skills/test-automation-validate/SKILL.md) | Lập kế hoạch, tạo, chạy, và ổn định automated tests trên nhiều stack. | Chuyển từ QA review sang executable verification. |
| [diagram-generate](skills/diagram-generate/SKILL.md) | Chọn và generate PlantUML diagrams thông qua focused diagram subagents. | Thiết kế hoặc review architecture, sequence, ERD, state, deployment, và diagram liên quan. |
| [doc-write](skills/doc-write/SKILL.md) | Tạo và cập nhật technical documentation, README sections, ADR-style notes, và handoff material. | Document architecture, features, flows, schemas, hoặc implementation context. |
| [git-workflow-design](skills/git-workflow-design/SKILL.md) | Xử lý branch, commit, merge, revert, release, hotfix, staging, push, và PR workflows. | Publish hoặc tổ chức git changes. |
| [youtube-transcript](skills/youtube-transcript/SKILL.md) | Download, fetch, transcribe, hoặc clean YouTube transcripts, captions, và subtitles. | Làm việc với YouTube URLs hoặc transcript artifacts. |

---

## How Skills Work

Mỗi runtime skill dùng cùng một shape:

```text
skills/<name>/
  SKILL.md              # frontmatter + workflow entry point
  agents/openai.yaml    # optional UI metadata
  resources/            # optional supporting references
  scripts/              # optional skill-owned tools and tests
  subagents/            # optional focused prompts owned by the skill
```

Frontmatter bắt buộc trong `SKILL.md`:

```yaml
---
name: lowercase-hyphen-name
description: Third-person trigger description that says what the skill does and when to use it.
---
```

Template top-level bắt buộc trong `SKILL.md`:

```text
YAML frontmatter
# Skill Name

## Overview
## When to Use
## Core Process
## Examples
## Common Rationalizations
## Red Flags
## Verification
## Resource Map
## Subagent Prompts
## Scripts
## Output Format
## Notes
```

Dùng [skills/SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) khi tạo hoặc cập nhật skill. Validator sẽ fail nếu runtime skill có H2 heading không khớp đúng thứ tự template này.

Design rules:

- **Progressive disclosure.** `SKILL.md` là entry point; supporting references chỉ load khi cần.
- **Flat runtime layout.** Runtime skills sống trực tiếp dưới `skills/<name>/`.
- **Source-backed docs.** Skills phải chỉ rõ agent cần inspect gì và evidence nào là bắt buộc.
- **Validation before completion.** Structural changes phải pass validator và selected tests.
- **No protected writes by default.** File dưới `docs/` và `reports/` cần explicit confirmation trước khi write.

---

## Project Structure

```text
ai-development-kit/
  AGENTS.md                         # repository-level agent instructions
  README.md                         # English README
  README_VI.md                      # Vietnamese README companion
  skills/                           # runtime skills
    agent-operating-rules/
    codex-structure-validate/
    security-code-review/
    ...
  .codex/
    agents/                         # project-local agent entry points
    agent-metadata/                 # read-only/hooks metadata for agent registry sync
    config.toml                     # deterministic behavior, guards, hooks, validation
    hooks/                          # project hook wrappers and hook libraries
    mcp/                            # MCP templates or snippets
    test-map.toml                   # selected test routing
  scripts/                          # shared project helpers and test runners
  references/                       # standards and external reference notes
  docs/                             # protected documentation outputs
  reports/                          # protected generated reports and audit logs
```

---

## Validation

Chạy structure validator:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root .
```

Chạy với `-Fix` để tạo hoặc đồng bộ scaffold directories và agent registry entries:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Validator kiểm tra:

- `AGENTS.md` guidance boundaries.
- `README_VI.md` tồn tại như bản tiếng Việt đi kèm `README.md`.
- `skills/<name>/SKILL.md` skill structure và agentskills-style metadata rules.
- `.codex/agents/<name>.toml` agent structure và skill references.
- `.codex/config.toml` safety defaults và agent registry.
- `.codex/test-map.toml` selected test mapping.
- Optional hooks, reports, và protected path policy.

Chạy selected tests cho thay đổi git hiện tại:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Chạy tests cho một activated skill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -ActivatedSkill architecture-onion-design
```

Mỗi file `*test*.ps1` mới phải được đăng ký trong `.codex/test-map.toml`.

Nếu `README.md` thay đổi, `README_VI.md` phải được cập nhật trong cùng change để tài liệu tiếng Việt không bị lệch.

---

## Why This Kit Exists

AI coding agents có thể đi rất nhanh, nhưng nếu thiếu repository-level rules thì chúng dễ bỏ qua validation, đọc quá rộng context, viết thay đổi quá lớn, hoặc miss install detail theo từng target. Kit này làm các workflow đó rõ ràng và tái sử dụng được:

- Skills encode task-specific workflows.
- Agents cung cấp project-local entry points.
- Validators enforce structure và skill-spec compliance.
- Selected tests giữ verification đúng phạm vi thay đổi thật.
- Install manifests giữ Codex, Claude Code, Cursor, và `npx skills` behavior đồng bộ.

---

## Contributing

Khi thêm hoặc thay đổi skill:

1. Giữ `SKILL.md` dưới 500 dòng khi có thể.
2. Dùng lowercase hyphenated skill names và để directory name khớp skill name.
3. Tuân thủ [skills/SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) đúng thứ tự top-level H2.
4. Đặt skill-owned scripts, tests, resources, và subagents dưới folder skill đó.
5. Register PowerShell test file mới trong `.codex/test-map.toml`.
6. Chạy validator và selected tests trước khi publish.
7. Nếu cập nhật `README.md`, cập nhật `README_VI.md` trong cùng change.

---

## License

MIT - dùng các skill này trong projects, teams, và tools của bạn.

