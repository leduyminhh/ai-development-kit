# Packs

`packs/` chứa các capability pack có thể cài đặt của AI Engineering Platform.
Pack là đơn vị người dùng cài bằng các lệnh như
`ai-engineering install platform security --target cursor`.

Mỗi pack sở hữu command, skill, template, workflow, schema và metadata
`pack.yaml` của chính nó. Policy dùng chung thuộc `core/`; MCP entrypoint trong
dự án đích được copy từ `mcp-servers/`.

## Cấu Trúc Một Pack

Hầu hết thư mục pack có cấu trúc:

- `pack.yaml`: metadata canonical, dependency, asset, command, skill và provider
  compatibility.
- `commands/`: hợp đồng command hướng người dùng, nối intent với required skill
  và MCP tool.
- `skills/`: instruction cho agent và tài nguyên hỗ trợ.
- `templates/`: template do pack sở hữu.
- `workflows/`: ghi chú workflow do pack sở hữu.
- `schemas/`: schema hoặc placeholder schema do pack sở hữu.
- `test/` hoặc `package.json`: chỉ có khi pack sở hữu runtime hoặc test.

## Bản Đồ Pack

| Pack | Capability | Pack Bắt Buộc | Pack Tùy Chọn | Asset Được Cài |
| --- | --- | --- | --- | --- |
| `architecture` | System design, architecture review, ADR, DDD, integration design, shared design, pattern và diagram. | Không có | Không có | Skill: `java-analyze`, `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate`; command: `review-architecture`; hook: `project-audit`. |
| `application` | Workflow backend, frontend, API, Spring, React, Kafka, Redis, phân tích Java và tài liệu triển khai. | `architecture` | `quality`, `security` | Skill: `java-analyze`, `doc-write`, `code-shared-design`, `react-code-generate`, `test-automation-validate`; command: `review-backend`, `implement-frontend`; hook: `project-audit`. |
| `data` | Review schema, indexing, migration, backup, restore và lập kế hoạch CDC. | Không có | `application` | Skill: `data-migration`; command: `migration-plan`. |
| `knowledge` | Tài liệu kỹ thuật, README, runbook, API docs, onboarding, changelog, diagram và transcript workflow. | Không có | `architecture` | Skill: `doc-write`, `diagram-generate`, `youtube-transcript`; command: `write-technical-doc`. |
| `platform` | Delivery, deployment, observability, incident response, vận hành workflow và git workflow. | Không có | `quality`, `security` | Skill: `git-workflow-design`, `using-workflow-kit`; command: `deployment-plan`; hook: `project-audit`. |
| `quality` | QA review, test automation, naming check, coverage, performance và quality verification. | Không có | Không có | Skill: `test-qa-review`, `test-automation-validate`, `naming-rule-validate`; command: `verify-quality`; hook: `project-audit`. |
| `security` | Review OWASP/CWE, secrets, threat modeling, dependency review và container security. | Không có | `quality` | Skill: `security-code-review`; command: `review-security`; hook: `project-audit`. |

## Quy Tắc Sở Hữu Skill

- Mỗi runtime skill có đúng một canonical owner: pack chứa
  `skills/<skill>/SKILL.md`.
- `core/routing/skill-registry.yaml` map canonical owner của skill và phải khớp
  với skill folder cùng `pack.yaml.skills`.
- `pack.yaml.assets.skills` có thể liệt kê skill dùng chung từ pack khác khi
  command của pack cần cài skill đó, nhưng điều này không biến pack đó thành
  canonical owner.
- Đặt skill triển khai, stack và source-code trong `application`; đặt skill về
  boundary hệ thống và phương pháp thiết kế trong `architecture`; đặt policy
  toàn repo và managed agent baseline trong `core/agents`, không đặt trong
  runtime pack skill.

## Quy Tắc Dependency

- Dependency bắt buộc được cài trước pack được yêu cầu. Ví dụ, cài
  `application` cũng cài `architecture`.
- Dependency tùy chọn không được cài tự động nếu người dùng không yêu cầu.
- Asset dùng chung có thể thuộc nhiều pack; ownership được theo dõi trong dự án
  đích tại `.ai-engineering/ownership.json`.

## Checklist Thay Đổi

- Cập nhật `pack.yaml` khi command, skill, dependency, adapter, hook hoặc asset
  có thể cài đặt thay đổi.
- Giữ command id và MCP tool id được namespace theo capability.
- Giữ metadata command của pack khớp với `core/routing/command-registry.yaml` và
  `mcp-servers/<pack>-mcp/mcp.json`.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau thay đổi metadata pack, command, skill, dependency
  hoặc mapping MCP.
