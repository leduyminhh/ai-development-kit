# AI Engineering Platform

AI Engineering Platform là bộ capability dạng plugin cho các AI coding agent.
Nội dung chuẩn của skills, commands, agents, hooks, workflows, schemas và
templates nằm trong `plugins/`; CLI `aie` chiếu nội dung đó thành file native cho
Codex, Claude Code, Cursor và Google Antigravity.

## Quickstart

Yêu cầu Node.js 20 trở lên.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

Có thể dùng một trong hai tên CLI:

```bash
ai-engineering --help
aie -h
```

Cài capability vào một project đích:

```bash
cd /path/to/project

aie init
aie install
aie doctor
```

## Contents

- [Cấu Trúc](#cấu-trúc)
- [Cấu Trúc Chi Tiết](#cấu-trúc-chi-tiết)
- [Danh Mục Plugin](#danh-mục-plugin)
- [Getting Started](#getting-started)
- [Provider Outputs](#provider-outputs)
- [Maintainer Workflow](#maintainer-workflow)
- [Migration And Docs](#migration-and-docs)

## Cấu Trúc

| Đường dẫn | Mục đích |
| --- | --- |
| `plugins/` | Nội dung plugin chuẩn có thể cài đặt: manifest, skills, commands, agents, hooks, templates, workflows và schemas. |
| `core/` | AGENTS baseline, routing registry, schemas, standards, templates và workflow dùng chung. |
| `adapters/` | Logic projection cho Codex, Claude Code, Cursor và Antigravity. |
| `providers/` | MCP provider registry, config schemas, policies và ví dụ chưa active. |
| `cli/` | Source CLI `ai-engineering` / `aie`, `dist/` sinh ra, test và shell utilities giữ lại. |
| `docs/` | Hồ sơ migration, design spec, implementation plan và tài liệu repository. |
| `completions/` | Script shell completion cho `aie`. |

Markdown command trong `plugins/<plugin>/commands/*.md` là nguồn command chuẩn.
`core/routing/command-registry.yaml` là index dẫn xuất deterministic dùng
schema version 2.

## Cấu Trúc Chi Tiết

Mỗi plugin là một gói capability độc lập. Đặt nội dung canonical trong plugin sở
hữu hành vi, rồi để adapter chiếu thành file native theo từng provider.

```text
plugins/<plugin>/
  plugin.yaml                 manifest chuẩn, dependency và asset
  skills/<skill>/SKILL.md      quy trình agent tái sử dụng và reference
  commands/*.md                hợp đồng orchestration hướng người dùng
  agents/                      agent definition provider-neutral khi cần
  hooks/                       hook definition do plugin sở hữu khi cần
  workflows/*.yaml             workflow definition có thể cài đặt
  schemas/*.json               schema output cho command hoặc workflow
  templates/                   artifact sinh ra có thể tái sử dụng
  rules/                       rule do plugin sở hữu khi cần
```

| Asset | Vai trò | Ghi chú |
| --- | --- | --- |
| `plugin.yaml` | Khai báo metadata, dependency, asset, provider compatibility, trigger và install behavior. | Cập nhật khi asset có thể cài đặt thay đổi. |
| `skills/<skill>/SKILL.md` | Định nghĩa quy trình domain có thể tái sử dụng. | Skill sở hữu reference, script, subagent và verification rules. |
| `commands/*.md` | Định nghĩa entry point hướng người dùng. | Command chứa intent, input, required skills, steps và output contract. |
| `agents/` | Định nghĩa specialized agent có thể chạy. | Codex nhận `.codex/agents/*.toml`; Claude và Antigravity nhận bản Markdown. |
| `hooks/` | Thêm provider hook hoặc audit hook. | Chỉ project khi provider hỗ trợ. |
| `workflows/` | Lưu workflow definition cài vào `.ai-engineering/workflows/definitions/`. | Dùng `aie workflow <subcommand>` để chạy và inspect workflow state. |
| `schemas/` | Lưu JSON schema cho output command hoặc workflow. | Frontmatter `outputSchema` của command phải trỏ tới schema đã khai báo. |

## Danh Mục Plugin

| Plugin | Capability | Plugin bắt buộc | Skills chính | Commands / Workflows chính |
| --- | --- | --- | --- | --- |
| `architecture` | Review kiến trúc, boundary, shared contract, pattern và diagram. | Không có | `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate` | `review-architecture`, `architecture-review-pipeline` |
| `application` | Feature delivery cho backend, frontend, API, Spring, React, Kafka và Redis. | `architecture`, `quality`, `security`, `data` | `api-contract-design`, `java-implement`, `python-implement`, `react-implement` | `deliver-feature`, `plan-feature`, `implement-backend`, `implement-frontend`, `test-feature`, `feature-delivery-pipeline` |
| `data` | Lập kế hoạch migration cho database quan hệ và document. | Không có | `data-migration` | `plan-migration`, `db-migration-pipeline` |
| `knowledge` | Tài liệu kỹ thuật, README, onboarding, changelog và release notes. | Không có | `doc-write`, `release-notes` | `write-technical-doc`, `write-release-notes`, `documentation-pipeline` |
| `platform` | Git workflow, deployment planning, workflow-kit bootstrap và incident response. | Không có | `git-workflow-design`, `using-workflow-kit`, `incident-response` | `plan-deployment`, `respond-incident`, `incident-response-pipeline` |
| `quality` | QA review, test automation, naming validation, coverage và verification. | Không có | `test-qa-review`, `test-automation-validate`, `naming-rule-validate` | `verify-quality`, `quality-verification-pipeline` |
| `security` | OWASP/CWE review, secrets, threat modeling, dependency review và container security. | Không có | `security-code-review` | `review-security`, `security-audit-pipeline` |

## Getting Started

### Install

Chạy `aie install` trong terminal tương tác để mở install wizard. CLI phát hiện
tín hiệu provider và ngữ cảnh project, đề xuất plugin, hỗ trợ `antigravity`, xem
trước install plan và có thể resume phiên bị gián đoạn từ
`.ai-engineering/install/session.json`.

Phím trong wizard:

- `Up/Down` hoặc `j/k`: di chuyển giữa các mục.
- `Space`: bật/tắt plugin hoặc provider.
- `Enter`: tiếp tục hoặc xác nhận install plan.
- `Esc` hoặc `q`: hủy.
- `b`: quay từ step con về step cha.
- `Install all plugins`: chọn toàn bộ plugin; bật lại lần nữa sẽ bỏ chọn toàn bộ.

### Flow CLI Tương Tác

```bash
aie init
aie install
aie check
aie doctor
aie remove
aie upgrade
```

### Step 1: Install

```bash
aie install application --target codex --yes
aie install application --with quality
aie install --all --target codex --yes
aie install --all --target antigravity --yes
```

Scope mặc định là project. Dùng `-g` hoặc `--scope global` cho vị trí provider
global của user:

```bash
aie install --all --target codex -g
```

### Step 2: Check

```bash
aie check
aie doctor
```

### Step 3: Remove

```bash
aie remove
aie remove security
aie remove --all --yes
```

### Step 4: Upgrade

```bash
aie upgrade
aie upgrade --all --yes
aie update platform security --yes
aie upgrade --dry-run
```

Dùng alias lifecycle `aie update` khi muốn upgrade trực tiếp một số plugin cụ thể.

## Provider Outputs

Mọi scope đều lưu runtime, ownership, lock và backup dưới
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/workflows/commands/*.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `.claude/skills`, `.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Khi cập nhật instruction file, hệ thống giữ nguyên nội dung người dùng sở hữu
nằm ngoài AI Engineering baseline block và ghi backup dưới
`.ai-engineering/backups/`.

## Maintainer Workflow

Lệnh maintainer:

```bash
aie validate
aie schema check <plugin> <json-file> [--schema <relpath>]
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
aie generate-adapter <plugin...> --target <provider[,provider...]>
```

Xác minh repository:

```bash
npm run build:cli
npm test
npm run validate
npm run doctor
```

Shell completions là tùy chọn:

```bash
# Bash
source /path/to/aie-repo/completions/aie.bash

# Zsh
fpath=(/path/to/aie-repo/completions $fpath)
autoload -U compinit && compinit
```

Xem [SHELL_SETUP.md](SHELL_SETUP.md) để setup chi tiết.

## Migration And Docs

- [CHANGELOG.md](CHANGELOG.md): release notes và lịch sử phiên bản.
- [MIGRATION.md](MIGRATION.md): hướng dẫn upgrade từ naming và layout v1.0.
- [docs/migration/migrate-existing-source-to-plugins-platform.md](docs/migration/migrate-existing-source-to-plugins-platform.md): target migration plugin-first hiện tại.
- [docs/migration/completion-checklist.md](docs/migration/completion-checklist.md): tiêu chí hoàn tất migration.

v1.1 chuẩn hóa 7 plugin quanh noun-action skills, verb-noun commands và
domain-pipeline workflows. Phiên bản này cũng gộp các phase-specific feature
skills thành stack và domain skills như `java-implement`, `python-implement`,
`react-implement`, `test-qa-review` và `test-automation-validate`.

## Checklist Thay Đổi

- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Giữ bảng lệnh, provider path và plugin khớp với `plugins/`, `adapters/` và `core/routing/`.
- Chạy `npm run validate` sau thay đổi về cấu trúc, command id, provider path hoặc danh mục plugin.
