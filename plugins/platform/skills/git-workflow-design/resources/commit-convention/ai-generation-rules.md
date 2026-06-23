# AI Generation And Encoding Rules

## Automatic Message Generation

When generating commit messages automatically, derive meaning from:

- staged diff
- surrounding code
- naming conventions
- nearby comments/config

Avoid hallucinating reasons or impacts.

Do not invent:

- migrations
- breaking changes
- security implications
- performance gains

unless directly supported by the change.

If intent is unclear:

- prefer neutral wording
- avoid overexplaining

## Encoding Safety

- Read and save commit text as UTF-8.
- Preserve Vietnamese diacritics.
- Write the full commit message to a UTF-8 file and commit with `git commit -F <file>`.
- Before committing, run `scripts/test-commit-message-encoding.ps1 -MessageFile <file>` from this skill when the generated body contains Vietnamese text.
- After committing, inspect `git log -1 --format=%B` and amend immediately if Vietnamese text was corrupted.
- If terminal encoding is broken, fix encoding handling first.
- Do not silently strip accents unless the user explicitly approves that
  compromise.
