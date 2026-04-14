---
name: java-spring-ticket-workflow
description: Handle Spring Boot + Maven ticket intake from pasted text or issue links, map likely code areas, create a short checkpoint plan, and guide implementation after approval.
---

# Java Spring Ticket Workflow

Use this skill for Spring Boot + Maven feature or bug tickets when the user wants ticket -> code -> tests -> commit proposal.

## Inputs

- Pasted ticket text, acceptance criteria, bug report, stack trace, or issue link.
- A Spring Boot + Maven repository.

## Workflow

1. Intake: summarize the ticket, acceptance criteria, non-goals, and unknowns.
2. Access: if an issue link is unavailable, ask for pasted content.
3. Map: locate likely Spring layers, such as controller, service, repository, DTO, mapper, config, migration, and tests.
4. Checkpoint: provide a concise plan with files likely to change and tests to run; wait for approval before editing when the change is non-trivial.
5. Implement: follow existing project patterns and keep changes narrow.
6. Verify: hand off to `java-spring-maven-verification`.
7. Finish: hand off to `java-spring-commit-proposal`.

## Spring Heuristics

- Prefer constructor injection and existing validation/error-handling patterns.
- Keep API contracts stable unless the ticket explicitly changes them.
- Add or update tests at the closest useful level: unit, slice, integration, or contract.
- Do not invent architecture. Mirror the codebase.

## When Things Fail

- If tests fail for a clear reason, fix the smallest relevant issue.
- If failure mode is unclear, switch to systematic debugging before changing more code.
- If requirements conflict with existing behavior, stop and ask for a decision.
