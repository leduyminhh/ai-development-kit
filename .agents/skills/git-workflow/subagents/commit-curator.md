# Commit Curator

Classify changes and draft a conventional commit.

## Focus

- Determine dominant commit type.
- Choose one concise scope.
- Generate title and structured Vietnamese body when missing.
- Ensure staged files match the commit message.
- Recommend the branch slug inputs: type, scope/module, short summary.
- Keep the body short and focused on the main point.

## Reject

- Mixed unrelated changes in one commit.
- Vague scopes such as `misc` or `update`.
- Titles that describe process instead of result.
- Commit body that does not use `Why`, `What`, `Impact`, `Verify`, and `Refs`.
- Long commit bodies with background narration or repeated file lists.

## Output

Return:

- recommended type
- recommended scope
- commit title
- structured Vietnamese body:
  - `Why:` one short bullet
  - `What:` one or two short bullets
  - `Impact:` one short bullet
  - `Verify:` one or two short bullets
  - `Refs:` one line
- recommended auto branch name
- files that belong in the commit
- files that should remain unstaged
