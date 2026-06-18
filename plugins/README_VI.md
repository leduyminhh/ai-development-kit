# Plugins

`plugins/` chứa các plugin AI IDE canonical có thể cài đặt của AI Engineering
Platform. Plugin là đơn vị người dùng cài bằng các lệnh như
`ai-engineering install platform security --target cursor`.

Mỗi plugin sở hữu command, skill, agent, rule, template, workflow, schema trùng
lặp provider và metadata `plugin.yaml`. Policy dùng chung thuộc `core/`;
artifact riêng cho từng provider được sinh bởi `adapters/`; runtime MCP chỉ được
copy từ `mcp-servers/` khi plugin cần MCP.

## Cấu Trúc Một Plugin

Thư mục plugin có cấu trúc:

- `plugin.yaml`: metadata canonical, dependency, asset, command, skill, runtime
  requirement và provider compatibility.
- `commands/`: hợp đồng command hướng người dùng, nối intent với required skill
  và optional MCP tool.
- `skills/`: instruction cho agent và tài nguyên hỗ trợ.
- `agents/`: agent definition do plugin sở hữu khi cần.
- `rules/`: rule do plugin sở hữu khi cần.
- `templates/`: template do plugin sở hữu khi cần.
- `workflows/`: ghi chú workflow do plugin sở hữu khi cần.
- `schemas/`: schema do plugin sở hữu khi cần.

Asset group chưa dùng vẫn giữ folder và khai báo `none` trong `plugin.yaml`.
Không tạo README placeholder chỉ để giữ folder.

## Bản Đồ Plugin

| Plugin | Năng lực | Plugin bắt buộc | Plugin tùy chọn | Asset được cài |
| --- | --- | --- | --- | --- |
| `architecture` | System design, architecture review, ADR, DDD, integration design, shared design, pattern và diagram. | Không có | Không có | Skill: `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate`; command: `review-architecture`; hook: `project-audit`. |
| `application` | Workflow backend, frontend, API, Spring, React, Kafka, Redis, phân tích Java và tài liệu triển khai. | `architecture` | `quality`, `security` | Skill: `java-analyze`, `doc-write`, `code-shared-design`, `react-code-generate`, `test-automation-validate`; command: `review-backend`, `implement-frontend`; hook: `project-audit`. |
| `data` | Review schema, indexing, migration, backup, restore và lập kế hoạch CDC. | Không có | `application` | Skill: `data-migration`; command: `migration-plan`. |
| `knowledge` | Tài liệu kỹ thuật, README, runbook, API docs, onboarding, changelog, diagram và transcript workflow. | Không có | `architecture` | Skill: `doc-write`, `diagram-generate`, `youtube-transcript`; command: `write-technical-doc`. |
| `platform` | Delivery, deployment, observability, incident response, vận hành workflow và git workflow. | Không có | `quality`, `security` | Skill: `git-workflow-design`, `using-workflow-kit`; command: `deployment-plan`; hook: `project-audit`. |
| `quality` | QA review, test automation, naming check, coverage, performance và quality verification. | Không có | Không có | Skill: `test-qa-review`, `test-automation-validate`, `naming-rule-validate`; command: `verify-quality`; hook: `project-audit`. |
| `security` | Review OWASP/CWE, secrets, threat modeling, dependency review và container security. | Không có | `quality` | Skill: `security-code-review`; command: `review-security`; hook: `project-audit`. |

## Quy Tắc Sở Hữu Skill

- Mỗi runtime skill có đúng một canonical owner: plugin chứa
  `skills/<skill>/SKILL.md`.
- `core/routing/skill-registry.yaml` map canonical owner của skill và phải khớp
  với skill folder cùng `plugin.yaml.skills`.
- `plugin.yaml.assets.skills` có thể liệt kê skill dùng chung từ plugin khác khi
  command cần cài skill đó, nhưng điều này không biến plugin đó thành canonical
  owner.
- Đặt skill triển khai, stack và source-code trong `application`; đặt skill về
  boundary hệ thống và phương pháp thiết kế trong `architecture`; đặt policy
  toàn repo và managed agent baseline trong `core/agents`, không đặt trong
  runtime plugin skill.

## Quy Tắc Dependency

- Dependency bắt buộc được cài trước plugin được yêu cầu. Ví dụ, cài
  `application` cùng cài `architecture`.
- Dependency tùy chọn không được cài tự động nếu người dùng không yêu cầu.
- Asset dùng chung có thể thuộc nhiều plugin; ownership được theo dõi trong dự
  án đích tại `.ai-engineering/ownership.json`.

## Checklist Thay Đổi

- Cập nhật `plugin.yaml` khi command, skill, dependency, adapter, hook, runtime
  setting hoặc asset có thể cài đặt thay đổi.
- Giữ command id và MCP tool id được namespace theo capability.
- Giữ metadata command của plugin khớp với `core/routing/command-registry.yaml`
  và `mcp-servers/<plugin>/mcp.json` khi dùng MCP.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau thay đổi metadata plugin, command, skill,
  dependency hoặc mapping MCP.
