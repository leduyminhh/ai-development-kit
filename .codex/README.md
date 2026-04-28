# Codex Project Configuration

Thu muc `.codex/` chua cau hinh project-local cho Codex workflow kit: agent entry points, policy, test routing, hooks va MCP placeholders.

## Cau Truc

```text
.codex/
 agents/
 agent-metadata/
 hooks/
 mcp/
 config.toml
 test-map.toml
```

## Thanh Phan

| Path | Chuc nang |
|---|---|
| `config.toml` | Cau hinh deterministic: ngon ngu, protected paths, validation command, output writer, project hooks, guards, agent registry entries. |
| `test-map.toml` | Map selected tests theo changed paths, activated skills va agent names. |
| `agents/*.toml` | Entry point Desktop-facing cua agent: name, description, model, reasoning, sandbox, developer instructions. |
| `agent-metadata/*.toml` | Governance metadata cua repo: read_only, hook gate, summary, va rule/pham vi custom neu can. |
| `hooks/*.ps1` | Hook deterministic cap project; wrapper event dung chung logic trong `hooks/lib/`. |
| `mcp/` | Placeholder cho MCP config/template neu repo can. |

## Agents

Moi `.codex/agents/<name>.toml` nen:

- Co `name`, `description`, `model`, `model_reasoning_effort`, `sandbox_mode`.
- Co `developer_instructions` ngan gon, dieu phoi skill thay vi nhung quy trinh domain qua dai.
- Tham chieu skill tuong ung trong `.agents/skills/<name>` hoac skill lien quan.
- Ton trong protected paths va khong commit/push khi user chua yeu cau.

Runtime registration boundary:

- `.agents/skills/` chua runtime skill assets.
- `.agents/skills/<name>/{scripts,resources}` uu tien cho file chi thuoc mot skill.
- `.codex/agents/*.toml` la agent entry points.
- `.codex/agent-metadata/*.toml` giu governance metadata cho validator va sync.
- `.codex/config.toml` giu `agent_registry.<name>` thay vi khai bao agent role lan thu hai.
- `.agents/skills/manifest.toml` la link contract de map skill <-> agent <-> UI metadata.
- External Codex discovery van la boundary rieng, khong duoc dam bao chi boi repo structure.

Agent hien co:

- `code-design-pattern`
- `codex-structure-validate`
- `diagram-generate`
- `doc-write`
- `git-workflow-design`
- `java-analyze`
- `react-code-generate`
- `skill-evolution-review`
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
| `[hooks.project]` | Project event log path, filename pattern, format, retention, service name va event wrappers. |
| `[skill_upgrade]` | Cau hinh chu ky observe/diagnose/proposal/apply cho co che skill evolution. |
| `[guards]` | Safety guards cho destructive/protected actions. |
| `[agent_registry.<name>]` | Dang ky agent config path, read_only, enabled, va hook gate da duoc sync tu agent metadata. |

Hook gating:

- `hooks.project.enabled = true` la master switch cho project hook framework.
- `agent_registry.<name>.hooks_project_enabled = false` la mac dinh an toan; chi agent nao bat `true` moi duoc ghi event log.
- `hooks.project.host`, `port`, `runtimePath`, `reloadOnConfigChange` dieu khien hook service runtime.

## Test Map

`test-map.toml` chia test thanh cac nhom:

- `test.always`: luon chay trong selected verification.
- `test.core`: chay khi file core/config/hook/script lien quan thay doi.
- `test.skill`: chay khi skill/agent/path lien quan thay doi.

Khi them file `*test*.ps1`, phai map vao dung mot group de validator chap nhan.
Chi dat test hoac resource tai `scripts/` neu chung la shared cho toan repo; neu chi phuc vu mot skill thi dat duoi `.agents/skills/<skill>/`.

Lenh:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

## Hooks

| File | Chuc nang |
|---|---|
| `log-agent-event.ps1` | Ghi agent execution event bang framework hook chung cua project. |
| `test-log-agent-event.ps1` | Test format, retention va output behavior cua agent event hook. |

Hook khong tu dong chay chi vi xuat hien trong config. Dung wrapper event trong `.codex/hooks/` khi can ghi deterministic event log, hoac start `scripts/hook-service.ps1` de nhan local API events va dispatch theo gating trong `.codex/config.toml`.

Runtime service:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/hook-service.ps1 -Action start
powershell -ExecutionPolicy Bypass -File scripts/hook-service.ps1 -Action status
powershell -ExecutionPolicy Bypass -File scripts/hook-service.ps1 -Action reload
powershell -ExecutionPolicy Bypass -File scripts/hook-service.ps1 -Action stop
```

Khi dang chay, service lang nghe `http://127.0.0.1:<port>` va ho tro:

- `GET /health`
- `GET /status`
- `POST /reload`
- `POST /stop`
- `POST /events`

## Quy Tac Cap Nhat

- Khi them agent config moi, tao hoac cap nhat `.codex/agent-metadata/<name>.toml`, roi chay validator voi `-Fix` de sync registry vao `config.toml`.
- Khi doi hook, cap nhat test lien quan trong `.codex/hooks/`.
- Khi doi test routing, chay `scripts/test-test-map.ps1`.
- Khi doi config, chay selected tests de bat output resolver, audit hook va validator side effects.

