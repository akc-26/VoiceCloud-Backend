# Shared Constants Module (@shared/constants)

## Responsibility
Contains read-only system configurations, magic numbers, application labels, and standard HTTP header keys.

## Exported Entities
- `PLATFORM_CONSTANTS`: Standard pagination limits, file upload limits, and version tokens.
- `APP_NAMES`: Canonical platform application titles.
- `HTTP_HEADERS`: Custom HTTP header key definitions.

## Guidelines
- Constants must be declared `as const` for strict literal type inference.
- Do not store environment-specific secrets here.
