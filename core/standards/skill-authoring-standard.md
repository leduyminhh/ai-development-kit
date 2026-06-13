# Skill Authoring Standard

- Moi skill co `SKILL.md` voi `name` va `description`.
- Dung progressive disclosure qua `resources/`, `scripts/`, va `subagents/`.
- Khong tron logic domain vao core validator.
- Moi runtime skill co dung mot canonical owner: pack chua
  `skills/<skill>/SKILL.md`.
- `core/routing/skill-registry.yaml` phai map dung canonical owner va khop voi
  `pack.yaml.skills`.
- `pack.yaml.assets.skills` co the ke skill dung chung tu pack khac de cai dat
  theo command, nhung khong thay doi canonical owner.
- Dat skill trien khai, stack, source-code trong `application`; dat skill ve
  boundary he thong va phuong phap thiet ke trong `architecture`; dat policy
  toan repo va managed agent baseline trong `core/agents`, khong tao runtime
  skill rieng.
