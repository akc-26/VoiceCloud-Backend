# VoiceCloud WP08-01 R05 — Clean Source and Acceptance Harness Stabilization

## Source input

- Uploaded archive: `VoiceCloud-Backend-VC-PH08-WP08-01-R04(1).zip`
- Actual VoiceCloud source was nested under `VoiceCloud-Backend/` inside an AI Studio application export.
- The exported `.git` metadata and nested ZIP were not used.

## Clean-source preparation

The R05 package contains one VoiceCloud project only. The following AI Studio wrapper/export files were removed from the actual project copy because they are not used by the NestJS, Website, Admin, or Creator build pipelines:

- `metadata.json`
- root `index.html`
- root `vite.config.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`

The package excludes `.git`, nested ZIP files, `node_modules`, `dist`, `coverage`, uploads, `.env`, and local acceptance logs.

Historical WP07/WP08 reports and check scripts were retained for the later production-cleanup stage, as previously agreed.

## Confirmed acceptance-harness problems corrected

The reported Windows failure ended with only the PowerShell wrapper message that `wp08-01-acceptance.mjs` returned exit code 1. That output did not preserve the exact failing HTTP step in the supplied excerpt. R05 therefore corrects the checker and acceptance harness so a future failure is actionable rather than opaque.

### `scripts/wp08/wp08-01-acceptance.mjs`

- Added numbered `[RUN]` and `[PASS]` acceptance steps.
- Added bounded per-request timeout through `WP08_REQUEST_TIMEOUT_MS`.
- Added exact method, URL, status, content type, and redacted response preview on failure.
- Added environment/base-URL diagnostics without printing credentials or tokens.
- Strengthened the Host business-settings snapshot validation used for restoration.
- Added `--self-check` mode to validate the settings snapshot and secret redaction before infrastructure startup.
- Preserved non-zero exit behavior for real failures.
- Preserved Host settings restoration on success and handled failure.

### `scripts/wp08/wp08-01-check.ps1`

- Resolves and changes to the actual repository root before running commands.
- Uses the repository's non-mutating `npm run format:check` command.
- Runs the acceptance self-check before dependency-backed focused tests.
- Uses the explicit Jest configuration and serial execution.
- Verifies backend and all three portal build artifacts before runtime checks.
- Validates a configured WP08 port and otherwise resolves one free local port.
- Uses the same port for NestJS, readiness checks, and `WP08_BASE_URL`.
- Confirms the responding process is VoiceCloud through `/api` identity and `/health` real-infrastructure state.
- Captures separate server and acceptance output/error logs.
- Adds a bounded HTTP acceptance timeout.
- Shows detailed acceptance and server logs on failure and retains them for diagnosis.
- Stops tracked acceptance and server processes on success and failure.
- Treats temporary database or private-storage cleanup failure as a failed acceptance rather than a warning.
- Removes diagnostic logs after complete success.

### Regression contract

`src/wp08/wp08-01-acceptance-contract.spec.ts` now protects the self-check, diagnostics, non-mutating formatting, app-identity validation, timeout, build artifacts, process cleanup, temporary-database cleanup, and private-storage cleanup.

### `.gitignore`

Added local acceptance stdout/stderr log patterns so diagnostics cannot be committed accidentally.

## Source areas intentionally unchanged

- `package.json`
- `package-lock.json`
- dependency versions
- database migrations
- entities and repositories
- API prefix and established routes
- authentication and RBAC implementation
- Host business logic
- Redis, BullMQ, and Socket.IO architecture
- Landing, Admin, and Creator application source

The established Creator Studio hosting route remains `/creator`, matching the current source architecture.

## Verification completed in the packaging environment

- Uploaded archive and nested project inventory inspected.
- AI Studio wrapper/export content removed.
- JavaScript syntax check passed for `wp08-01-acceptance.mjs`.
- Acceptance `--self-check` passed.
- Controlled HTTP diagnostic smoke test passed, including secret redaction and non-zero failure exit.
- 742 TypeScript/TSX files passed syntax transpilation with zero syntax failures.
- Package-integrity and excluded-artifact checks passed before archive creation.

## Verification pending on the user's Windows environment

Dependency-backed Prettier, ESLint, build, Jest, PostgreSQL, Redis/Memurai, runtime, and full real HTTP acceptance were not claimed as completed here. Run:

```cmd
WP08-01-CHECK.cmd
```

The required final message is:

```text
WP08-01 ALL AUTOMATED AND REAL HTTP ACCEPTANCE CHECKS PASSED
```

If a real application-flow failure remains, R05 will now print the exact failing check, request, response, and relevant server logs instead of only the wrapper exception.
