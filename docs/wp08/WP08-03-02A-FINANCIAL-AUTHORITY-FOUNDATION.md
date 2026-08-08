# VC-PH08-WP08-03-02A — Financial Authority & Idempotency Foundation

## Baseline

- Repository: `https://github.com/akc-26/VoiceCloud-Backend`
- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-01-R05`
- Commit: `63d6b0d569e971c1b5e8293c48c7d58858179428`
- Accepted R05 result: 11/11 stages, 61/61 Jest suites, 677/677 tests, unified build and compiled frontend runtime smoke.

## Scope

WP08-03-02A resolves the financial-authority prerequisites required before authoritative gifts and payout settlement are changed. It does not implement WP08-03-02B gift settlement, WP08-03-02C payout lifecycle, or WP08-03-02D Host/Admin reconciliation.

## Implemented authority rules

1. PostgreSQL wallet rows and immutable ledger rows are the only authoritative financial state.
2. Wallet creation requires an existing User and initializes every balance/lifetime field to zero.
3. Authoritative mutations execute through `WalletMutationService` inside `DataSource.transaction(...)`.
4. User and wallet rows are acquired with PostgreSQL `pessimistic_write` locks.
5. Multi-wallet operations acquire locks in stable User-ID order.
6. Balance mutation and matching ledger persistence occur in the same transaction.
7. Repeatable operations use persistent `operationKey` values backed by a unique database index.
8. Multi-leg operations use an `operationGroupId` and deterministic leg keys.
9. Ledger rows record `balanceBefore` and `balanceAfter` for auditability.
10. Public endpoint paths remain unchanged; operation/idempotency keys are optional additive DTO fields.

## Migration

`1700000000009-Phase08EconomyWalletAuthority.ts` adds nullable fields to `wallet_transactions`:

- `operationKey`
- `operationGroupId`
- `balanceBefore`
- `balanceAfter`

It also adds:

- partial unique index `UQ_wallet_transactions_operationKey` for non-null keys;
- index `IDX_wallet_transactions_operationGroupId`.

The migration does not rewrite historical rows. `down()` removes all indexes and columns added by `up()`.

## Converted mutation paths

The following existing WalletService operations now delegate to the transaction authority without changing their routes:

- credit wallet;
- debit wallet;
- user-to-user transfer;
- diamond-to-coin conversion;
- Creator earnings recording.

Diamond conversion records separate immutable debit/credit ledger legs under one operation group so both balance movements have before/after evidence.

## Regression-test naming

No `src/wp08/wp08-03-02*.spec.ts` file is added. Durable tests live beside the product behavior:

- `src/modules/wallet/wallet-authority.service.spec.ts`
- `src/modules/wallet/wallet-concurrency.spec.ts`
- `src/database/migrations/economy-wallet-authority.spec.ts`

The WP08-03-01 source-hash manifest remains historical audit evidence. Its regression test now verifies that the original hash evidence is retained and that all audited paths still exist; authorized later implementation is no longer incorrectly rejected merely because it resolves an audited finding.

## Validation model after R05

Development preparation is intentionally separate:

```text
npm run wp08:03:02a:prepare
```

It may run package-scoped Prettier write and ESLint `--fix`.

Final acceptance is non-mutating:

```text
npm run wp08:03:02a:check
```

The final checker is cross-platform Node tooling. It collects independent failures, runs focused and full regressions, performs the unified Backend/Landing/Admin/Creator build, verifies compiled artifacts and runtime routes, and finally compares before/after source hashes. Any source mutation during acceptance fails the package.

## Next work after acceptance

Only after WP08-03-02A is accepted and pushed to a new Git branch should work proceed to WP08-03-02B authoritative gift settlement.
