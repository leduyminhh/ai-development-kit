from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tomllib
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]

PATCH_BUILDERS: dict[tuple[str, str], list[dict[str, str]]] = {
    ("java-analyze", "missing-async-transaction-checklist"): [
        {
            "path": ".agents/skills/java-analyze/SKILL.md",
            "anchor": "- Put transaction boundaries in application services, not controllers.\n",
            "snippet": "- When async flows, retries, or domain events are involved, explicitly review async, retry, transaction, and idempotency interaction before approving the design.\n",
        },
    ],
    ("security-code-review", "missing-auth-session-checklist"): [
        {
            "path": ".agents/skills/security-code-review/SKILL.md",
            "anchor": "- Treat missing authorization as high risk unless strong evidence says otherwise.\n",
            "snippet": "- Require an explicit auth, session, token, and permission checklist whenever login or access-control behavior changes.\n",
        },
        {
            "path": ".agents/skills/security-code-review/resources/auth-session-review.md",
            "anchor": "- Session and token handling:\n",
            "snippet": "  - session invalidation after logout, password reset, and privilege change\n  - privilege boundary checks across direct API, background job, and alternate execution paths\n",
        },
    ],
    ("test-qa-review", "missing-regression-scope-checklist"): [
        {
            "path": ".agents/skills/test-qa-review/SKILL.md",
            "anchor": "- Regression risk.\n",
            "snippet": "- Regression scope checklist tied to impacted user flows, persistence paths, and integrations.\n",
        },
        {
            "path": ".agents/skills/test-qa-review/resources/regression-review.md",
            "anchor": "- Backward compatibility of request and response contracts.\n",
            "snippet": "- Impacted user flows, persistence paths, external integrations, and retry or timing behavior.\n",
        },
    ],
    ("architecture-onion-design", "missing-framework-leakage-check"): [
        {
            "path": ".agents/skills/architecture-onion-design/SKILL.md",
            "anchor": "7. Verify domain has no outer ring or framework dependency leakage.\n",
            "snippet": "8. Verify application services stay free from Spring, JPA, transport, and adapter leakage when the capability changes.\n",
        },
        {
            "path": ".agents/skills/architecture-onion-design/resources/java-package-template.md",
            "anchor": "8. Verify domain has no outer ring or framework dependency leakage.\n",
            "snippet": "9. Verify application services do not import Spring Web, JPA, Feign, messaging adapters, or transport DTOs.\n",
        },
    ],
    ("code-shared-design", "missing-version-compatibility-checklist"): [
        {
            "path": ".agents/skills/code-shared-design/SKILL.md",
            "anchor": "- Breaking changes require a new major version or explicit migration plan.\n",
            "snippet": "- Require a compatibility checklist that covers consumer impact, semantic versioning, and rollout sequencing before release.\n",
        },
        {
            "path": ".agents/skills/code-shared-design/resources/module-boundary-rules.md",
            "anchor": "- Publish via Nexus with semantic versioning.\n",
            "snippet": "- Before release, review consumer impact, deprecation window, rollout order, and backward compatibility expectations.\n",
        },
    ],
    ("test-automation-validate", "missing-test-scope-selection-guard"): [
        {
            "path": ".agents/skills/test-automation-validate/SKILL.md",
            "anchor": "7. Run the narrowest useful command first, then broader commands when risk justifies it.\n",
            "snippet": "8. Make the test scope explicit before implementation: say why unit, integration, contract, container, or concurrency coverage is the smallest useful level.\n",
        },
        {
            "path": ".agents/skills/test-automation-validate/resources/framework-detection.md",
            "anchor": "- Run broader suites when touching shared helpers, contracts, test config, or CI behavior.\n",
            "snippet": "- State the smallest useful automated scope before choosing the command so strategy drift is visible in the report.\n",
        },
        {
            "path": ".agents/skills/test-automation-validate/scripts/test-automation-validate-strategy.ps1",
            "anchor": "Assert-FileContains -Path $rules -Pattern 'consumer|provider|schema|OpenAPI|Pact' 'Rules should cover contract testing choices.'\n",
            "snippet": "Assert-FileContains -Path $skill -Pattern 'smallest useful level' 'SKILL.md should require explicit smallest useful test scope selection.'\n",
        },
    ],
    ("diagram-generate", "missing-diagram-type-selection-guard"): [
        {
            "path": ".agents/skills/diagram-generate/SKILL.md",
            "anchor": "4. Select the smallest useful PlantUML diagram type.\n",
            "snippet": "4a. If two diagram types compete, state the rejection reason for the loser before generating output.\n",
        },
        {
            "path": ".agents/skills/diagram-generate/resources/plantuml-diagram-selection.md",
            "anchor": "Avoid more than two diagrams unless the user explicitly asks for a diagram pack.\n",
            "snippet": "- Reject a richer diagram when a simpler one answers the question without losing decision-critical detail.\n",
        },
    ],
    ("doc-write", "missing-protected-path-confirmation-reminder"): [
        {
            "path": ".agents/skills/doc-write/SKILL.md",
            "anchor": "9. If writing under protected paths such as `docs/` or `reports/`, request explicit confirmation before creating or updating files.\n",
            "snippet": "9a. If confirmation has not been granted, stop at an inline draft and do not imply that a file write is pending automatically.\n",
        },
        {
            "path": ".agents/skills/doc-write/resources/project-doc-output-catalog.md",
            "anchor": "For multiple files, list every `docs/` path and summary. Do not write until the user explicitly confirms.\n",
            "snippet": "- If confirmation is missing or ambiguous, return the draft inline and restate the exact protected path that would be written.\n",
        },
    ],
    ("react-code-generate", "missing-api-integration-routing"): [
        {
            "path": ".agents/skills/react-code-generate/SKILL.md",
            "anchor": "7. Translate API examples into a small client layer or existing data-fetching pattern:\n",
            "snippet": "   - route curl, OpenAPI, and backend contract tasks through the API integration workflow before touching presentational components\n",
        },
        {
            "path": ".agents/skills/react-code-generate/resources/api-integration-from-curl.md",
            "anchor": "- Reuse the app's existing API client, fetch wrapper, query library, or server action pattern.\n",
            "snippet": "- Decide the integration route first: existing client, typed request helper, server action, or local fetch wrapper.\n",
        },
    ],
}


