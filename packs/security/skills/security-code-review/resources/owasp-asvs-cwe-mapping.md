# OWASP ASVS CWE Mapping

Use this file to normalize reporting, not to inflate findings.

Common mapping examples:

- Broken access control
  - OWASP: A01
  - ASVS: access control and authorization controls
  - CWE: `CWE-862`, `CWE-639`, `CWE-285`
- Cryptographic failures
  - OWASP: A02
  - ASVS: crypto, key management, credential storage
  - CWE: `CWE-327`, `CWE-328`, `CWE-916`, `CWE-798`
- Injection
  - OWASP: A03
  - ASVS: validation, encoding, query safety
  - CWE: `CWE-89`, `CWE-79`, `CWE-94`, `CWE-77`
- Insecure design
  - OWASP: A04
  - ASVS: architecture and secure design controls
  - CWE: `CWE-602`, `CWE-284`
- Security misconfiguration
  - OWASP: A05
  - ASVS: secure configuration and deployment hardening
  - CWE: `CWE-16`, `CWE-489`
- Vulnerable and outdated components
  - OWASP: A06
  - ASVS: dependency and component governance
  - CWE: `CWE-1104`
- Identification and authentication failures
  - OWASP: A07
  - ASVS: authentication, session, password, MFA
  - CWE: `CWE-287`, `CWE-384`, `CWE-522`
- Software and data integrity failures
  - OWASP: A08
  - ASVS: integrity, trusted update and pipeline controls
  - CWE: `CWE-494`, `CWE-829`
- Security logging and monitoring failures
  - OWASP: A09
  - ASVS: audit logging and monitoring
  - CWE: `CWE-778`, `CWE-117`
- SSRF
  - OWASP: A10
  - ASVS: outbound request controls and validation
  - CWE: `CWE-918`
