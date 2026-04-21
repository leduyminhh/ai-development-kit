from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))

from codex_config import CodexConfig, now_ho_chi_minh


def is_within_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def write_state(root: Path, state_path: str, phase: str, status: str, reason: str = "", proposal_file: str = "", target_agent: str = "", approved_by: str = "") -> None:
    state_root = root / (state_path or "audit/skill-upgrade-state")
    state_root.mkdir(parents=True, exist_ok=True)
    now = now_ho_chi_minh()
    log_file = state_root / f"{now.strftime('%Y%m%d')}_skill-upgrade-state.jsonl"
    record = {
        "schema": "codex.skill-upgrade.state.v1",
        "timestamp": now.isoformat(timespec="seconds"),
        "phase": phase,
        "status": status,
        "reason": reason,
        "proposalFile": proposal_file,
        "targetAgent": target_agent,
        "approvedBy": approved_by,
    }
    with log_file.open("a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(REPO_ROOT))
    parser.add_argument("--proposal-file", required=True)
    parser.add_argument("--approved-by", default="user")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    proposal_path = Path(args.proposal_file)
    if not proposal_path.is_absolute():
        proposal_path = root / proposal_path
    if not proposal_path.is_file():
        raise SystemExit(f"Proposal file not found: {proposal_path}")

    proposal = json.loads(proposal_path.read_text(encoding="utf-8-sig"))
    if proposal.get("approvalStatus") != "approved":
        raise SystemExit("Proposal must be approved before apply.")

    updates = list(proposal.get("updates", []))
    if not updates:
        raise SystemExit("Proposal has no updates to apply.")

    for update in updates:
        relative_path = str(update.get("path", ""))
        target_path = root / relative_path
        if not is_within_root(target_path, root):
            raise SystemExit(f"Update path escapes repository root: {relative_path}")
        normalized = relative_path.replace("\\", "/").lstrip("./")
        if normalized.startswith("docs/") or normalized.startswith("reports/"):
            raise SystemExit(f"Update path is protected and requires explicit approval flow: {relative_path}")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(str(update.get("content", "")), encoding="utf-8")

    config = CodexConfig.load(root)
    state_path = config.get_str("skill_upgrade", "statePath", default="audit/skill-upgrade-state") or "audit/skill-upgrade-state"
    validator_command = config.get_str("validation", "validator_command", default="")
    if validator_command.strip():
        result = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", validator_command], cwd=root)
        if result.returncode != 0:
            raise SystemExit(f"Validator command failed with exit code {result.returncode}")

    proposal["approvedBy"] = args.approved_by
    proposal["appliedAt"] = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    proposal["approvalStatus"] = "applied"
    proposal_path.write_text(json.dumps(proposal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_state(root, state_path, "upgrade", "completed", "proposal_applied", proposal_file=str(proposal_path), target_agent=str(proposal.get("targetAgent", "")), approved_by=args.approved_by)
    print(proposal_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
