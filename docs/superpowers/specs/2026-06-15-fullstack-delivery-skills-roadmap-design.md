# Full-stack Delivery Skills And Commands Roadmap

## Mục tiêu

Nâng cấp capability packs để phục vụ một full-stack developer hoặc tech lead
thực hiện feature xuyên suốt React, API, Java/Spring, Python/FastAPI,
Python/Django REST Framework và database.

Thiết kế dùng command theo deliverable làm public API. Skill điều phối sở hữu
workflow dùng chung; subagent bên trong skill xử lý chi tiết theo stack. Người
dùng có thể chạy một bước độc lập hoặc gọi command tổng để hoàn thành toàn bộ
lifecycle.

## Nguyên tắc

1. `application` sở hữu workflow full-stack delivery.
2. Command mô tả kết quả kỹ thuật, không dùng tên phase chung chung.
3. Command giữ mỏng; workflow nằm trong skill; chi tiết framework nằm trong
   subagent.
4. Skill hiện có được tái sử dụng qua canonical ownership, không sao chép logic
   sang pack khác.
5. Chế độ `design` và `review` chỉ đọc. Chế độ `implement` và `fix` được sửa
   source, chạy test và báo bằng chứng.
6. Mặc định xử lý một feature. Lifecycle production mở rộng chỉ chạy khi người
   dùng yêu cầu.
7. Flow legacy bị thay thế phải được migrate hoặc deprecate; không duy trì hai
   workflow canonical cùng làm một việc.

## Command Public Của Application

| Command ID | Trách nhiệm |
| --- | --- |
| `application.plan_feature` | Phân rã yêu cầu thành UI, API, backend, data, test, dependency graph và acceptance gates. |
| `application.design_api_contract` | Thiết kế endpoint, request/response schema, validation, error model, authorization và compatibility. |
| `application.design_data_change` | Thiết kế schema, index, migration, backfill, reconciliation và rollback. |
| `application.implement_backend` | Phát hiện Java/Spring, FastAPI hoặc Django DRF và gọi subagent triển khai tương ứng. |
| `application.implement_frontend` | Triển khai React UI, state, API integration, loading, empty, error và accessibility states. |
| `application.integrate_feature` | Nối React, API, backend và database; phát hiện contract mismatch và lỗi integration. |
| `application.review_feature` | Review correctness, maintainability, API/data compatibility, security và regression xuyên stack. |
| `application.test_feature` | Thiết kế, sinh hoặc chạy unit, integration, contract và E2E tests phù hợp với feature. |
| `application.fix_feature` | Sửa findings hoặc test failures trong phạm vi được duyệt, sau đó kiểm chứng lại. |
| `application.deliver_feature` | Điều phối toàn bộ feature lifecycle và tổng hợp release readiness. |

Các command theo stack như `implement_java_backend` hoặc
`implement_fastapi_backend` không được đưa thành public API ở phiên bản đầu.
Stack routing là trách nhiệm nội bộ của skill và subagent.

## Skill Và Routing

`application` bổ sung các canonical skill:

| Skill | Command chính | Trách nhiệm |
| --- | --- | --- |
| `feature-plan` | `plan_feature` | Chuẩn hóa yêu cầu, phạm vi, dependency graph và acceptance gates. |
| `api-contract-design` | `design_api_contract` | Thiết kế contract xuyên frontend/backend và compatibility policy. |
| `feature-implement` | `implement_backend`, `implement_frontend` | Phát hiện stack, phân công subagent và quản lý implementation handoff. |
| `feature-integrate` | `integrate_feature` | Kiểm tra và sửa integration giữa các lớp của feature. |
| `feature-review` | `review_feature` | Tổng hợp review từ application, architecture, quality và security. |
| `feature-test` | `test_feature` | Điều phối test strategy và executable verification. |
| `feature-fix` | `fix_feature` | Áp dụng fix có kiểm soát từ findings hoặc failing tests. |
| `feature-delivery` | `deliver_feature` | Orchestrator toàn lifecycle và release gates. |

Ngoài 8 skill điều phối, `application` sở hữu skill chuyên môn
`python-backend-engineer`. Skill này chứa workflow Python dùng chung và route
đến hai subagent `fastapi-backend-implement` và
`django-drf-backend-implement`. Java và React tiếp tục dùng canonical skill
hiện có sau khi refactor.

`feature-implement` route theo tín hiệu repository:

```text
Backend
├── pom.xml, build.gradle, Spring config
│   └── java-spring-implement
├── pyproject.toml/requirements + FastAPI imports
│   └── fastapi-backend-implement
└── pyproject.toml/requirements + Django/DRF config
    └── django-drf-backend-implement

Frontend
└── package.json + React dependency
    └── react-frontend-implement
```

Khi có nhiều stack trong monorepo, skill lập danh sách target module và gọi
subagent riêng cho từng module. Nếu stack không xác định chắc chắn, skill báo
bằng chứng phát hiện và yêu cầu người dùng chọn thay vì đoán.

## Contract Handoff

