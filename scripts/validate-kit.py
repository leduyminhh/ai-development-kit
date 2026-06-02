from __future__ import annotations

import subprocess
import sys
from pathlib import Path
import tomllib


def resolve_skills_root(repo_root: Path) -> Path:
    manifest_path = repo_root / "skills" / "manifest.toml"
    if not manifest_path.exists():
        return repo_root / "skills"

    with manifest_path.open("rb") as manifest_file:
        manifest = tomllib.load(manifest_file)

    configured = manifest.get("repo_structure", {}).get("skills_root", "skills")
    return repo_root / configured


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    skills_root = resolve_skills_root(repo_root)
    validator = skills_root / "codex-structure-validate" / "scripts" / "validate-codex-structure.ps1"
    command = [
        "powershell",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(validator),
        "-Root",
        str(repo_root),
    ]
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
