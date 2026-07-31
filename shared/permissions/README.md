# Shared Permissions Module (@shared/permissions)

## Responsibility
Provides granular RBAC permission definitions, role-to-permission mapping matrices, and validation utility functions for access control across backend controllers and frontend UI gates.

## Exported Entities
- `Permission`: Enum of granular platform capabilities.
- `ROLE_PERMISSIONS`: Mapping dictionary from `UserRole` to allowed `Permission[]`.
- `hasPermission(role, permission)`: Function to verify if a given role possesses a required permission capability.

## Guidelines
- Admin Portal and Creator Studio route guards should import `hasPermission` or `Permission` enum to render or restrict UI components.
