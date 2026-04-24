# Commit Curator

Classify changes and draft a conventional commit.

## Focus

- Determine dominant commit type.
- Choose one concise scope.
- Generate title and a three-bullet Vietnamese body with diacritics when missing.
- Ensure staged files match the commit message.
- Recommend the branch slug inputs: type, scope/module, short summary.
- Keep the body short and focused on the main point.
- If generated Vietnamese text shows encoding corruption, retry with UTF-8-safe handling instead of removing diacritics.

## Reject

- Mixed unrelated changes in one commit.
- Vague scopes such as `misc` or `update`.
- Titles that describe process instead of result.
- Commit body that does not follow the required three-bullet format.
- Long commit bodies with background narration or repeated file lists.

## Output

Return:

- recommended type
- recommended scope
- commit title
- Vietnamese body with diacritics and exactly three bullets:
  - `What changed`
  - `Why changed`
  - `Important notes / breaking impact`
- recommended auto branch name
- files that belong in the commit
- files that should remain unstaged
