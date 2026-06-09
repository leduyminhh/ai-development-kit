# AI Engineering CLI

`cli/` sở hữu executable phát hành `ai-engineering` và các shell hook tool vẫn
cần đi kèm platform. Runtime command thật nằm trong `packs/platform/src/`;
package CLI chỉ là cầu nối nhỏ, không phải bản triển khai thứ hai của logic
install/update/migration.

## Bản Đồ Thư Mục

| Path | Mục đích |
| --- | --- |
| `src/index.ts` | Executable Node mỏng. File này import `packs/platform/src/cli.mjs` và chuyển tiếp `process.argv`. |
| `dist/index.js` | Output executable sinh từ `npm run build:cli`; bin ở root và package trỏ tới đây. |
| `scripts/bin/` | PowerShell hook tool có thể chạy trực tiếp: install, invoke, doctor, service, audit query, trace view và resolve output path. |
| `scripts/hooks/` | Module runtime hook được nhóm theo `core/`, `adapters/`, `transports/` và test `fixtures/`. |
| `scripts/lib/` | Helper PowerShell dùng chung cho parse config Codex và output path. |
| `scripts/tests/` | PowerShell test tập trung cho hook runtime, installer, doctor, query, service và script helper. |
| `hooks/` | Provider-facing plugin hook launcher dùng bởi adapter/plugin artifact được sinh. |
| `package.json` | Metadata package CLI và mapping bin `ai-engineering`. |
| `tsconfig.json` | Cấu hình build TypeScript từ `src/` sang `dist/`. |

Đã loại khỏi bề mặt CLI active: các wrapper TypeScript cũ `src/commands/`,
`src/services/` và `src/utils/`. Chúng chỉ delegate vào platform module và tạo
cảm giác có một command tree song song dù không sở hữu runtime behavior.

## Runtime Command

Executable delegate sang platform runtime, hiện expose:

```text
ai-engineering --help
ai-engineering --version
ai-engineering init
ai-engineering doctor
ai-engineering validate
ai-engineering build --all
ai-engineering artifact verify --all
ai-engineering registry generate
ai-engineering install <pack...> --target <agent>
ai-engineering install --all
ai-engineering uninstall <pack...>
ai-engineering remove --all
ai-engineering list
ai-engineering plugin list
ai-engineering plugin outdated
ai-engineering update <pack...>
ai-engineering update --all
ai-engineering upgrade
ai-engineering plugin update <plugin>
ai-engineering generate-adapter <pack...> --target <agent>
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
ai-engineering plugin install <plugin...>
ai-engineering plugin remove <plugin...>
```

## Verification

Build executable wrapper:

```bash
npm run build:cli
```

Chạy kiểm tra repository từ root:

```bash
npm test
npm run validate
npm run build:cli
```

Chạy kiểm tra shell tập trung sau khi đổi `cli/scripts/`:

```powershell
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-resolve-output-file.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-hook-core.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-install-hooks.ps1
```

## Quy Tắc Thay Đổi

- Giữ hành vi command CLI trong `packs/platform/src/`; không tạo lại command
  handler dưới `cli/src/`.
- Giữ `src/index.ts` đủ nhỏ để chỉ là executable bridge.
- Rebuild `dist/` sau khi đổi TypeScript.
- Đặt shell entrypoint có thể chạy trong `scripts/bin/`, module hook tái sử dụng
  trong `scripts/hooks/`, helper dùng chung trong `scripts/lib/`, và test trong
  `scripts/tests/`.
- Update `README.md` trước, sau đó đồng bộ `README_VI.md`.
