# VoiceCloud WP08 Package 01 Verification

## Package status

**Implementation candidate — local Windows acceptance required.**

## Source and scope checks completed during packaging

- Authoritative WP07 Package 07 baseline preserved.
- Landing, Admin, Creator, shared, backend modules, queues and sockets remain present.
- Locked route architecture remains present.
- No established file was deleted.
- No dependency version changed.
- `package-lock.json` unchanged.
- Migration files unchanged.
- Added scripts contain valid JavaScript syntax.
- All TypeScript and TSX source files passed syntax transpilation.
- Infrastructure mode behavior was executed in isolation.
- The 18-step HTTP acceptance runner control flow was executed against a stateful mock server and completed successfully.
- Package invariant and ZIP-integrity checks passed.

## Limitation of packaging environment

The packaging sandbox could not install the complete locked dependency tree because its internal npm mirror does not contain the locked frontend package `zustand@5.0.14`. Therefore, the package is not described as fully tested or accepted based on sandbox checks alone.

The authoritative verification is the included Windows checker, which uses the user's normal npm registry and real local PostgreSQL plus Redis/Memurai.

## Windows acceptance command

```cmd
WP08-01-CHECK.cmd
```

The checker must finish with:

```text
WP08-01 ALL AUTOMATED AND REAL HTTP ACCEPTANCE CHECKS PASSED
```

## Preconditions

- PostgreSQL is running.
- Redis or Memurai is running.
- The configured PostgreSQL user can create and drop an isolated database.
- The correct PostgreSQL password is available in `.env`, the environment, or entered securely when prompted.

## Acceptance boundary

Passing this package verifies WP08-01 only. Room/Socket.IO/moderation and economic/notification/recovery workflows remain for WP08-02 and WP08-03.
