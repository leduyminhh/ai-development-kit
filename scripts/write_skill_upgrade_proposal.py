from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-file", required=True)
    parser.add_argument("--proposal-file", required=True)
    parser.add_argument("--validation-commands", nargs="*", default=[])
    args = parser.parse_args()

    snapshot = json.loads(Path(args.snapshot_file).read_text(encoding="utf-8-sig"))
    feedback_entries = list(snapshot.get("feedbackEntries", []))

    def collect(key: str):
        values = []
        for entry in feedback_entries:
            value = str(entry.get(key, "")).strip()
            if value and value not in values:
                values.append(value)
        return values

    correct_notes = collect("correctNotes")
    wrong_notes = collect("wrongNotes")
    missing_notes = collect("missingNotes")

    proposed_changes = [f"Tighten or replace guidance related to: {note}" for note in wrong_notes]
    proposed_changes.extend(f"Add missing guidance for: {note}" for note in missing_notes)
    if not proposed_changes and correct_notes:
        proposed_changes.append("Preserve current guidance and review for overfitting before changing the skill.")

    proposal = {
        "createdAt": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "targetAgent": snapshot.get("targetAgent"),
        "targetSkills": list(snapshot.get("targetSkills", [])),
        "feedbackCount": len(feedback_entries),
        "observedPatterns": [
            f"correct_notes={len(correct_notes)}",
            f"wrong_notes={len(wrong_notes)}",
            f"missing_notes={len(missing_notes)}",
        ],
        "correctGuidance": correct_notes,
        "incorrectGuidance": wrong_notes,
        "missingGuidance": missing_notes,
        "proposedChanges": proposed_changes,
        "validationCommands": [item for item in args.validation_commands if item.strip()],
        "approvalStatus": "pending",
        "updates": [],
    }

    proposal_path = Path(args.proposal_file)
    proposal_path.write_text(json.dumps(proposal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(proposal_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
