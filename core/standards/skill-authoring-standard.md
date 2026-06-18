# Skill Authoring Standard

- Mỗi skill có `SKILL.md` với `name` và `description`.
- Dùng progressive disclosure qua `resources/`, `scripts/`, và `subagents/`.
- Không trộn logic domain vào core validator.
- Mỗi runtime skill có đúng một canonical owner: plugin chứa
  `skills/<skill>/SKILL.md`.
- `core/routing/skill-registry.yaml` phải map đúng canonical owner và khớp với
  `plugin.yaml.skills`.
- `plugin.yaml.assets.skills` có thể kê skill dùng chung từ plugin khác để cài
  đặt theo command, nhưng không thay đổi canonical owner.
- Đặt skill triển khai, stack, source-code trong `application`; đặt skill về
  boundary hệ thống và phương pháp thiết kế trong `architecture`; đặt policy
  toàn repo và managed agent baseline trong `core/agents`, không tạo runtime
  skill riêng.
