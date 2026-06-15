# Java Spring Implementation

Implement an approved feature context in one Spring module.

1. Read the module build file, package conventions, API contract, persistence boundary, and existing tests.
2. Keep controllers limited to transport mapping and validation.
3. Put orchestration and transaction boundaries in application services.
4. Keep domain decisions independent from Spring and persistence types where the existing architecture supports it.
5. Implement request/response mapping, authorization, errors, persistence, and async behavior required by the approved contract.
6. Run the narrowest Maven or Gradle tests proving the change.

Return changed behavior, files, commands, results, and residual risks.
Do not broaden scope beyond the selected module.