def normalize_note(value: object) -> str:
    return str(value or "").strip()


def collect_unique(entries: list[dict[str, object]], key: str) -> list[str]:
    values: list[str] = []
    for entry in entries:
        value = normalize_note(entry.get(key, ""))
        if value and value not in values:
            values.append(value)
    return values


def evidence_key_for(entry: dict[str, object]) -> str:
    explicit_key = normalize_note(entry.get("evidenceKey", ""))
    if explicit_key:
        return explicit_key

    payload = " | ".join(
        part for part in [
            normalize_note(entry.get("wrongNotes", "")),
            normalize_note(entry.get("missingNotes", "")),
            normalize_note(entry.get("taskSummary", "")),
        ]
        if part
    )
    if not payload:
        payload = normalize_note(entry.get("correctNotes", "")) or "general-guidance"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]


def load_evolution_policy(root: Path, target_name: str) -> dict[str, object]:
    manifest_path = root / ".agents" / "skills" / "manifest.toml"
    if not manifest_path.is_file():
        return {}

    manifest = tomllib.loads(manifest_path.read_text(encoding="utf-8-sig"))
    defaults = dict(manifest.get("evolution", {}).get("defaults", {}))
    profiles = manifest.get("evolution", {}).get("profile", [])
    for profile in profiles:
        if str(profile.get("skill", "")).strip() == target_name:
            merged = dict(defaults)
            merged.update(profile)
            return merged
    return defaults


