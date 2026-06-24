---
name: release-notes
description: Use when generating or reviewing a changelog or release notes from merged commits, pull requests, or tickets, grouped by audience and change type.
---

# Release Notes

## Overview

Use this skill to turn a range of merged changes into a changelog and
audience-appropriate release notes: group by change type, call out breaking
changes and migrations, and keep entries verifiable against the source history.
It is the canonical writing policy for release notes; git workflow skills may
collect the source range, but final classification and prose belong here.

## When to Use

Use this skill when preparing a release, cutting a version, or summarizing what
changed between two points in history. Use it for both an internal changelog and
user-facing release notes.

## Core Process

1. Establish the change range (previous tag or release to the current head), or
   accept a verified range collected by a git workflow skill, and collect the
   merged commits, pull requests, or tickets in it.
2. Classify each change: feature, fix, performance, deprecation, breaking change,
   security, or internal-only.
3. Filter internal-only noise out of user-facing notes; keep it in the full
   changelog.
4. Write each entry as a user-observable outcome, linking the source PR or
   ticket for traceability.
5. Surface breaking changes and required migration steps prominently at the top.

## Conventions

- Follow Keep a Changelog grouping (Added, Changed, Fixed, Deprecated, Removed,
  Security) when the project has no other convention.
- Derive type from Conventional Commit prefixes (`feat`, `fix`, `perf`, `!` for
  breaking) when commit messages use them.

## Red Flags

- Entries describe code internals instead of user-observable change.
- A breaking change is buried in the middle of the list.
- An entry has no traceable source commit, PR, or ticket.
- The changelog and the user-facing notes are not derived from the same range.

## Verification

- Confirm every entry maps to a real change in the stated range.
- Confirm breaking changes list their migration steps.
- Confirm the version and date header match the release being cut.
- Report any change that could not be classified from the source.

## Output Format

- Version and date header.
- Breaking changes and migration steps (if any).
- Grouped entries by change type with source links.
- Notable upgrade notes.

## Notes

- Keep the internal changelog complete; tailor the user-facing notes by audience.
- Return user-facing results in Vietnamese.
