# Scripts

Thu muc `scripts/` chua cac script dung chung cho workflow Codex trong repo. Script o day nen deterministic, co pham vi ro rang, va uu tien entry runtime bang Python trong khi test harness van co the dung PowerShell tren Windows.

## Vai Tro

- Cai dat lien ket skill vao discovery path.
- Chay agent co audit logging.
- Resolve output file theo cau hinh.
- Resolve va chay selected tests.
- Cung cap test cho script, hook, validator va routing.
- Chua library PowerShell dung chung trong `scripts/lib/`.

## Script Chinh

| File | Chuc nang |
|---|---|
| `install-skill-link.ps1` | Tao junction/symlink tu Codex skill discovery path toi `skills` cua repo. |
| `add-skill-feedback.py` | Ghi feedback note co cau truc cho agent/skill de phuc vu chu ky tu de xuat nang cap. |
| `apply-skill-upgrade-proposal.py` | Apply mot proposal da duoc approve, chi cho phep ghi file trong scope hop le. |
| `invoke-agent-audited.ps1` | Boc mot command bang audit hook, doc agent config va giu exit code cua command goc. |
| `run-skill-upgrade-cycle.py` | Doc feedback note, nhom theo agent/skill va tao proposal nang cap cho review cycle. |
| `resolve-output-file.ps1` | Resolve duong dan output theo `.codex/config.toml`, subpath, filename pattern va timezone. |
| `resolve-test-plan.ps1` | Chon test command tu `.codex/test-map.toml` theo changed files, activated skills hoac agent names. |
| `test-selected.ps1` | Chay selected test plan; dung `-FromGit` de dua vao changed files/untracked files. |
| `write-skill-upgrade-proposal.py` | Bien snapshot feedback thanh proposal JSON co validation plan va approval status pending. |

## Library

| File | Chuc nang |
|---|---|
| `lib/codex-config.ps1` | Helper doc gia tri TOML don gian cho config/test map. |
| `lib/codex-output-file.ps1` | Helper tao ten file va duong dan output theo policy. |
| `lib/codex_config.py` | Helper Python doc config TOML va timezone cho runtime flow skill upgrade. |

## Test Scripts

| File | Chuc nang |
|---|---|
| `test-codex-pwsh-lib.ps1` | Kiem tra PowerShell helper library. |
| `test-add-skill-feedback.ps1` | Kiem tra intake script ghi skill feedback va config path lien quan. |
| `test-apply-skill-upgrade-proposal.ps1` | Kiem tra approval gate va scope guard cua apply script. |
| `test-invoke-agent-audited.ps1` | Kiem tra wrapper audited runner va negative cases. |
| `test-progressive-disclosure.ps1` | Kiem tra cac skill lon phai defer mapping rong sang selector resources. |
| `test-resolve-output-file.ps1` | Kiem tra output path resolver. |
| `test-run-skill-upgrade-cycle.ps1` | Kiem tra cycle tao proposal khi co feedback va skip khi khong co du lieu. |
| `test-test-map.ps1` | Kiem tra selected test routing va yeu cau map `*test*.ps1`. |

## Quy Tac Khi Them Script

- Dat ten kebab-case va co action ro rang, vi du `resolve-*`, `validate-*`, `test-*`.
- Neu them file `*test*.ps1`, phai map vao `.codex/test-map.toml` trong dung mot group.
- Dung `scripts/lib/` cho helper lap lai thay vi copy logic.
- Script khong nen ghi vao `docs/` hoac `reports/` neu chua co confirmation theo `AGENTS.md`.
- Uu tien tham so ro rang, exit code dung, output ngan va parse duoc.

## Lenh Thuong Dung

Chay selected tests tu git changes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Xem test plan kem commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/resolve-test-plan.ps1 -FromGit -IncludeCommands
```
