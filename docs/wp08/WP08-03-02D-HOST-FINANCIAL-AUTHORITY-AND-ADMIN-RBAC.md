# VoiceCloud WP08-03-02D — Host Financial Authority and Admin Economy RBAC

## Authoritative baseline

- Repository: `https://github.com/akc-26/VoiceCloud-Backend`
- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-02C-R01`
- Commit: `b6a9b4f8fe189d40fc3358088b6aa37e14507992`
- Locked `package-lock.json` SHA-256: `17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a`

WP08-03-02D starts only after the accepted Creator payout lifecycle. It does not implement Rewards/VIP financial authority, notification delivery recovery, queue recovery, UI consolidation, or WP09 certification.

## Host earnings authority

`HostEarnings` remains backward-compatible as the reporting projection consumed by existing Host/Admin APIs. Financial authority is moved to immutable PostgreSQL wallet ledger evidence plus durable Host settlement reservations.

`HostFinancialAuthorityService` owns Host financial reads and mutations in a PostgreSQL transaction. It locks the Host row, serializes the Host financial scope with a PostgreSQL advisory transaction lock, and reconciles the reporting aggregate from immutable evidence before returning it. The Admin Host earnings overview is also built from reconciled Host rows rather than raw mutable aggregate values.

Existing pre-WP08 Host aggregate data is preserved. On the first authoritative financial interaction, the service anchors the historical lifetime earnings into one immutable `HOST_EARNINGS` ledger entry. Existing completed or pending settlement aggregates are converted into durable settlement reservation evidence. Irreconcilable historical data is rejected instead of silently normalized.

No new Host gift-to-dollar or diamond-to-dollar conversion formula is introduced. WP08-03-02B gift credits remain authoritative in the recipient wallet/diamond ledger and are not duplicated into a second Host settlement claim. `HostEarnings.giftIncome` remains legacy/reporting metadata unless an existing Host-income flow records a Host earning in its already-defined unit. Existing Host earning units and API contracts are preserved.

## Host settlement reservation

A Host settlement request now:

1. validates a positive amount with at most two decimal places;
2. opens one PostgreSQL transaction;
3. locks and serializes the Host financial scope;
4. initializes/reconciles historical authority when required;
5. computes available unsettled earnings from authoritative evidence;
6. rejects over-reservation;
7. persists a `host_settlement_requests` reservation;
8. records immutable `HOST_SETTLEMENT_RESERVE` ledger evidence;
9. supports an optional retry `operationKey` without changing the existing API path or amount field.

The reporting `pendingSettlements` value is derived from unconsumed durable reservations rather than independently incremented as financial authority.

## Host settlement completion

Admin completion now consumes durable pending reservations exactly. The operation:

- rejects zero, negative, over-precision, and over-settlement amounts;
- preserves the existing Admin self-settlement prohibition;
- supports partial settlement without clamping or fabricating value;
- consumes oldest pending reservations deterministically;
- persists one immutable `HOST_SETTLEMENT` ledger entry;
- records the Admin ID and consumed reservation IDs/amounts in immutable metadata;
- writes the existing Host audit note inside the same transaction;
- supports optional completion retry idempotency;
- reconciles `HostEarnings.pendingSettlements` and `completedSettlements` from durable evidence.

Any corrupted reservation with a settled amount outside `0..amount` causes reconciliation failure. No `Math.max(0, ...)` financial clamp is used to hide invalid settlement state.

## Legacy Creator settlement reconciliation

The existing `POST /api/v1/admin/wallet/creator/settle` route is retained for compatibility, but it can no longer call the legacy direct balance mutation.

It now delegates to `CreatorPayoutLifecycleService.settleLegacy(...)`, which requires a matching `APPROVED` payout request with the reservation created by WP08-03-02C. Settlement then delegates to the same authoritative 03-02C `settle(...)` operation. If no approved reserved payout exists, the legacy route fails with a conflict response rather than bypassing reservation, approval, frozen balance, or immutable payout evidence.

## Admin economy RBAC

ECO-009 is reconciled with the existing VoiceCloud `RolesGuard` / `@Roles(...)` architecture.

The following economy administration boundaries explicitly require `ADMIN` or `SUPER_ADMIN`:

- all `admin/wallet/*` routes;
- gift administration routes under `gifts/admin*`;
- the Admin Tasks/Achievements controller;
- VIP `admin/*` routes;
- Admin notification creation.

Normal authenticated `USER` and `CREATOR` roles are not sufficient for economy administration.

No reward, VIP payment/reward, or notification delivery business logic is changed in this package; only the required Admin authorization boundary is corrected for those deferred domains.

## Database migration

`1700000000012-Phase08HostFinancialAuthority.ts` is additive and reversible. It adds:

- `host_earnings.authorityInitializedAt`;
- `host_earnings.authorityBaselineTransactionId`;
- `host_settlement_requests` with durable amount, settled amount, status, operation group, reservation operation key, ledger reference, settlement timestamp, and Admin actor fields;
- indexes for Host/User/status/operation-group lookup;
- a unique reservation operation-key index for retry idempotency.

Previously accepted migrations are unchanged. `DATABASE_SYNCHRONIZE=false` remains the production rule.

## Compatibility

Existing public Host earnings and settlement routes remain unchanged. `operationKey` is optional and additive. Existing Admin/Creator/Android-facing response fields are preserved as far as possible. The legacy Creator settlement response retains its compatibility wrapper while the financial action is delegated to the authoritative Creator payout lifecycle.

`package-lock.json` must remain byte-identical to the accepted WP08-03-02C baseline.

## Controlled preparation and final acceptance

The final `wp08:03:02d:check` command is non-mutating. Before the first final check on a fresh extraction, run:

```powershell
npm run wp08:03:02d:prepare
```

Preparation installs only the already-locked dependencies with `npm ci --include=dev` and runs package-owned Prettier formatting. It does not run ESLint auto-fix, dependency upgrades, `npm audit fix`, or business-code repair. The formatting scope includes the files normalized during the accepted WP08-03-02C final repair so a fresh package is normalized to the same locked Prettier version before 03-02D verification.

Then run:

```powershell
npm run wp08:03:02d:check
```

The checker itself verifies the delivered source without modifying it.

## Durable regression coverage

WP08-03-02D adds product-oriented tests for:

- historical Host earnings authority anchoring;
- reservation idempotency;
- over-reservation rejection;
- exact partial settlement;
- over-settlement rollback;
- completion retry idempotency;
- Admin self-settlement rejection;
- immutable Host earnings ledger evidence;
- Host authority migration reversibility;
- economy Admin role enforcement;
- Creator/User negative authorization;
- ADMIN/SUPER_ADMIN authorization;
- legacy Creator settlement requiring an approved reserved payout.

The final package checker also reruns WP08-03-02C, 03-02B, 03-02A, WP08-01, WP08-02, WP08-03-01, the complete Jest suite, the unified Backend/Landing/Admin/Creator build, compiled runtime smoke, and source immutability verification.

## Deferred scope

The following remain explicitly deferred:

- WP08-03-03: Rewards, Lucky Box, VIP financial authority, Notifications, Queues, Recovery;
- WP08-03-04: consolidated UI and real-infrastructure acceptance;
- WP09: Production Certification and final WP08 release-artifact cleanup.
