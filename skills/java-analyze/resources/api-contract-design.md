# API Contract Design

Use this resource when the backend architecture must support a frontend screen, React workflow, mobile client, or external consumer.

## Contract First Pass

- Identify the user action or screen state the API must support.
- Name the resource and operation in product language before choosing endpoint shape.
- Define request fields, response fields, status codes, and validation errors.
- Separate command operations from query operations when the behavior differs.
- Prefer stable DTOs over leaking persistence entities.
- Include pagination, sorting, filtering, and search rules when list data is involved.
- Define idempotency, retries, and duplicate submission behavior for commands.

## Frontend Integration Notes

- State what the UI can render from the response without another request.
- Include empty, loading, forbidden, validation error, and server error cases.
- Keep error payloads predictable enough for field-level and global messages.
- Avoid requiring frontend code to infer business state from incidental fields.
- Document freshness expectations for cached or eventually consistent data.

## Architecture Checks

- Put transaction boundaries in application services.
- Keep controller logic thin: parse, authorize, delegate, map response.
- Keep domain decisions out of DTO mappers.
- Avoid bidirectional entity graphs in API responses.
- Consider contract tests when multiple clients depend on the API.

## Output

Return:

- endpoint or operation summary
- request and response contract
- validation and error contract
- transaction and consistency notes
- frontend rendering notes
- open questions
