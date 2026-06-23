# Chuẩn hóa skills / commands / workflows các plugin — Thiết kế

> Trạng thái: **chờ duyệt**. Chưa sửa code. Spec này là artifact thiết kế và đồng thời là
> checklist thực thi. Nguồn căn cứ: audit toàn bộ 7 plugin + bản đồ ripple (workflow
> `plugin-standardization-audit`, 2026-06-23) và đọc trực tiếp `command-contracts.mjs`,
> `workflow-definition.schema.json`, `pack.schema.json`.

## 1. Bối cảnh & mục tiêu

`aie validate` hiện **pass** cho cả 7 plugin → các hợp đồng *cứng* (frontmatter, slug khớp
tên file, version khớp plugin, đủ 5 mục command, schema workflow/pack) đã đạt. Việc cần làm là
chuẩn hóa lớp *mềm* mà validate không ép: **quy ước đặt tên**, **cấu trúc/section**, và
**mạch nối skill ↔ command ↔ workflow** — đồng thời sửa vài **lỗi ẩn** (skill "ma", tham chiếu
không phân giải) mà validate không bắt.

Mục tiêu: mọi skill/command/workflow tuân theo một bộ quy ước nhất quán; mọi tham chiếu chéo
phân giải đúng; không còn asset "ma".

## 2. Phạm vi (đã chốt với người dùng)

**Plugin trong phạm vi (cả 7):** `application`, `architecture`, `data`, `knowledge`,
`platform`, `quality`, `security`.

**Đợt này làm:** Phase 0, 1, 2, 4 (xem §4).

**Hoãn sang đợt sau (Phase 3 — rủi ro ripple cao, theo lựa chọn "an toàn trước"):**
- Đổi tên skill: `feature-delivery → feature-deliver`; ba skill stack
  `java-analyze` / `python-backend-engineer` / `react-code-generate` (cần chốt tên đích —
  xem §7 Ghi chú mở).
- Thống nhất tên capability của `security` (skill `security-code-review` / command
  `review-security` / subagent `security-review`).
- Lý do hoãn: các đổi tên này ripple tới *prose* trong nhiều file `adapters/codex/agents/*.toml`
  và `steps[].uses` của workflow (chỉ validate bằng regex, không đối chiếu registry → dễ
  silent-break).

**Ngoài phạm vi (không làm):**
- Dedup identity `metadata.{id,version,...}` vs top-level trong `plugin.yaml`:
  **rủi ro** vì `loadPluginCommands` đọc `plugin.metadata.version` ([command-contracts.mjs](../../../cli/src/command-contracts.mjs)).
  Cần xác minh loader trước khi đụng → để riêng.
- Mở rộng provider, thay đổi CLI, hay refactor khung adapter.

## 3. Chuẩn canonical (chọn theo đa số hiện có để giảm churn)

| Đối tượng | Quy ước |
|---|---|
| **Command** | slug kebab `verb-noun` (mệnh lệnh): `plan-feature`, `review-security`. Đủ 5 mục theo thứ tự cố định: `## Intent` (prose) · `## Inputs` (`- `) · `## Required Skills` (`- `) · `## Steps` (đánh số) · `## Output Contract` (`- `). `id = <plugin>.<slug_đổi_-_thành__>`; `version` = version plugin. |
| **Skill** | slug kebab `noun-action` (gương của command: `review-feature` ↔ `feature-review`). SKILL.md frontmatter **chỉ** `name` + `description`; `name` = tên thư mục. H1 là tiêu đề người-đọc thật (không placeholder). |
| **Workflow** | tên file & `id` dạng `<capability>-pipeline`; `id` = tên file (khóa tra cứu runtime). |
| **Mạch nối** | mọi `## Required Skills` bullet và `steps[].uses` trỏ tới skill **owned** hoặc skill thuộc plugin có trong `depends_on.plugins` (không chỉ `dependencies.optional`). `assets.skills` (slug kebab) == `skills[]` (id dotted-snake) == thư mục == `core/routing/skill-registry.yaml`. `assets.skills` chỉ liệt kê skill **owned**; tham chiếu chéo nằm ở Required Skills / `uses`. |

