# VC-PH08-WP08-03-02C — Creator Payout Lifecycle

## Baseline

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-02B-R02`
- Commit: `f0556a127a05e65e2b585c1643460cb419f6b8a0`
- Scope is limited to Creator payout reservation, review, release, settlement, idempotency, and payout queue integration.

## Financial authority

PostgreSQL remains authoritative. A payout request now reserves funds inside the same database transaction that persists the request and its immutable wallet ledger evidence.

### Request / reserve

1. Lock the Creator payout scope and Creator wallet.
2. Reject another outstanding `PENDING` or `APPROVED` payout.
3. Require the amount to exist in both diamond and withdrawable balances.
4. Move the requested diamonds out of spendable/withdrawable balance into frozen balance.
5. Persist the payout request, operation group, reservation timestamp, and reservation ledger reference atomically.

### Admin approval

`PENDING -> APPROVED` is a non-financial review transition. Reserved funds remain frozen.

### Admin rejection

`PENDING|APPROVED -> REJECTED` atomically returns the reserved amount from frozen balance to diamond and withdrawable balance and writes one release ledger entry. Repeated rejection is idempotent.

### Settlement

Only `APPROVED` requests can settle. Settlement atomically removes the reserved amount from frozen balance, increments lifetime withdrawn diamonds, writes one `CREATOR_PAYOUT` ledger entry, and moves the request to `PROCESSED`. Repeated processing is idempotent.

## Queue behavior

The payout worker no longer changes payout status directly. It delegates `APPROVED`, `REJECTED`, and `PROCESSED` transitions to the same payout lifecycle authority used by REST paths, so BullMQ retries cannot bypass reservation or settle/release funds twice.

## Admin endpoints

The following endpoints are explicit `ADMIN` / `SUPER_ADMIN` operations:

- `GET /api/v1/admin/wallet/creator/payouts`
- `POST /api/v1/admin/wallet/creator/payouts/:id/approve`
- `POST /api/v1/admin/wallet/creator/payouts/:id/reject`
- `POST /api/v1/admin/wallet/creator/payouts/:id/process`

Broader Admin economy RBAC reconciliation remains frozen for WP08-03-02D.

## Deferred

This package does not change Host settlement, rewards, VIP, notification delivery idempotency, Creator/Admin UI behavior, or unrelated economy routes.
