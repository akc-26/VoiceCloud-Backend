# Shared Contracts Module (@shared/contracts)

## Responsibility
Contains canonical interfaces representing primary platform entities (User, Room, AuthTokens, MediaAssets, Health Diagnostics) and WebSocket event definitions.

## Exported Entities
- `UserContract`: Domain model for user accounts.
- `AuthTokenContract`: Standard JWT authentication payload.
- `RoomContract`: Domain model for live audio/video rooms.
- `MediaAssetContract`: Storage entity contract.
- `SystemHealthContract`: Health metric payload contract.
- `SocketEvents`: Real-time WebSocket event namespace.

## Guidelines
- Domain models defined here must remain agnostic of database or framework ORM models.
- Any client application consuming real-time events must reference `SocketEvents`.
