from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    validator = repo_root / ".agents" / "skills" / "codex-structure-validate" / "scripts" / "validate-codex-structure.ps1"
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
