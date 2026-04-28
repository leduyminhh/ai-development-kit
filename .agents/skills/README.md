# Skills Runtime Assets

Thu muc `.agents/skills/` chua runtime skill assets cua repo. Moi skill la mot don vi co the duoc Codex kich hoat khi user request phu hop.

## Cau Truc

```text
.agents/skills/
    manifest.toml
    README.md
    <skill-name>/
        SKILL.md
        metadata/
            openai.yaml
        resources/
        scripts/
        subagents/
```

## Thanh Phan

| Thanh phan | Bat buoc | Vai tro |
|---|---:|---|
| `SKILL.md` | Co | Frontmatter `name`, `description` va workflow cot loi. |
| `metadata/openai.yaml` | Khuyen nghi | Metadata hien thi skill trong UI khi skill co prompt goi nhanh hoac integration metadata. |
| `resources/` | Tuy skill | Tai lieu chi tiet chi doc khi task can. |
| `scripts/` | Tuy skill | Script deterministic gan voi skill. |
| `subagents/` | Bat buoc cho skill runtime moi | Prompt vai tro chuyen biet duoc skill lua chon khi can. |

## Manifest Contract

`.agents/skills/manifest.toml` la hop dong ro rang giua:

- repo structure: `.agents/skills/<name>/...`
- runtime registration: `.codex/agents/<name>.toml`
- runtime governance metadata: `.codex/agent-metadata/<name>.toml`
- external discovery: link `.agents/skills/` vao Codex skill loading path

Manifest khong thay the `config.toml`. No chi lam ro skill nao co agent entry, skill nao chi la companion skill, va metadata UI cua skill nam o dau.

## Danh Sach Skill Hien Co

| Skill | Chuc nang |
|---|---|
| `architecture-onion-design` | Thiet ke/review Onion Architecture, package layout va boundary risk. |
| `code-design-pattern` | Chon design pattern phu hop, tranh overuse, can approval truoc khi ap dung. |
| `code-shared-design` | Thiet ke shared internal API, contract va shared logic module. |
| `codex-structure-validate` | Validator cau truc Codex repo. |
| `diagram-generate` | Tao PlantUML diagram theo selector/subagent phu hop. |
| `doc-write` | Viet tai lieu ky thuat, README, architecture/feature/flow/database docs. |
| `git-workflow-design` | Ho tro branch, commit, merge, revert, release, hotfix. |
| `java-analyze` | Phan tich Java/Spring architecture, persistence, async, test strategy. |
| `naming-rule-validate` | Kiem tra naming convention cho artifacts. |
| `react-code-generate` | Tao/sua React UI, API integration, accessibility/performance review. |
| `security-code-review` | Review security risk theo OWASP/ASVS/CWE, auth, secrets, dependencies, va verification. |
| `skill-evolution-review` | Engine trung tam review drift, phan loai evidence va dieu phoi tien hoa skill/agent. |
| `test-automation-validate` | Tao va verify automated tests. |
| `test-qa-review` | QA review doc lap va regression/verification planning. |

## Progressive Disclosure

Quy tac tiet kiem context:

- `SKILL.md` chi giu trigger, operating mode va resource map ngan.
- Noi dung dai hoac mapping nhieu lua chon phai nam trong `resources/`.
- Chi doc subagent prompt duoc chon, khong doc ca thu muc `subagents/`.
- Skill co nhieu bien the nen co selector resource rieng.

Vi du:

- `react-code-generate/resources/context-loading-selector.md`
- `diagram-generate/resources/diagram-prompt-selector.md`
- `test-automation-validate/resources/test-prompt-selector.md`

## Skill Catalog Update Event

Khi co skill moi xuat hien trong `.agents/skills/`, workflow phai cap nhat lai thong tin cho user va tai lieu catalog:

- Them skill moi vao bang "Danh Sach Skill Hien Co" cua file nay.
- Cap nhat bang "Domain Capabilities" trong `README.md`.
- Cap nhat `.agents/skills/manifest.toml`.
- Neu skill co runtime workflow, tao subagent prompt tuong ung trong `subagents/`.
- Neu skill can agent entry point, tao `.codex/agents/<skill-name>.toml`, tao `.codex/agent-metadata/<skill-name>.toml`, va sync registry bang validator `-Fix`.
- Neu them test script, map vao `.codex/test-map.toml`.
- Khi tra loi cuoi cung, thong bao ro skill moi nao da phat sinh va tai lieu nao da duoc cap nhat.

## Quy Tac Tao Skill Moi

Khi tao skill moi trong `.agents/skills/<skill-name>/`:

1. Tao `SKILL.md` voi frontmatter `name` va `description`.
2. Tao `subagents/` va it nhat mot prompt `.md` neu skill co workflow runtime.
3. Tao hoac cap nhat `.codex/agents/<skill-name>.toml` neu skill can agent entry point.
4. Tao hoac cap nhat `.codex/agent-metadata/<skill-name>.toml` de giu read_only, hook gate, va governance metadata.
5. Cap nhat `.agents/skills/manifest.toml` voi `skill_path`, `ui_metadata` va `agent_entry`.
6. Chay validator voi `-Fix` de sync `agent_registry` vao `.codex/config.toml`.
7. Neu co script test, map vao `.codex/test-map.toml`.
8. Chay validator va selected tests.

## Kiem Tra

Validator cau truc:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Naming rule:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root .
```

Script nay kiem tra ca ten artifact va declared name metadata trong agent/skill.

