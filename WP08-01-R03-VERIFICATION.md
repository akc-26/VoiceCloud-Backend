# VoiceCloud WP08-01 Revision 03 Verification

## Reported failure reviewed

Revision 02 passed formatting, ESLint, focused regressions and the unified build. During the complete Jest suite, 52 suites and 599 tests passed. Only two assertions in `src/app.controller.spec.ts` failed because the test still expected the obsolete `/api/v1/health` metadata value while the accepted runtime, hosting contract and WP08 real-HTTP contract use `/health`.

The npm warning also showed that `--runInBand` was being interpreted by npm rather than forwarded to Jest. Therefore, the complete suite ran in parallel and emitted a worker teardown warning.

## Corrections

1. Updated both AppController contract assertions to the locked `/health` route.
2. Added `src/app.controller.spec.ts` and `src/hosting-routing.spec.ts` to the focused preflight so route drift fails before the expensive build and full suite.
3. Replaced the ambiguous npm wrapper invocation with direct `npx.cmd jest --runInBand` execution.
4. Extended the WP08 acceptance-contract test to enforce the route preflight and deterministic serial Jest command.

## Scope boundary

- Production `AppController`, health controller and runtime route remain unchanged.
- No dependency, lockfile, entity, migration, API prefix, authentication, authorization or business-flow change was made.
- The ERROR/WARN lines from negative-path unit tests are expected test logging; they did not fail those suites.

## Required Windows acceptance

Run:

```cmd
WP08-01-CHECK.cmd
```

Acceptance requires all nine stages and the final message:

```text
WP08-01 ALL AUTOMATED AND REAL HTTP ACCEPTANCE CHECKS PASSED
```
