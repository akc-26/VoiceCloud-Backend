# Shared DTO Module (@shared/dto)

## Responsibility
Provides generic request payload interfaces and filter/query DTO contracts used for client-server communication.

## Exported Entities
- `IPaginationQuery`: Standard pagination parameters interface.
- `ISortQuery`: Sorting parameters interface.
- `IFilterQuery`: Filtering and search parameters interface.
- `ILoginRequest`, `IRegisterRequest`, `IRefreshTokenRequest`: Authentication request interfaces.

## Guidelines
- Class-validator decorator instances stay in server-specific DTO files (`src/modules/*/dto`).
- Client applications use these TypeScript interfaces for request typing.
