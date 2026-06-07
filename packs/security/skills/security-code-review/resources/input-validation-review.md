# Input Validation Review

Use this checklist when data crosses a trust boundary:

- Validate structure, type, range, enum membership, and size at the boundary.
- Prefer allow-lists over deny-lists for commands, file types, and URLs.
- Trace user input into:
  - SQL or ORM query construction
  - shell commands
  - template rendering
  - expression languages
  - file paths
  - HTTP clients
  - deserializers
- Review upload handling:
  - extension and content-type trust
  - path traversal
  - virus scanning or asynchronous quarantine
- Review SSRF controls:
  - host allow-list
  - scheme restriction
  - redirect handling
  - private network blocking
- Review deserialization and binding:
  - unsafe polymorphic types
  - excessive object graph binding
  - direct binding of security-sensitive fields