def build_skill_patch(root: Path, proposal_target: str, evidence_key: str) -> list[dict[str, str]]:
    configs = PATCH_BUILDERS.get((proposal_target, evidence_key))
    if not configs:
        return []

    updates: list[dict[str, str]] = []
    for config in configs:
        target_path = root / str(config["path"])
        if not target_path.is_file():
            return []

        content = target_path.read_text(encoding="utf-8")
        snippet = config["snippet"]
        if snippet in content:
            continue

        anchor = config["anchor"]
        if anchor not in content:
            return []

        updated = content.replace(anchor, anchor + snippet, 1)
        updates.append({
            "path": str(config["path"]),
            "content": updated,
        })
    return updates


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot-file", required=True)
    parser.add_argument("--proposal-file", required=True)
    parser.add_argument("--validation-commands", nargs="*", default=[])
    parser.add_argument("--root", default=str(REPO_ROOT))
    args = parser.parse_args()

    root = Path(args.root).resolve()
    snapshot = json.loads(Path(args.snapshot_file).read_text(encoding="utf-8-sig"))
    feedback_entries = list(snapshot.get("feedbackEntries", []))
    target_name = str(snapshot.get("targetName") or snapshot.get("targetAgent") or "").strip()
    evolution_policy = load_evolution_policy(root, target_name)

    correct_notes = collect_unique(feedback_entries, "correctNotes")
    wrong_notes = collect_unique(feedback_entries, "wrongNotes")
    missing_notes = collect_unique(feedback_entries, "missingNotes")
    evidence_counts: dict[str, int] = {}
    severe_reproducible = False
    for entry in feedback_entries:
        key = evidence_key_for(entry)
        evidence_counts[key] = evidence_counts.get(key, 0) + 1
        if normalize_note(entry.get("severity", "")) == "high" and bool(entry.get("reproducible", False)):
            severe_reproducible = True

    pattern_count = max(evidence_counts.values(), default=0)
    min_pattern_count = int(evolution_policy.get("min_pattern_count", 3) or 3)
    allow_fast_track = bool(evolution_policy.get("allow_fast_track", True))
    repeated_pattern = pattern_count >= min_pattern_count
    fast_track = severe_reproducible and allow_fast_track
    evidence_basis = "severe-reproducible" if fast_track and not repeated_pattern else "repeated-pattern" if repeated_pattern else "single-anecdote"
    actionable = repeated_pattern or fast_track
    dominant_evidence_key = max(evidence_counts, key=evidence_counts.get) if evidence_counts else ""
    mode = str(evolution_policy.get("mode", "hybrid")).strip() or "hybrid"
    auto_apply = bool(evolution_policy.get("auto_apply", False))

    proposed_changes: list[str] = []
    updates: list[dict[str, str]] = []
    if actionable:
        proposed_changes = [f"Tighten or replace guidance related to: {note}" for note in wrong_notes]
        proposed_changes.extend(f"Add missing guidance for: {note}" for note in missing_notes)
        if not proposed_changes and correct_notes:
            proposed_changes.append("Preserve current guidance and review for overfitting before changing the skill.")
        updates = build_skill_patch(root, target_name, dominant_evidence_key)

    if not actionable:
        recommendation = "insufficient-evidence"
    elif mode == "review-first" or not auto_apply or not updates:
        recommendation = "manual-review"
    else:
        recommendation = "safe-auto-apply"

    validation_commands = [item for item in args.validation_commands if item.strip()]
    policy_validation_commands = [str(item).strip() for item in evolution_policy.get("validation_commands", []) if str(item).strip()]
    for command in policy_validation_commands:
        if command not in validation_commands:
            validation_commands.append(command)

    proposal = {
        "createdAt": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "targetType": snapshot.get("targetType", "skill"),
        "targetName": target_name,
        "targetAgent": snapshot.get("targetAgent"),
        "targetSkills": list(snapshot.get("targetSkills", [])),
        "policy": evolution_policy,
        "feedbackCount": len(feedback_entries),
        "patternCount": pattern_count if actionable else 0,
        "evidenceBasis": evidence_basis,
        "exceptionUsed": bool(fast_track and not repeated_pattern),
        "recommendation": recommendation,
        "riskLevel": "low" if recommendation == "safe-auto-apply" else "medium" if actionable else "unknown",
        "observedPatterns": [
            f"correct_notes={len(correct_notes)}",
            f"wrong_notes={len(wrong_notes)}",
            f"missing_notes={len(missing_notes)}",
            f"pattern_count={pattern_count}",
        ],
        "correctGuidance": correct_notes,
        "incorrectGuidance": wrong_notes,
        "missingGuidance": missing_notes,
        "proposedChanges": proposed_changes,
        "validationCommands": validation_commands,
        "approvalStatus": "pending",
        "updates": updates,
    }

    proposal_path = Path(args.proposal_file)
    proposal_path.write_text(json.dumps(proposal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(proposal_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
