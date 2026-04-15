# API Integration From Curl

Use this resource when the user provides a curl command, API sample, OpenAPI fragment, or backend contract.

## Parse

- method
- URL and path params
- query params
- headers
- auth mechanism
- body payload
- response shape
- expected status codes

## Implement

- Move secrets and tokens to environment variables or existing secret handling.
- Reuse the app's existing API client, fetch wrapper, query library, or server action pattern.
- Keep endpoint definitions out of presentational components when the codebase supports it.
- Model loading, empty, success, validation error, auth error, and server error states.
- Preserve abort/cancel behavior for search, filters, or rapid navigation.

## Validate

- Check request body matches the contract.
- Check response parsing does not assume optional fields are always present.
- Check UI copy is product-facing and not raw backend language.
- Add tests or mocks where the repo already has that pattern.

## Output

Return:

- interpreted API contract
- environment variables required
- files changed
- states implemented
- assumptions and blockers
