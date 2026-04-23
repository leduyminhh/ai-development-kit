# Crypto Secrets Review

Review these areas when secrets, credentials, or tokens are involved:

- Hardcoded credentials, API keys, signing keys, salts, or test secrets left in code.
- Weak or deprecated cryptography:
  - MD5, SHA-1 for security decisions
  - ECB mode
  - custom crypto
  - disabled certificate validation
- Password storage:
  - use adaptive password hashing
  - verify cost and upgrade path
- Token signing and verification:
  - reject `alg=none`
  - pin accepted algorithms
  - validate issuer, audience, expiry, and key source
- Secret management:
  - secrets should come from environment, vault, or secure runtime store
  - avoid logging or echoing secrets in CI
- Red flags:
  - Base64 treated as encryption
  - shared static IVs
  - secrets in `application.yml`, `.env.example`, or committed test data without clear non-production scoping
