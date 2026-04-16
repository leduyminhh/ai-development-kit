# Codex Workflow Kit

`codex-workflow-kit` la bo khung lam viec de to chuc cac thanh phan Codex co the tai su dung: agent, skill, subagent prompt, validator, hook, script tien ich va cau hinh chay kiem tra.

Kho nay dong vai tro la tai lieu tong quan he thong tai:

```text
E:\Mine\AI\codex-workflow-kit
```

## Muc Tieu He Thong

- Chuan hoa cau truc repository cho cac workflow Codex.
- Tach core validator khoi logic domain-specific.
- Cung cap skill va agent co the tai su dung cho Java, React, diagram, QA, test automation, documentation, git workflow va design pattern.
- Giam context bi nap thua bang progressive disclosure: top-level skill chi giu workflow cot loi, tai resource/subagent khi task that su can.
- Dinh tuyen selected tests theo file thay doi, skill kich hoat hoac agent duoc chay.
- Dam bao cac thay doi cau truc co validator va test map di kem.

## Ban Do Thu Muc

| Path | Vai tro |
|---|---|
| `AGENTS.md` | Quy tac lam viec cua agent trong repo: tieng Viet, protected paths, workflow, commit convention, safety rules. |
| `README.md` | Tai lieu tong quan he thong. |
| `.agents/` | Runtime skills, subagents, resources va scripts gan voi tung skill. Xem `.agents/README.md`. |
| `.codex/` | Cau hinh Codex project-local: agent entry points, config, hooks, test map, MCP placeholders. Xem `.codex/README.md`. |
| `scripts/` | Script tien ich va test runner dung chung cho repo. Xem `scripts/README.md`. |
| `docs/` | Protected path cho specs/plans/docs duoc tao co chu dich. Can xac nhan truoc khi ghi. |
| `reports/` | Protected path cho bao cao/review artifacts. Can xac nhan truoc khi ghi. |

## Core Workflow

Luong chuan khi thay doi cau truc:

1. Sua skill, agent, hook, config hoac script theo pham vi task.
2. Neu them `*test*.ps1`, map file do vao `.codex/test-map.toml` dung mot nhom duy nhat.
3. Chay validator cau truc:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

4. Chay selected tests cho thay doi hien tai:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

## Agent, Skill Va Subagent

He thong dung mo hinh:

```text
.codex/agents/<agent>.toml
        -> applies
.agents/skills/<skill>/SKILL.md
        -> selects
.agents/skills/<skill>/resources/*.md
.agents/skills/<skill>/subagents/*.md
.agents/skills/<skill>/scripts/*.ps1
```

Quy tac thiet ke:

- Agent la entry point dieu phoi workflow.
- Skill giu trigger, operating mode va resource map ngan gon.
- Resource giu noi dung chi tiet chi nap khi lien quan.
- Subagent prompt giu vai tro chuyen biet trong pham vi skill.
- Khi tao skill moi, cap nhat agent va subagent tuong ung de skill co duong chay ro rang.
- Khong dua quy trinh domain dai vao validator core.

## Progressive Disclosure

Repo uu tien giam context bang cach:

- Khong doc `docs/` va `reports/` khi scan mac dinh.
- Khong bulk-load `references/external/`.
- Top-level `SKILL.md` chi nen chua noi dung bat buoc de kich hoat va dieu huong.
- Selector resource duoc dung cho skill co nhieu bien the, vi du:
  - React: `resources/context-loading-selector.md`
  - Diagram: `resources/diagram-prompt-selector.md`
  - Test automation: `resources/test-prompt-selector.md`

## Skill Catalog Update Event

Khi phat sinh skill moi trong `.agents/skills/<skill-name>/`, agent thuc hien thay doi phai xem day la su kien cap nhat catalog:

1. Cap nhat danh sach skill trong `README.md`.
2. Cap nhat danh sach skill va quy tac lien quan trong `.agents/README.md`.
3. Tao hoac cap nhat agent/subagent tuong ung neu skill do can entry point runtime.
4. Neu co test script moi, map vao `.codex/test-map.toml`.
5. Chay `scripts/test-readme-skill-catalog.ps1` de dam bao catalog khong lech voi thu muc `.agents/skills`.
6. Trong final response, bao lai cho user skill moi da duoc them va cac tai lieu catalog da cap nhat.

## Cau Hinh Chinh

- `.codex/config.toml`: ngon ngu mac dinh, protected path policy, validation command, output writer policy, audit hook va agent registrations.
- `.codex/test-map.toml`: dinh tuyen test theo changed paths, activated skills va agent names.
- `.codex/agents/*.toml`: khai bao agent entry point, model, reasoning, sandbox va developer instructions.
- `.codex/hooks/*.ps1`: hook deterministic, hien co la audit logging.

## Cai Dat Skill Link

Lien ket skill cua repo vao discovery path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
```

Script tao junction/symlink:

```text
~\.agents\skills\codex-workflow-kit -> <repo>\.agents\skills
```

Sau do cap nhat repo bang:

```powershell
git pull
```

## Audited Agent Runner

Dung wrapper khi can ghi audit deterministic cho mot lan chay agent:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-agent-audited.ps1 `
  -AgentName react-code-generate `
  -Model gpt-5.4 `
  -Reasoning medium `
  -SummaryJob "Build checkout UI" `
  -Command "npm test"
```

Wrapper goi `.codex/hooks/write-agent-audit.ps1`, giu nguyen exit code cua command duoc boc.

## Domain Capabilities

| Skill | Chuc nang |
|---|---|
| `codex-structure-validate` | Validator cau truc Codex repo. |
| `naming-rule-validate` | Kiem tra naming convention cho agent, skill, subagent, hook va script. |
| `java-analyze` | Phan tich Java/Spring backend, flow, persistence, async, clean code, test strategy. |
| `react-code-generate` | Tao/sua React UI tu Figma, ticket, yeu cau text va API contract. |
| `test-qa-review` | Review QA doc lap, scenario, regression risk, verification plan. |
| `test-automation-validate` | Lap ke hoach va tao automated tests theo stack. |
| `diagram-generate` | Chon va tao PlantUML diagrams. |
| `doc-write` | Viet tai lieu ky thuat va README/doc artifacts. |
| `git-workflow-design` | Ho tro branch, commit, merge, revert, release, hotfix. |
| `code-design-pattern` | Tu van design pattern co approval gate. |
| `architecture-onion-design` | Huong dan Onion Architecture va boundary review. |
| `code-shared-design` | Thiet ke shared internal API, contract, shared logic module. |

## Protected Paths

`docs/` va `reports/` la protected paths. Truoc moi write action vao cac path nay phai co xac nhan ro rang voi:

- Target path
- Purpose
- Short content summary

Neu khong co xac nhan, tra draft inline thay vi ghi file.
