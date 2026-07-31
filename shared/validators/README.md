# Shared Validators Module (@shared/validators)

## Responsibility
Provides common regex patterns and functional string validation checkers usable without class-validator dependencies in frontend and mobile environments.

## Exported Entities
- `VALIDATION_PATTERNS`: Regex patterns for email, username, phone, UUID.
- `isValidEmail`, `isValidUsername`, `isValidPhoneNumber`: Lightweight validation functions.

## Guidelines
- Use these helpers in frontend forms and pre-submission validation logic.
