# Phân tích cấu trúc Skills

## Tóm tắt

Repository hiện có 17 skills thuộc 7 capability packs. Metadata trong
`pack.yaml` đã sử dụng skill ID có namespace theo định dạng
`<pack>.<skill_id>`, trong khi tên thư mục và `assets.skills` giữ dạng
lowercase-hyphen để phục vụ đường dẫn cài đặt.

Hai dạng định danh này có mục đích khác nhau và không nên đồng nhất máy móc:

- `skills[].id`: định danh canonical, có namespace theo pack.
- `assets.skills`: tên asset và tên thư mục skill có thể cài đặt.
- `core/routing/skill-registry.yaml`: ánh xạ pack tới tên asset, phải khớp
  `assets.skills`.

## Cấu trúc chuẩn

```text
packs/<pack>/
├── pack.yaml
├── README.md
├── commands/
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md
│       ├── resources/    # tùy chọn
│       ├── scripts/      # tùy chọn
│       ├── subagents/    # tùy chọn
│       └── agents/       # tùy chọn
├── templates/
├── workflows/
└── schemas/
```

Các thư mục tùy chọn chỉ nên được tạo khi có nội dung thực. Không cần tạo
placeholder để làm cấu trúc trông đầy đủ.

## Hiện trạng định danh

| Pack | Canonical skill IDs |
| --- | --- |
| `architecture` | `architecture.architecture_onion_design`, `architecture.code_design_pattern`, `architecture.code_shared_design`, `architecture.diagram_generate`, `architecture.java_analyze` |
| `application` | `application.react_code_generate` |
| `data` | `data.data_migration` |
| `security` | `security.security_code_review` |
| `quality` | `quality.naming_rule_validate`, `quality.test_automation_validate`, `quality.test_qa_review` |
| `platform` | `platform.agent_operating_rules`, `platform.git_workflow_design`, `platform.using_workflow_kit` |
| `knowledge` | `knowledge.doc_write`, `knowledge.youtube_transcript` |

Kết luận: `pack.yaml` đã nhất quán; không còn yêu cầu migration skill ID.

## Quy tắc cần giữ

1. Skill ID canonical phải có namespace của pack.
2. Tên thư mục skill giữ lowercase-hyphen.
3. `skills[].path` phải trỏ tới `skills/<skill-name>/SKILL.md` có thật.
4. `assets.skills` và `core/routing/skill-registry.yaml` dùng cùng tên asset.
5. Không đưa namespace canonical vào registry asset nếu runtime vẫn resolve
   skill theo tên thư mục.
6. Khi thêm, đổi tên hoặc xóa skill, cập nhật `pack.yaml`, routing registry,
   adapter metadata và test liên quan trong cùng thay đổi.

## Khoảng trống còn lại

### Data migration

`data-migration` có nội dung ngắn hơn các skill khác. Đây là khoảng trống về độ
sâu hướng dẫn, không phải lỗi cấu trúc. Chỉ nên bổ sung resources, scripts hoặc
subagents khi đã có use case và contract kiểm chứng cụ thể.

### Kiểm tra tự động

Validator hiện kiểm tra đường dẫn, registry và metadata pack. Có thể tăng độ
chặt bằng các invariant:

- Mọi `skills[].id` bắt đầu bằng `<pack>.`.
- Phần sau namespace ánh xạ xác định tới tên asset hoặc path.
- Không có asset skill trùng tên trong cùng pack.
- Mọi test script mới được đăng ký trong test map phù hợp.

## Checklist thay đổi skill

- [ ] Đọc `SKILL.md`, resources, scripts và subagents liên quan.
- [ ] Cập nhật `pack.yaml` khi command, skill, dependency hoặc adapter thay đổi.
- [ ] Giữ canonical ID có namespace và folder name dạng lowercase-hyphen.
- [ ] Đồng bộ `core/routing/skill-registry.yaml` theo `assets.skills`.
- [ ] Chạy `npm test`.
- [ ] Chạy `npm run validate`.
- [ ] Chạy `npm run build:cli`.

## Nguồn đối chiếu

- `packs/*/pack.yaml`
- `core/routing/skill-registry.yaml`
- `core/schemas/pack.schema.json`
- `core/templates/SKILL_TEMPLATE.md`
- `core/standards/skill-authoring-standard.md`
