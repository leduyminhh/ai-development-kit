---
id: knowledge.write_release_notes
slug: write-release-notes
description: Generate a changelog and release notes from a change range.
version: 1.0.0
---

# Write Release Notes

## Intent

Turn merged changes into a changelog and audience-appropriate release notes.

## Inputs

- change range
- audience

## Required Skills

- release-notes

## Steps

1. Collect merged commits, pull requests, or tickets in the range.
2. Classify each change and filter internal-only noise out of user-facing notes.
3. Surface breaking changes and their migration steps.
4. Write grouped, source-linked entries.

## Output Contract

- version and date
- breaking changes
- grouped entries
- upgrade notes