## 4. Danh mục thay đổi theo Phase

Mỗi Phase kết thúc bằng cổng kiểm tra (§5). Phase chạy tuần tự 0 → 1 → 2 → 4.

### Phase 0 — Sửa skill "ma" + đồng bộ registry (rủi ro thấp, ưu tiên cao nhất)
- `architecture`: gỡ skill **ma** `java-analyze` khỏi `plugin.yaml` `assets.skills` và khỏi
  `commands/review-architecture.md` `## Required Skills`; đảm bảo
  `skill-registry.yaml` không còn `architecture/java-analyze`. (Không có thư mục để xóa — nó
  chưa từng tồn tại.) Cân nhắc thay bằng skill architecture thật nếu cần đủ phạm vi review.
- `knowledge`: gỡ `diagram-generate` (thuộc `architecture`) khỏi `assets.skills`; trong
  `commands/write-technical-doc.md` Required Skills và `workflows/documentation-pipeline.yaml`
  bước `diagrams`: **hoặc** thêm `architecture` vào `depends_on.plugins` rồi giữ ref dạng
  `architecture/diagram-generate`, **hoặc** bỏ bước/bullet đó. (Mặc định đề xuất: thêm
  `architecture` vào `depends_on.plugins` để giữ năng lực vẽ sơ đồ.)
- Đồng bộ `assets.skills == skills[] == thư mục == skill-registry` cho `architecture` &
  `knowledge`.

### Phase 1 — Đổi tên workflow thiếu `-pipeline` (rủi ro thấp)
- `application/workflows/fullstack-feature.yaml` → `feature-delivery-pipeline.yaml`
  (**GIỮ UTF-8 BOM**); đặt `id: feature-delivery-pipeline`.
- Cập nhật `application/plugin.yaml` `assets.workflows[]`.
- Grep `fullstack-feature` trong `README.md` / `README_VI.md` / prose. (Không đụng
  command-registry; workflow không nằm trong command-registry.)

### Phase 2 — Command `noun-verb` → `verb-noun` (rủi ro thấp, ripple có kiểm soát)
- `data/commands/migration-plan.md` → `plan-migration.md`: đổi tên file, đặt
  `slug: plan-migration`, `id: data.plan_migration`; cập nhật `data/plugin.yaml`
  `assets.commands[]`; **viết tay** lại entry trong `core/routing/command-registry.yaml`
  (file phái sinh, validate-only — không có lệnh tự ghi); đổi `steps[].id` `migration-plan`
  trong `db-migration-pipeline.yaml` để tránh nhầm.
- `platform/commands/deployment-plan.md` → `plan-deployment.md`: tương tự
  (`id: platform.plan_deployment`).
- Grep slug cũ trên `.md` / `.yaml` / `README*`.

### Phase 4 — Chuẩn hóa section / frontmatter / depends_on (rủi ro thấp, có thay đổi hành vi resolver)
- **Required Skills / Steps:**
  - `application/commands/deliver-feature.md`: thêm bullet skill "fix" vào Required Skills (tên
    skill giữ nguyên đợt này vì chưa đổi tên skill).
  - `application/commands/review-backend.md`: bổ sung skill Python vào Required Skills + mở
    rộng `## Steps` lên 5 bước cho khớp các command anh em.
  - `quality/commands/verify-quality.md`: thêm `- naming-rule-validate`.
  - `architecture/commands/review-architecture.md`: căn Required Skills khớp phạm vi
    `architecture-review-pipeline` (sau khi đã gỡ "ma" ở Phase 0).
