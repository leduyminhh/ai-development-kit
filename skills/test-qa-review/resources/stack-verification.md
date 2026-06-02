# Stack Verification

Use this resource to choose verification commands without guessing.

## Detection Signals

- Java Maven: `pom.xml`, `mvnw`, `.mvn/`
- Java Gradle: `build.gradle`, `settings.gradle`, `gradlew`
- React/Node: `package.json`, lockfiles, `src/`, `vite.config.*`, `next.config.*`
- Python: `pyproject.toml`, `pytest.ini`, `requirements.txt`, `tox.ini`
- Go: `go.mod`
- .NET: `.csproj`, `.sln`

## Command Selection

- Prefer project scripts over generic commands.
- Prefer targeted tests when the change is narrow.
- Add build/typecheck/lint when the change touches shared contracts, generated types, or public UI.
- Avoid dependency installation unless the task requires it or dependencies are missing.

## Common Commands

- Maven: `./mvnw test` or `mvn test`
- Gradle: `./gradlew test` or `gradle test`
- Node: package manager script for `test`, `lint`, `typecheck`, `build`
- Python: `pytest`
- Go: `go test ./...`
- .NET: `dotnet test`

## Reporting

State:

- command run
- exit result
- relevant failures
- what remains unverified
- next command to run if time or environment allows
