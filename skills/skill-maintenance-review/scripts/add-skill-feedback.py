from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))

from codex_config import CodexConfig, now_ho_chi_minh


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(REPO_ROOT))
    parser.add_argument("--agent-name", required=True)
    parser.add_argument("--skill-names", nargs="*", default=[])
    parser.add_argument("--outcome", choices=["correct", "wrong", "mixed"], default="mixed")
    parser.add_argument("--task-summary", required=True)
    parser.add_argument("--correct-notes", default="")
    parser.add_argument("--wrong-notes", default="")
    parser.add_argument("--missing-notes", default="")
    args = parser.parse_args()

    if not any([args.correct_notes.strip(), args.wrong_notes.strip(), args.missing_notes.strip()]):
        raise SystemExit("At least one of CorrectNotes, WrongNotes, or MissingNotes is required.")

    root = Path(args.root).resolve()
    config = CodexConfig.load(root)
    feedback_path = config.get_str("skill_upgrade", "feedbackPath", default="audit/skill-feedback") or "audit/skill-feedback"
    feedback_root = root / feedback_path
    feedback_root.mkdir(parents=True, exist_ok=True)

    now = now_ho_chi_minh()
    feedback_file = feedback_root / f"{now.strftime('%Y%m%d')}_skill-feedback.jsonl"
    entry = {
        "timestamp": now.isoformat(timespec="seconds"),
        "agentName": args.agent_name,
        "skillNames": [name for name in args.skill_names if name.strip()],
        "outcome": args.outcome,
        "taskSummary": args.task_summary,
        "correctNotes": args.correct_notes,
        "wrongNotes": args.wrong_notes,
        "missingNotes": args.missing_notes,
    }
    with feedback_file.open("a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n")

    print(feedback_file)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(exc, file=sys.stderr)
        raise