Các skill trao đổi một feature context chuẩn gồm:

- mục tiêu và acceptance criteria;
- source scope và module ownership;
- stack signals đã phát hiện;
- UI states và user flow;
- API operations, schemas và error model;
- data changes và migration constraints;
- security/permission requirements;
- test matrix;
- artifact, findings, verification evidence và residual risks của từng bước.

Context chỉ chứa dữ liệu điều phối. Nó không thay thế source code, OpenAPI,
migration hoặc test artifact. Mỗi phase phải tham chiếu nguồn thực tế trước khi
đưa ra kết luận.

## Chế Độ Thực Thi

| Mode | Quyền |
| --- | --- |
| `plan` | Chỉ đọc, phân tích và tạo kế hoạch. |
| `design` | Chỉ đọc, thiết kế contract/data/flow; không sửa production source. |
| `implement` | Được sửa source trong scope, chạy focused verification. |
| `review` | Chỉ đọc, trả findings có evidence và severity. |
| `test` | Được tạo/sửa test và fixture; chỉ sửa production source khi command chuyển sang `fix`. |
| `fix` | Được sửa source theo findings đã chọn, chạy regression verification. |
| `deliver` | Điều phối các mode trên; mọi bước ghi source vẫn tuân theo quyền của mode con. |

`application.deliver_feature` mặc định chạy:

```text
plan
→ design API/data khi cần
→ implement backend/frontend
→ integrate
→ review
→ test
→ fix nếu được yêu cầu hoặc policy cho phép
→ release-readiness summary
```

Các extension `security`, `deployment`, `runtime` và `documentation` chỉ chạy
khi được truyền trong `include` hoặc người dùng yêu cầu rõ.

## Refactor Theo Pack

### Application

- Thêm 10 command public và 8 skill điều phối.
- Refactor `java-analyze` thành năng lực Java canonical có mode design,
  implement và review; thêm subagent `java-spring-implement`.
- Giữ `react-code-generate` là năng lực React canonical; chuẩn hóa để được gọi
  từ cả `feature-implement` và `feature-integrate`.
- Thêm Python backend canonical capability với subagent FastAPI và Django DRF.
  Canonical skill có tên `python-backend-engineer`; workflow Python dùng chung
  nằm ở skill, framework-specific implementation nằm ở subagent.
- Chuyển `review-backend` sang `review-feature`.
- Nâng contract `implement-frontend` hiện tại theo command mới, không tạo flow
  thứ hai cùng tên.

### Architecture

- Bổ sung review API boundary, integration flow và dependency direction cho
  hệ thống đa stack.
- Tái sử dụng `code-shared-design`, `diagram-generate` và architecture review
  khi feature thay đổi shared contract hoặc boundary.
- Bổ sung ADR handoff cho quyết định có ảnh hưởng nhiều service hoặc framework.

### Data

- Nâng `data-migration` theo đầy đủ skill authoring standard.
- Bổ sung resources/subagents cho schema review, index/query review, migration,
  backfill, reconciliation, backup và rollback.
- `application.design_data_change` điều phối skill data canonical thay vì chứa
  logic database riêng.

### Quality

- Giữ `test-qa-review` và `test-automation-validate` là canonical owner.
- Bổ sung routing cho Java, FastAPI, Django DRF, React, API contract và E2E.
- Chuẩn hóa feature test matrix, evidence contract và release exit criteria.
- `application.feature-test` chỉ điều phối và khai báo shared asset/dependency.

### Security

- Mở rộng `security-code-review` cho FastAPI, Django DRF và React.
- Bổ sung feature threat review, API authorization, mass assignment,
  serialization, CORS/CSRF và dependency checks theo stack.
- `review_feature` tổng hợp security findings khi security extension được yêu
  cầu và pack đã cài; nếu không, command chỉ báo security review chưa chạy.
  Logic rule engine không được sao chép sang `application`.

### Platform

Thêm extension commands:

- `platform.prepare_deployment`: Docker/Kubernetes configuration, rollout,
  health checks, readiness gates và rollback.
- `platform.verify_runtime`: runtime health, logs, metrics, traces, alert
  signals và post-deployment checks.

Platform không sở hữu implementation workflow. Nó nhận artifact và release
context từ `application.deliver_feature`.

### Knowledge

Thêm `knowledge.document_feature` để tạo hoặc cập nhật:

- API documentation;
- feature flow;
- deployment/operations runbook;
- changelog và maintenance handoff.

Skill `doc-write` tiếp tục là canonical owner của documentation writing.
Knowledge command dùng shared skill thay vì tạo một document writer khác.

## Đồng Bộ Metadata Và Runtime

Mọi command/skill thay đổi phải đồng bộ trong cùng change set:

- `packs/<pack>/pack.yaml`;
- `core/routing/skill-registry.yaml`;
- `core/routing/command-registry.yaml`;
- `mcp-servers/<pack>-mcp/mcp.json`;
- MCP handlers và contract-handler parity tests;
- provider adapter metadata;
- CLI catalog, install/check/doctor tests;
- README tiếng Anh trước, sau đó README tiếng Việt ở depth 0-1.

