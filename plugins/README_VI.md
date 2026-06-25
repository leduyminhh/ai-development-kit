# Plugins

`plugins/` chứa các plugin AI IDE canonical có thể cài đặt của AI Engineering
Platform. Plugin là đơn vị người dùng cài bằng các lệnh như
`ai-engineering install platform security --target cursor` hoặc
`ai-engineering install platform security --target antigravity`.

Mỗi plugin sở hữu command, skill, agent, rule, template, workflow, schema trung
lập provider và metadata `plugin.yaml`. Policy dùng chung thuộc `core/`;
artifact riêng cho từng provider được sinh bởi `adapters/`; registry, policy và
ví dụ MCP được cấu hình qua `providers/`.

Các provider target hiện được hỗ trợ là `codex`, `claude`, `cursor` và
`antigravity`. Mỗi plugin khai báo hỗ trợ trong `compatibility.providers` của
`plugin.yaml`.

## Cấu Trúc

Thư mục plugin có cấu trúc:

- `plugin.yaml`: metadata canonical, dependency, asset, command, skill, runtime
  requirement và provider compatibility.
- `commands/`: hợp đồng command hướng người dùng, nối intent với required skill
  và optional MCP tool.
- `skills/`: instruction cho agent và tài nguyên hỗ trợ.
- `agents/`: agent definition do plugin sở hữu khi cần.
- `rules/`: rule do plugin sở hữu khi cần.
- `templates/`: template do plugin sở hữu khi cần.
- `workflows/`: workflow definition do plugin sở hữu khi cần.
- `schemas/`: schema do plugin sở hữu khi cần. Một command có thể tham chiếu
  output schema qua khóa frontmatter tùy chọn `outputSchema`; command sau khi
  chiếu sẽ kèm mục `Output Schema`.

Asset group chưa dùng vẫn giữ folder và khai báo `none` trong `plugin.yaml`.
Không tạo README placeholder chỉ để giữ folder.

## Bản Đồ Plugin

| Plugin | Năng lực | Plugin bắt buộc | Plugin tùy chọn | Asset được cài |
| --- | --- | --- | --- | --- |
| `architecture` | System design, architecture review, ADR, DDD, integration design, shared design, pattern và diagram. | Không có | `application` | Skills: `java-implement`, `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate`; command: `review-architecture`; workflow: `architecture-review-pipeline`; hook: `project-audit`. |
| `application` | Workflow backend, frontend, API, Spring, React, Kafka và Redis. | `architecture`, `quality`, `security`, `data` | Không có | Skills: `api-contract-design`, `java-implement`, `python-implement`, `react-implement`; commands bao phủ planning, implementation, integration, review và testing; workflow: `feature-delivery-pipeline`; hook: `project-audit`. |
| `data` | Lập kế hoạch schema và data migration cho cơ sở dữ liệu quan hệ và document, gồm tương thích, rollback và kiểm chứng. | Không có | `application` | Skill: `data-migration`; command: `plan-migration`; workflow: `db-migration-pipeline`. |
| `knowledge` | Tài liệu kỹ thuật, README, runbook, API docs, onboarding và changelog workflow. | Không có | `architecture` | Skills: `doc-write`, `release-notes`; commands: `write-technical-doc`, `write-release-notes`; workflow: `documentation-pipeline`. |
| `platform` | Delivery, deployment, observability, incident response, vận hành workflow và git workflow. | Không có | `quality`, `security` | Skills: `git-workflow-design`, `using-workflow-kit`, `incident-response`; commands: `plan-deployment`, `respond-incident`; workflow: `incident-response-pipeline`; hook: `project-audit`. |
| `quality` | QA review, test automation, naming check, coverage, performance và quality verification. | Không có | Không có | Skills: `test-qa-review`, `test-automation-validate`, `naming-rule-validate`; command: `verify-quality`; workflow: `quality-verification-pipeline`; hook: `project-audit`. |
| `security` | Review OWASP/CWE, secrets, threat modeling, dependency review và container security. | Không có | `quality` | Skill: `security-code-review`; command: `review-security`; workflow: `security-audit-pipeline`; hook: `project-audit`. |

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

## Ranh Giới Command Và Skill

- Command là entry point hướng người dùng. Command định nghĩa intent, input,
  required skill, bước điều phối và output contract.
- Skill là quy trình domain có thể tái sử dụng. Skill sở hữu operating mode chi
  tiết, reference, subagent prompt, script, quy tắc verification và output style
  cho capability của nó.
- Khi command trong một plugin cần capability do plugin khác sở hữu, hãy giữ
  command đó là wrapper có scope hẹp và delegate sang command hoặc skill
  canonical. Không sao chép toàn bộ quy trình của plugin khác.
- Command theo scope feature trong `application` có thể chuẩn bị context cho
  `quality`, `data`, `security` hoặc `knowledge`, nhưng các plugin đó vẫn là
  canonical owner cho verification, migration planning, security review và prose
  release notes.
- Nếu hai command có thể đáp ứng cùng một yêu cầu người dùng, hãy ghi rõ command
  nào là canonical và biến command còn lại thành compatibility wrapper hoặc
  entry point có scope cụ thể hơn.

## Quy Tắc Dependency

- Dependency bắt buộc được cài trước plugin được yêu cầu. Ví dụ, cài
  `application` cũng cài `architecture`.
- Dependency tùy chọn không được cài tự động nếu người dùng không yêu cầu.
- Asset dùng chung có thể thuộc nhiều plugin; ownership được theo dõi trong dự
  án đích tại `.ai-engineering/ownership.json`.

## Checklist Thay Đổi

- Cập nhật `plugin.yaml` khi command, skill, dependency, adapter, hook, runtime
  setting hoặc asset có thể cài đặt thay đổi.
- Giữ command id và MCP tool id được namespace theo capability.
- Giữ metadata command của plugin khớp với `core/routing/command-registry.yaml`.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau thay đổi metadata plugin, command, skill,
  dependency hoặc mapping MCP.
