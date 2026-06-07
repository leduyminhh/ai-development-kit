# Security Rule Engine

Rule Engine is required for every `/security-scan`. External scanners are optional enrichments.

## Rule Pack Baseline

Load [rule-pack.lock.json](rule-pack.lock.json) before scan reporting. If network access is unavailable or freshness cannot be checked, record `OFFLINE_MODE` or `UNKNOWN`; do not claim the rule pack is latest.

Rule Engine stays stable. Rule packs are versioned and updateable.

## Required Categories

Java / Spring Security:

- SQL or JPQL injection
- command injection
- path traversal
- XXE
- SSRF
- hardcoded secrets
- weak JWT signing or validation
- missing authorization
- missing validation
- unsafe reflection
- insecure CORS
- CSRF disabled without reason
- public endpoint without control

React Security:

- `dangerouslySetInnerHTML`
- XSS sinks
- tokens stored in `localStorage`
- unsafe redirects
- missing CSP note
- sensitive data logging
- exposed API keys

Python Security:

- `subprocess(..., shell=True)`
- `os.system`
- `eval`
- `exec`
- `pickle.loads`
- `yaml.load` without `SafeLoader`
- hardcoded credentials
- path traversal
- unsafe file upload

Docker Security:

- running as root
- `latest` tag
- privileged mode
- secret in `ENV`
- missing `HEALTHCHECK`
- exposed sensitive ports
- writable filesystem

Secrets Detection:

- `password=`
- `secret=`
- `apikey=`
- `api_key=`
- `token=`
- private key markers
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Architecture Review:

- authentication flow
- authorization boundary
- service-to-service trust
- input validation boundary
- sensitive data flow
- sensitive logging
- token/session lifecycle
- dependency boundary
- public API exposure

## Masking Rule

Never print full secret values. Reports may include the key name, file, line, severity, and a masked value such as `sk_live_****1234`.

## Rule Freshness Commands

Recognize these intents:

```text
/security-rules check
/security-rules update
/security-rules list
/security-rules lock
/security-rules --help
```

Aliases are defined in [security-command-reference.md](security-command-reference.md). Normalize aliases to `/security-rules` before reporting or changing rule-pack state.

If update is requested, do not modify rule packs without user confirmation when the change writes files.