`assets.skills` liệt kê shared skill cần cài theo command nhưng không thay đổi
canonical ownership. Command ID và MCP tool ID luôn được namespace theo pack.

## Migration Và Compatibility

1. Metadata hiện tại của backend review đang lệch:
   `pack.yaml` dùng `application.review_backend`, command registry và MCP dùng
   `application.review_source_code`. Migration phải nhận diện cả hai surface và
   quy về `application.review_feature`.
2. Metadata frontend hiện tại dùng `application.implement_frontend` nhưng map
   tới MCP tool `application.generate_service`. Command giữ ID public
   `application.implement_frontend`, còn MCP tool được đổi sang cùng intent và
   route qua `feature-implement`.
3. Alias legacy chỉ tồn tại ở adapter/CLI trong một chu kỳ deprecation.
4. Alias phải cảnh báo command thay thế và không sở hữu workflow riêng.
5. Sau chu kỳ deprecation, alias và metadata legacy được xóa trong cùng release.
6. Migration dry-run phải liệt kê command, skill, adapter và target project bị
   ảnh hưởng trước khi xóa legacy paths.

## Error Handling Và Gates

- Thiếu acceptance criteria: dừng ở `plan`, trả danh sách ambiguity.
- Contract frontend/backend lệch: dừng integration gate, không báo feature sẵn
  sàng.
- Migration không có rollback hoặc reconciliation: chặn data gate.
- Verification command thất bại: giữ evidence và chuyển sang `fix` chỉ khi
  người dùng hoặc policy cho phép.
- Subagent không hỗ trợ stack: báo unsupported capability, không fallback bằng
  lời khuyên generic.
- Extension pack chưa cài: báo pack cần cài và giữ kết quả feature lifecycle đã
  hoàn thành, không giả vờ extension đã chạy.

## Lộ Trình Triển Khai

### Phase 1: Application Foundation

- Định nghĩa feature context và mode contract.
- Thêm command/skill orchestration.
- Refactor Java và React canonical skills.
- Thêm Python capability với FastAPI/Django DRF subagents.
- Thêm routing và unit tests cho stack detection.

### Phase 2: Architecture And Data

- Nâng API boundary, integration và ADR handoff.
- Nâng `data-migration` và thêm schema/index/query capabilities.
- Kết nối API/data design commands với canonical owners.

### Phase 3: Quality And Security

- Thêm cross-stack test matrix, contract tests và E2E feature gate.
- Mở rộng security review cho Java, Python và React.
- Chuẩn hóa finding aggregation mà không làm mất source ownership.

### Phase 4: Delivery Extensions

- Thêm deployment preparation và runtime verification trong `platform`.
- Thêm feature documentation trong `knowledge`.
- Hỗ trợ `deliver_feature` với extension `include`.

### Phase 5: Migration And Hardening

- Deprecate command legacy.
- Đồng bộ registry, MCP, adapters, CLI catalog và README.
- Thêm validator cho command → skill → subagent/shared asset → MCP mapping.
- Chạy target-project smoke test cho Codex, Claude và Cursor.

Thứ tự ưu tiên là:

```text
application
→ architecture + data
→ quality + security
→ platform + knowledge
→ migration + hardening
```

Mỗi phase là một implementation plan và change series độc lập. Không gom cả
năm phase vào một plan hoặc một pull request. Phase sau chỉ bắt đầu khi contract
và validation của phase trước đã ổn định.

## Chiến Lược Kiểm Thử

- Unit tests cho stack detection, mode permissions và feature context parsing.
- Contract tests cho command required skills, canonical ownership và MCP tool
  mapping.
- Fixture projects cho Spring, FastAPI, Django DRF, React và monorepo hỗn hợp.
- Integration tests cho plan → implement → integrate → review → test handoff.
- Negative tests cho ambiguous stack, contract mismatch, migration thiếu
  rollback, failing verification và extension pack chưa cài.
- Adapter/install tests cho command mới trên Codex, Claude và Cursor.

Checklist repository:

```powershell
npm test
npm run validate
npm run build:cli
```

Target-project smoke test:

```powershell
ai-engineering init
ai-engineering install application quality security --target cursor
ai-engineering doctor
```

## Tiêu Chí Hoàn Thành

- 10 command application có contract, skill routing và MCP tool cùng intent.
- 8 orchestration skill và `python-backend-engineer` có canonical ownership rõ
  ràng.
- Java/Spring, FastAPI, Django DRF và React có subagent chuyên biệt.
- Một feature đa stack có thể chạy từng command hoặc toàn bộ
  `deliver_feature`.
- Design/review không ghi source; implement/fix ghi đúng scope và có
  verification evidence.
- Shared skills giữ đúng canonical ownership và không có workflow trùng lặp.
- Command legacy có migration/deprecation rõ ràng.
- Registry, manifest, MCP, adapter, CLI catalog và README đồng bộ.
- Required validation và smoke test đạt; skipped checks và residual risk được
  báo rõ.
