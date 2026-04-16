# Approval And Report

Use this resource whenever the agent proposes or applies a design pattern.

## Approval Prompt

Before implementation:

```text
Pattern proposed:
- Pattern group:
- Concrete pattern:

Selection rationale:
- Current problem:
- Why this pattern fits:
- Why a simpler approach is not enough:

Risk if applied incorrectly:
- Over-engineering:
- New coupling introduced:
- Test or maintenance risk:

Approval required: confirm before implementation.
```

## Final Report

After implementation:

```text
Pattern applied:
- Pattern group:
- Concrete pattern:

Result achieved:
- Coupling reduced:
- Flow clarified:
- Testability impact:

Files changed:

Verification:

Remaining risks / next recommendation:
```

## No-Pattern Report

When no pattern is appropriate:

```text
No design pattern applied.
Reason:
Simpler approach:
Verification:
```
