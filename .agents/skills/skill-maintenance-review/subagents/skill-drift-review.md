# Skill Drift Review

Review one skill or agent for maintenance drift.

## Focus

- Read the smallest useful set of evidence for the target review.
- Prefer runtime audit logs and feedback notes when those inputs are available.
- If runtime evidence is not available, use the smallest useful repository evidence such as skill files, agent entries, config, and related scripts, and mark the review as repository-evidence-based.
- Distinguish repeated patterns from one-off noise.
- Preserve guidance that is still correct.
- Flag outdated, missing, or overfit guidance.
- Propose the smallest safe patch scope.

## Output

Return:

- target skill or agent
- evidence scope
- evidence summary
- correct guidance to keep
- incorrect guidance to remove or tighten
- missing guidance to add
- patch scope recommendation
- validation commands
- approval status: pending
