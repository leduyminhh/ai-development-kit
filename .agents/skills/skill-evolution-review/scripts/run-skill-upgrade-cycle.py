from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))

from codex_config import CodexConfig, now_ho_chi_minh


def write_state(root: Path, state_path: str, phase: str, status: str, reason: str = "", target_agent: str = "", proposal_file: str = "", feedback_count: int = 0, reviewer_agent: str = "") -> None:
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
        "targetAgent": target_agent,
        "proposalFile": proposal_file,
        "feedbackCount": feedback_count,
        "reviewerAgent": reviewer_agent,
    }
    with log_file.open("a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(REPO_ROOT))
    args = parser.parse_args()

    root = Path(args.root).resolve()
    config = CodexConfig.load(root)
    enabled = config.get_bool("skill_upgrade", "enabled", default=False)
    feedback_path = config.get_str("skill_upgrade", "feedbackPath", default="audit/skill-feedback") or "audit/skill-feedback"
    proposal_path = config.get_str("skill_upgrade", "proposalPath", default="audit/skill-upgrade") or "audit/skill-upgrade"
    state_path = config.get_str("skill_upgrade", "statePath", default="audit/skill-upgrade-state") or "audit/skill-upgrade-state"
    reviewer_agent = config.get_str("skill_upgrade", "reviewerAgent", default="skill-evolution-review") or "skill-evolution-review"
    validator_command = config.get_str("validation", "validator_command", default="")

    if not enabled:
        write_state(root, state_path, "use", "skipped", "disabled", reviewer_agent=reviewer_agent)
        print("Skipped: skill upgrade is disabled.")
        return 0

    feedback_root = root / feedback_path
    if not feedback_root.exists():
        write_state(root, state_path, "observe", "skipped", "no_feedback", reviewer_agent=reviewer_agent)
        print("Skipped: No skill feedback found.")
        return 0

    feedback_entries = []
    for file in sorted(feedback_root.glob("*_skill-feedback.jsonl")):
        for line in file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                feedback_entries.append(json.loads(line.lstrip("\ufeff")))

    if not feedback_entries:
        write_state(root, state_path, "observe", "skipped", "no_feedback", reviewer_agent=reviewer_agent)
        print("Skipped: No skill feedback found.")
        return 0

    write_state(root, state_path, "observe", "completed", "feedback_loaded", feedback_count=len(feedback_entries), reviewer_agent=reviewer_agent)
    proposal_root = root / proposal_path
    proposal_root.mkdir(parents=True, exist_ok=True)

    grouped = {}
    for entry in feedback_entries:
        target_name = str(entry.get("targetName") or entry.get("agentName") or "").strip()
        grouped.setdefault(target_name, []).append(entry)

    writer_script = Path(__file__).resolve().parent / "write-skill-upgrade-proposal.py"
    created = []
    for target_agent, entries in grouped.items():
        feedback_count = len(entries)
        target_skills = []
        for entry in entries:
            for skill in entry.get("skillNames", []):
                if skill and skill not in target_skills:
                    target_skills.append(skill)
        target_type = str(entries[0].get("targetType") or "skill")

        now = now_ho_chi_minh()
        timestamp = now.strftime('%Y%m%d_%H%M%S_%f')
        proposal_file = proposal_root / f"{timestamp}_{target_agent}.json"
        snapshot_file = proposal_root / f"{timestamp}_{target_agent}.snapshot.json"
        write_state(root, state_path, "observe", "completed", "feedback_group_loaded", target_agent=target_agent, feedback_count=feedback_count, reviewer_agent=reviewer_agent)
        write_state(root, state_path, "diagnose", "completed", "feedback_grouped", target_agent=target_agent, feedback_count=feedback_count, reviewer_agent=reviewer_agent)

        snapshot = {
            "targetType": target_type,
            "targetName": target_agent,
            "targetAgent": str(entries[0].get("agentName") or target_agent),
            "targetSkills": target_skills,
            "feedbackEntries": entries,
        }
        snapshot_file.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        cmd = [sys.executable, str(writer_script), "--root", str(root), "--snapshot-file", str(snapshot_file), "--proposal-file", str(proposal_file)]
        if validator_command.strip():
            cmd.extend(["--validation-commands", validator_command])
        subprocess.run(cmd, check=True, cwd=root)

        write_state(root, state_path, "propose", "completed", "proposal_created", target_agent=target_agent, proposal_file=str(proposal_file), feedback_count=feedback_count, reviewer_agent=reviewer_agent)
        write_state(root, state_path, "validate", "completed", "validation_attached", target_agent=target_agent, proposal_file=str(proposal_file), feedback_count=feedback_count, reviewer_agent=reviewer_agent)
        write_state(root, state_path, "notify", "pending", "user_approval_required", target_agent=target_agent, proposal_file=str(proposal_file), feedback_count=feedback_count, reviewer_agent=reviewer_agent)
        snapshot_file.unlink(missing_ok=True)
        created.append(proposal_file)

    for proposal in created:
        print(f"Created skill upgrade proposal: {proposal}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
