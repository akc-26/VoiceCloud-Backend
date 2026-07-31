# Shared API Module (@shared/api)

## Responsibility
Defines platform-wide HTTP response wrappers, standardized pagination structures, API error contracts, HTTP method enums, and centralized route constants.

## Exported Entities
- `ApiResponse<T>`: Standard JSON response envelope.
- `ApiErrorResponse`: Standard error structure.
- `PaginatedResponse<T>` & `PaginationMeta`: Standard pagination wrapper.
- `HttpMethod`: Standard HTTP method enum.
- `API_ROUTES`: Centralized route definitions.

## Guidelines
- All HTTP responses produced by backend services must conform to `ApiResponse<T>` or `PaginatedResponse<T>`.
- Frontends (Admin, Creator, Website, Mobile) must use these contracts for response parsing.
