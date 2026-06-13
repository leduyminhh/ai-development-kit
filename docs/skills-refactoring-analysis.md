# Phân Tích Cấu Trúc Skills

## Tóm Tắt

Repository hiện có 16 runtime skills thuộc 7 capability packs. Metadata trong
`pack.yaml` dùng hai lớp khai báo khác nhau:

- `skills[].id`: skill do pack sở hữu canonical, có namespace theo pack.
- `assets.skills`: skill được cài cùng pack, có thể gồm skill dùng chung từ pack
  khác.
- `core/routing/skill-registry.yaml`: manifest tập trung map pack tới các skill
  mà pack sở hữu canonical.

Không đồng nhất máy móc `assets.skills` với canonical ownership. Một pack có thể
cài shared skill để phục vụ command, nhưng canonical owner vẫn là pack chứa
`skills/<skill>/SKILL.md`.

## Cấu Trúc Chuẩn

```text
packs/<pack>/
|-- pack.yaml
|-- README.md
|-- commands/
|-- skills/
|   `-- <skill-name>/
|       |-- SKILL.md
|       |-- resources/    # tùy chọn
|       |-- scripts/      # tùy chọn
|       |-- subagents/    # tùy chọn
|       `-- agents/       # tùy chọn
|-- templates/
|-- workflows/
`-- schemas/
```

Các thư mục tùy chọn chỉ nên được tạo khi có nội dung thật. Không cần tạo
placeholder để làm cấu trúc trông đầy đủ.

## Hiện Trạng Canonical Owners

| Pack | Canonical skill IDs |
| --- | --- |
| `architecture` | `architecture.architecture_onion_design`, `architecture.code_design_pattern`, `architecture.code_shared_design`, `architecture.diagram_generate` |
| `application` | `application.doc_write`, `application.java_analyze`, `application.react_code_generate` |
| `data` | `data.data_migration` |
| `security` | `security.security_code_review` |
| `quality` | `quality.naming_rule_validate`, `quality.test_automation_validate`, `quality.test_qa_review` |
| `platform` | `platform.git_workflow_design`, `platform.using_workflow_kit` |
| `knowledge` | `knowledge.youtube_transcript` |

Agent baseline và rule vận hành toàn repo nằm trong `core/agents`, không nằm
trong runtime pack skill.

## Quy Tắc Cần Giữ

1. Mỗi runtime skill có đúng một canonical owner: pack chứa folder skill.
2. `core/routing/skill-registry.yaml` phải khớp với folder skill và
   `pack.yaml.skills`.
3. `assets.skills` có thể liệt kê shared skill từ pack khác khi command cần cài
   skill đó.
4. Skill triển khai, stack và source-code nằm trong `application`.
5. Skill về boundary hệ thống, architecture method và design method nằm trong
   `architecture`.
6. Policy toàn repo, managed AGENTS baseline và merge policy nằm trong
   `core/agents`, không đóng gói thành runtime skill.
7. Khi thêm, đổi tên, move hoặc xóa skill, cập nhật `pack.yaml`, routing
   registry, adapter metadata và test liên quan trong cùng thay đổi.

## Khoảng Trống Còn Lại

### Data migration

`data-migration` có nội dung ngắn hơn các skill khác. Đây là khoảng trống về độ
sâu hướng dẫn, không phải lỗi cấu trúc. Chỉ nên bổ sung resources, scripts hoặc
subagents khi đã có use case và contract kiểm chứng cụ thể.

### Kiểm tra tự động

Validator hiện kiểm tra đường dẫn, registry và metadata pack. Các invariant quan
trọng đã được siết:

- Mỗi pack trong registry phải tồn tại.
- Registry của pack phải khớp với các folder `skills/*/SKILL.md` mà pack sở hữu.
- `pack.yaml.skills` phải khớp với registry canonical owner.
- Command required skills phải nằm trong `assets.skills` của pack để cài đặt được.

## Checklist Thay Đổi Skill

- [ ] Đọc `SKILL.md`, resources, scripts và subagents liên quan.
- [ ] Cập nhật `pack.yaml` khi command, skill, dependency hoặc adapter thay đổi.
- [ ] Giữ canonical ID có namespace và folder name dạng lowercase-hyphen.
- [ ] Đồng bộ `core/routing/skill-registry.yaml` theo canonical owner.
- [ ] Nếu command cần shared skill, thêm skill vào `assets.skills`.
- [ ] Chạy `npm test`.
- [ ] Chạy `npm run validate`.
- [ ] Chạy `npm run build:cli`.

## Nguồn Đối Chiếu

- `packs/*/pack.yaml`
- `core/routing/skill-registry.yaml`
- `core/schemas/pack.schema.json`
- `core/templates/SKILL_TEMPLATE.md`
- `core/standards/skill-authoring-standard.md`
