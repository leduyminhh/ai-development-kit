# Framework Detection

Use this resource before writing or running automated tests.

## Detection Signals

- Java Maven: `pom.xml`, `mvnw`, `.mvn/`
- Java Gradle: `build.gradle`, `settings.gradle`, `gradlew`
- React/Node: `package.json`, lockfiles, `vite.config.*`, `next.config.*`, `playwright.config.*`, `vitest.config.*`, `jest.config.*`
- Python: `pyproject.toml`, `pytest.ini`, `tox.ini`, `requirements.txt`
- Go: `go.mod`
- .NET: `.csproj`, `.sln`

## Command Selection

- Prefer package/project scripts over generic commands.
- Run one narrow test first when adding or debugging a specific test.
- Run broader suites when touching shared helpers, contracts, test config, or CI behavior.
- Avoid dependency installation unless required and approved by the current environment.

## Common Commands

- Maven: `./mvnw test`, `mvn test`
- Gradle: `./gradlew test`, `gradle test`
- Node unit/component: `npm test`, `pnpm test`, `yarn test`, `bun test`, or named package scripts
- Node E2E: `npx playwright test`, `pnpm playwright test`, or project script
- Python: `pytest`
- Go: `go test ./...`
- .NET: `dotnet test`

## Missing Framework

If no test framework exists:

- report the absence clearly
- recommend the smallest stack-appropriate test framework
- do not scaffold a full test setup unless the user requests it
