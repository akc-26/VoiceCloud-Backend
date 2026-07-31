# Shared Utilities Module (@shared/utils)

## Responsibility
Contains environment-agnostic helper functions for formatting, string manipulation, object cloning, async delay, and query string building.

## Exported Entities
- `formatDate`: Date formatter.
- `truncateText`: String truncation with ellipsis.
- `deepClone`: Deep object copy.
- `sleep`: Promise-based timer delay.
- `buildQueryString`: Object to URL query parameter serializer.

## Guidelines
- Pure functions only. Must have zero side effects or DOM dependencies.
