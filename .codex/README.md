# Codex Project Configuration

Thu muc `.codex/` chua cau hinh project-local cho Codex workflow kit: agent entry points, policy, test routing, hooks va MCP placeholders.

## Cau Truc

```text
.codex/
 agents/
 hooks/
 mcp/
 config.toml
 test-map.toml
```

## Thanh Phan

| Path | Chuc nang |
|---|---|
| `config.toml` | Cau hinh deterministic: ngon ngu, protected paths, validation command, output writer, audit, guards, agent registrations. |
| `test-map.toml` | Map selected tests theo changed paths, activated skills va agent names. |
| `agents/*.toml` | Entry point cua agent: name, description, model, reasoning, sandbox, developer instructions. |
| `hooks/*.ps1` | Hook deterministic, hien co dung cho audit logging. |
| `mcp/` | Placeholder cho MCP config/template neu repo can. |

## Agents

Moi `.codex/agents/<name>.toml` nen:

- Co `name`, `description`, `model`, `model_reasoning_effort`, `sandbox_mode`.
- Co `developer_instructions` ngan gon, dieu phoi skill thay vi nhung quy trinh domain qua dai.
- Tham chieu skill tuong ung trong `skills/<name>` hoac skill lien quan.
- Ton trong protected paths va khong commit/push khi user chua yeu cau.

Runtime registration boundary:

- `skills/` chua runtime skill assets.
- `skills/<name>/{scripts,resources}` uu tien cho file chi thuoc mot skill.
- `.codex/agents/*.toml` la agent entry points.
- `.codex/config.toml` dang ky agent entry.
- `skills/manifest.toml` la link contract de map skill <-> agent <-> UI metadata.
- External Codex discovery van la boundary rieng, khong duoc dam bao chi boi repo structure.

Agent hien co:

- `code-design-pattern`
- `codex-structure-validate`
- `diagram-generate`
- `doc-write`
- `git-workflow-design`
- `java-analyze`
- `react-code-generate`
- `skill-maintenance-review`
- `test-automation-validate`
- `test-qa-review`

## Config

`config.toml` gom cac nhom quan trong:

| Section | Muc dich |
|---|---|
| `[environment]` | Network/runtime access metadata. |
| `[behavior]` | Ngon ngu mac dinh, protected write policy, safety defaults. |
| `[validation]` | Validator command can chay sau structure change. |
| `[scan.policy]` | Bo qua `docs/` va `reports/` theo mac dinh. |
| `[output.file]` | Naming policy cho generated output. |
| `[documentation.writer]` | Policy ghi documentation. |
| `[diagram.writer]` | Policy ghi PlantUML diagram output. |
| `[audit.agent]` | Audit log path, format, retention va hook. |
| `[skill_upgrade]` | Cau hinh chu ky review/feedback/proposal cho co che tu de xuat nang cap skill. |
| `[guards]` | Safety guards cho destructive/protected actions. |
| `[agents.<name>]` | Dang ky agent config path, read_only va enabled. |

## Test Map

`test-map.toml` chia test thanh cac nhom:

- `test.always`: luon chay trong selected verification.
- `test.core`: chay khi file core/config/hook/script lien quan thay doi.
- `test.skill`: chay khi skill/agent/path lien quan thay doi.

Khi them file `*test*.ps1`, phai map vao dung mot group de validator chap nhan.
Chi dat test hoac resource tai `scripts/` neu chung la shared cho toan repo; neu chi phuc vu mot skill thi dat duoi `skills/<skill>/`.

Lenh:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

## Hooks

| File | Chuc nang |
|---|---|
| `write-agent-audit.ps1` | Ghi audit row cho mot agent execution. |
| `test-write-agent-audit.ps1` | Test format, retention va output behavior cua audit hook. |

Hook khong tu dong chay chi vi xuat hien trong config. Dung `scripts/invoke-agent-audited.ps1` khi can audit deterministic.

## Quy Tac Cap Nhat

- Khi them agent config moi, chay validator voi `-Fix` de sync registration vao `config.toml`.
- Khi doi hook, cap nhat test lien quan trong `.codex/hooks/`.
- Khi doi test routing, chay `scripts/test-test-map.ps1`.
- Khi doi config, chay selected tests de bat output resolver, audit hook va validator side effects.
