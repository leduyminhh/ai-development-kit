---
name: java-spring-maven-verification
description: Choose and run targeted Maven verification for Spring Boot projects, including wrapper detection, module selection, test narrowing, and surefire or failsafe failure review.
---

# Java Spring Maven Verification

Use this skill to verify Spring Boot + Maven changes.

## Command Selection

Prefer the Maven wrapper when present:

```powershell
.\mvnw
```

Use `mvn` when no wrapper exists.

## Verification Order

1. Targeted test for the changed class or behavior:
   `.\mvnw -Dtest=ClassName test`
2. Targeted method when useful:
   `.\mvnw -Dtest=ClassName#methodName test`
3. Module test for multi-module repos:
   `.\mvnw -pl module-name -am test`
4. Full unit suite:
   `.\mvnw test`
5. Integration tests only when the repo uses failsafe or the change touches integration boundaries:
   `.\mvnw verify`

Use the same command shape with `mvn` if `mvnw` is absent.

## Failure Review

- Check `target/surefire-reports/` for unit test failures.
- Check `target/failsafe-reports/` for integration test failures.
- Read the first failing assertion and the relevant stack trace before editing.
- Do not claim success without fresh command output.

## Output

Report:

- Command run.
- Exit status.
- Failing test names, if any.
- Whether broader verification is still needed.
