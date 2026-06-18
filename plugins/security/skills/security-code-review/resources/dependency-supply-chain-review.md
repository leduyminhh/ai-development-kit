# Dependency Supply Chain Review

Inspect the package and build chain when dependencies change or when the task touches CI/CD:

- Compare manifest and lockfile changes together.
- Check whether versions are pinned, floating, or pulled from untrusted registries.
- Review plugin and build-tool additions, not just runtime libraries.
- Flag:
  - disabled integrity checks
  - unpinned Git dependencies
  - install scripts with network execution
  - direct downloads without checksum verification
- Review CI steps that fetch tools, containers, or scripts at runtime.
- Prefer evidence-backed risk statements:
  - exposed package source
  - suspicious install hook
  - missing lockfile update
  - vulnerable or unsupported major line if the repo already documents the version policy
