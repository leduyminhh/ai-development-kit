# AI Engineering Platform

**Plugin AI engineering có thể cài từng phần cho Codex, Claude Code, Cursor và các AI coding agent khác.**

Phiên bản tiếng Anh: [README.md](README.md)

AI Engineering Platform đóng gói skills, commands, validators và provider adapters thành các plugin cài theo project. Một project có thể cài riêng một mảng năng lực, ví dụ backend hoặc security, hoặc cài toàn bộ platform.

## Bạn Nhận Được Gì

- **Plugins:** `architecture`, `backend`, `documentation`, `frontend`, `security`, `testing`.
- **Providers:** Codex, Claude Code và Cursor được sinh từ cùng một package contract chuẩn.
- **Lifecycle:** install, list, outdated, update, remove, build, registry và artifact verification thông qua `ai-engineering`.
- **Compatibility:** legacy AIDK PowerShell installer và `npx skills` vẫn được giữ cho direct skill install.

## Yêu Cầu

- Node.js 20 trở lên cho package `ai-engineering`.
- PowerShell cho repository validators và legacy installer scripts trên Windows.
- Git khi cài từ source hoặc cập nhật linked checkout.

## Quick Start

Chạy platform CLI:

```powershell
npx ai-engineering-platform --help
```

Cài một plugin vào project hiện tại:

```powershell
ai-engineering plugin install backend
ai-engineering plugin install backend --provider codex,claude,cursor
```

Cài toàn bộ platform:

```powershell
ai-engineering install --all
```

Kiểm tra plugin đã cài:

```powershell
ai-engineering plugin list
ai-engineering plugin outdated
```

Cập nhật plugin đã cài:

```powershell
ai-engineering plugin update backend
ai-engineering update --all --dry-run
```

Gỡ file do plugin quản lý:

```powershell
ai-engineering plugin remove backend
ai-engineering plugin remove backend --prune
ai-engineering remove --all
```

Managed-file drift sẽ dừng install, update và remove trừ khi truyền rõ `--force`.

## Cài Từ Source

Dùng luồng này khi phát triển platform hoặc kiểm thử thay đổi local trước khi publish:

```powershell
git clone https://github.com/leduyminhh/ai-engineering-platform
cd ai-engineering-platform
npm install
npm run build
npm link
```

Sau `npm link`, command `ai-engineering` sẽ khả dụng global từ local checkout.

## Plugin Packages

| Plugin | Mục đích |
|---|---|
| `architecture` | Review kiến trúc, Onion Architecture, shared contract design và diagrams. |
| `backend` | Backend review và workflow engineering thiên về JVM/Spring. |
| `documentation` | Technical docs, README sections, architecture notes, flow docs và handoff notes. |
| `frontend` | Workflow triển khai React/frontend. |
| `security` | Source-first security review và security scan workflows. |
| `testing` | QA review, regression planning và automated test validation. |

Mỗi package nằm dưới `packages/<plugin>/` và có thể gồm:

- `package.yaml` là package contract chuẩn.
- `commands/*.md` là provider-neutral command definitions.
- runtime skills được tham chiếu từ `skills/<name>/SKILL.md`.

## Distribution Model

`ai-engineering` build immutable plugin artifacts dưới `dist/plugins/<plugin>/<version>/`.

```powershell
node platform/bin/ai-engineering.mjs validate --json
node platform/bin/ai-engineering.mjs build --all --json
node platform/bin/ai-engineering.mjs registry generate --json
node platform/bin/ai-engineering.mjs artifact verify --all --json
```

npm là artifact source chính. GitHub Release archives mirror cùng nội dung plugin và là fallback.

## Compatibility: AIDK v1.1

Legacy AIDK installer vẫn hoạt động cho team muốn dùng PowerShell-driven package projection thay vì lifecycle của `ai-engineering`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action validate -Json

powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 `
  -Action install `
  -Package backend,security `
  -Provider codex,claude,cursor `
  -TargetRoot C:\path\to\project `
  -Json
```

Chỉ gỡ generated artifacts thuộc state quản lý:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 `
  -Action remove `
  -TargetRoot C:\path\to\project `
  -Json
```

Luồng này ghi `.aidk/install-state.json` sau khi generated artifacts và shared audit hooks được cài thành công.

## Compatibility: Direct Skill Install

Dùng luồng này khi agent chỉ cần từng Markdown skill riêng lẻ và không cần plugin lifecycle đầy đủ.

Đặt repository slug:

```powershell
$repo = "leduyminhh/ai-development-kit"
```

Các help command an toàn:

```powershell
npx skills --help
npx skills -h
```

Không thêm `--help` sau `skills add <source>`; `skills add` sẽ hiểu `<source>` là install target.

Liệt kê skill có sẵn:

```powershell
npx skills add $repo --list
```

Cài một skill:

```powershell
npx skills add $repo --skill security-code-review --agent codex -y
npx skills a $repo --skill security-code-review --agent codex -y
```

Cài default allowlist vào Codex:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review using-workflow-kit --agent codex -y
```

Cài một skill global cho Claude Code:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

Claude Code path kỳ vọng:

```text
~\.claude\skills\security-code-review\SKILL.md
```

Cài default allowlist cho Cursor:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review using-workflow-kit --agent cursor -y --copy
```

Kiểm tra trạng thái target:

```powershell
npx skills ls --agent codex
npx skills ls --agent claude-code
```

## Repository Layout

```text
ai-development-kit/
  packages/        # plugin package contracts và provider-neutral commands
  platform/        # ai-engineering CLI, lifecycle, artifact, registry và tests
  registry/        # generated plugin registry metadata
  schemas/         # schema contracts
  skills/          # runtime Markdown skills
  scripts/         # validators, installers và test runners
  .codex/          # local Codex agents, hooks, config và test map
  .codex-plugin/   # Codex plugin adapter
  .claude-plugin/  # Claude Code plugin adapter
  .cursor-plugin/  # Cursor plugin adapter
```

## Validation

Chạy bộ kiểm tra chính:

```powershell
npm test
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Chạy kiểm tra riêng cho platform:

```powershell
node platform/bin/ai-engineering.mjs validate --json
node platform/bin/ai-engineering.mjs build --all --json
node platform/bin/ai-engineering.mjs registry generate --json
node platform/bin/ai-engineering.mjs artifact verify --all --json
```

Nếu `README.md` thay đổi, cập nhật `README_VI.md` trong cùng change.

## Contributing

- Giữ plugin package contracts dưới `packages/<plugin>/`.
- Giữ runtime skill instructions dưới `skills/<name>/SKILL.md`.
- Đăng ký PowerShell test mới trong `.codex/test-map.toml`.
- Chạy selected tests trước khi commit.
- Không commit generated `node_modules/`, `dist/`, `.ai-engineering/`, `*.tgz` hoặc temporary files.

## License

MIT.
