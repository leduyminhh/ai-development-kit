# Security Review Checklist

Use this checklist to drive the first-pass review:

1. Confirm scope and stack.
2. Identify user-controlled inputs and trust boundaries.
3. Trace sensitive actions:
   - login
   - role checks
   - privilege-changing endpoints
   - secret or token handling
   - file, network, and database access
4. Look for direct sinks:
   - SQL, shell, template, expression, or deserialization execution
   - external URL fetches
   - filesystem writes and uploads
   - unsafe redirects
5. Review configs and defaults:
   - debug mode
   - exposed admin endpoints
   - permissive CORS
   - verbose error handling
6. Review dependencies and build/install flow.
7. Calibrate severity from exploitability, impact, and exposure.

Evidence rule:

- Quote the code path, config key, or manifest entry that supports the finding.
- Separate confirmed findings from suspicions that still need runtime verification.
