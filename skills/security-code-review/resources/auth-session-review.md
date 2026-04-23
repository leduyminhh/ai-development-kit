# Auth Session Review

Review these points when code touches login, permission checks, or user identity:

- Authentication:
  - password hashing algorithm and parameter strength
  - account lockout, brute-force throttling, replay resistance
  - MFA or step-up where sensitive actions require it
- Authorization:
  - endpoint, service, and object-level access control
  - tenant scoping and ownership checks
  - method-level guardrails that cannot be bypassed by alternate paths
- Session and token handling:
  - secure cookie flags
  - token expiry, rotation, revocation, refresh flow
  - audience, issuer, scope, and signature verification
- Trust boundaries:
  - do not trust client role flags
  - do not rely on UI-only hiding for permissions
- Red flags:
  - missing `@PreAuthorize` or equivalent on privileged handlers
  - user id taken directly from request without ownership validation
  - permissive wildcard role checks
  - JWT parsing without signature validation