- **Prose / frontmatter:**
  - `quality/skills/test-qa-review/SKILL.md`: bỏ câu cũ gọi `test-automation-validate` là
    "future skill" (skill đó đã tồn tại).
  - `architecture/skills/diagram-generate/SKILL.md`: sửa H1 `Diagram-W` thành tiêu đề thật.
  - `platform/skills/git-workflow-design/SKILL.md`: bỏ key `keywords` (chỉ giữ `name`+`description`).
  - `outputSchema`: thống nhất *trong từng plugin* (mọi command sinh artifact có cấu trúc đều
    khai báo, hoặc không khai báo cái nào). Mặc định đề xuất: **không** thêm `outputSchema` mới
    đợt này, chỉ ghi nhận; quyết định cuối ở bước writing-plans.
- **`depends_on.plugins` (thay đổi hành vi resolver → cần validate install):**
  - `application`: thêm `data`, `quality`, `security` (đang load-bearing nhưng chỉ ở `optional`).
  - `data`: thêm `quality`. `security`: thêm `quality`. `knowledge`: thêm `architecture`
    (nếu giữ bước vẽ sơ đồ ở Phase 0).

> Orphan `knowledge/youtube-transcript` và `platform/git-workflow-design`: **chỉ ghi nhận**,
> không xóa đợt này (cần xác nhận có dùng ngoài hay không). Đề xuất cấp một command/workflow
> surface ở đợt sau hoặc chấp nhận là skill routing-only.

## 5. Cổng kiểm tra & giảm thiểu silent-break

Sau **mỗi** Phase:
```bash
npm run build && npm test && npm run validate
```
Bổ sung:
- **Grep slug/tên cũ** trên `.yaml` / `.md` / `.toml` / `.json` sau mỗi lần đổi tên (vì
  `steps[].uses` chỉ validate regex, không đối chiếu skill-registry).
- **Giữ BOM**: `plugins/*/workflows/*.yaml` có UTF-8 BOM; `plugin.yaml` /
  `command-registry.yaml` / `skill-registry.yaml` bắt đầu bằng `{` (không BOM); command `.md`
  bắt đầu bằng `---` (không BOM). Kiểm tra từng file trước khi ghi.
- **File phái sinh viết tay**: `core/routing/command-registry.yaml` và `skill-registry.yaml`
  được hand-maintain; `aie validate` chỉ *so sánh* và báo lỗi nếu lệch → phải tự cập nhật cho
  khớp sau đổi tên. `aie registry generate` **không** ghi 2 file này (nó build `registry/` —
  build output).
- **Thay đổi `depends_on.plugins` / `assets.skills`** đổi hành vi resolver → chạy thử cài đặt
  vào một target tạm (`aie install --all --target <provider> --yes`) + `aie check` để xác nhận
  không hỏng phân giải.

## 6. Rủi ro & rollback

- **Cao nhất** đã được hoãn (Phase 3). Trong các Phase 0–2/4, rủi ro lớn nhất là (a) bỏ sót một
  ref khi gỡ "ma"/đổi tên → giảm thiểu bằng grep bắt buộc; (b) lệch `command-registry.yaml`
  viết tay → `aie validate` sẽ bắt.
- **Rollback**: làm theo Phase, mỗi Phase một commit (qua skill git-workflow-design) trên nhánh
  riêng; nếu cổng kiểm tra đỏ thì revert commit của Phase đó.

## 7. Tiêu chí hoàn thành

- `npm run build && npm test && npm run validate` xanh sau mỗi Phase và ở cuối.
- Không còn skill "ma"; `assets.skills == skills[] == thư mục == skill-registry` cho mọi plugin
  đụng tới.
- Workflow đều có hậu tố `-pipeline`; command đều `verb-noun`.
- Mọi `Required Skills` / `uses` phân giải tới skill owned hoặc skill thuộc `depends_on.plugins`.
- `grep` các slug/tên cũ trả về 0 kết quả ngoài CHANGELOG/spec.

**Ghi chú mở (sẽ chốt khi mở Phase 3 đợt sau):** tên đích cho 3 skill stack. `java-analyze` thực
chất mô tả vai trò "architect" (không chỉ analyze) — cần đọc nội dung SKILL.md từng skill để chọn
giữa lược đồ `<stack>-implement` (đồng bộ) hay `<stack>-engineer` (giữ vai trò) trước khi đổi.
