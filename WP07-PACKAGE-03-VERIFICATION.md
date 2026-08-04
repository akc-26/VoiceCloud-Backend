# VoiceCloud WP07 Package 03 Verification

## Purpose

Package 03 permanently addresses the acceptance failure reported by Package 02.

## Corrective changes

- Preserves the AppConfigModule to AdminModule dependency-wiring repair.
- Adds an explicit formatting-normalization stage using the locked local Prettier dependency.
- Immediately runs a separate Prettier check after normalization.
- Aligns `.prettierrc` and ESLint to deterministic LF line endings on Windows and non-Windows systems.
- Adds `npm run format:check`.
- Runs from the package directory even when launched from another Command Prompt location.
- Preserves the original non-zero command exit code in the failure message.

## Acceptance sequence

1. `npm ci`
2. `npx prettier --write "src/**/*.ts"`
3. `npm run format:check`
4. ESLint
5. Full backend, website, admin and creator build
6. All Jest tests
7. Manual runtime and portal verification

The dependency deprecation, funding, audit and allow-scripts notices printed by npm are informational for this WP07 verification. Do not run `npm audit fix` or `npm audit fix --force` as part of WP07 acceptance because that would change locked dependencies outside the approved scope.
