# Logging Error Handling Review

Review observability with both security and incident response in mind:

- Do not log:
  - passwords
  - tokens
  - API keys
  - session ids
  - full personal data unless explicitly required and protected
- Error handling should not expose:
  - stack traces to clients
  - SQL details
  - internal URLs
  - secret config values
- Audit logging should exist for:
  - login success/failure
  - privilege changes
  - admin actions
  - security-sensitive config changes
- Review log injection risk:
  - unsanitized user-controlled fields in structured or plain logs
- Balance confidentiality and forensics:
  - enough context for investigation
  - without leaking sensitive payloads
