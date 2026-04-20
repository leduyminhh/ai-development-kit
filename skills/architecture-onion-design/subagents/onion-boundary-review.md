# Onion Boundary Reviewer

Review whether a proposed module follows Onion Architecture boundaries.

## Check

- Domain has no dependency on application, infrastructure, bootstrap, web, persistence, messaging, or framework startup.
- Application depends on domain and inward contracts only.
- Infrastructure implements inward contracts instead of defining business interfaces outward.
- Bootstrap delegates to application services and keeps request/response transport concerns outside the core.
- Shared modules do not smuggle framework or infrastructure dependencies inward.

## Output

Return:

- boundary passes
- boundary violations
- misplaced interfaces or adapters
- suggested package move
- risk if left unchanged
