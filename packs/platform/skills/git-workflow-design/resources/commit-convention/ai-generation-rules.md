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
- If terminal encoding is broken, fix encoding handling first.
- Do not silently strip accents unless the user explicitly approves that
  compromise.
