# VoiceCloud WP08-03-02B — Authoritative Gift Settlement

## Baseline

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-02A-R02`
- Commit: `249281c39388f18ee3ad5a5cc6a5797cbb052d92`
- Scope: WP08-03-02B only. WP08-03-02C, WP08-03-02D, WP08-03-03,
  WP08-03-04, and WP09 remain unchanged and pending.

## Authority rules

Gift settlement now follows one financial authority path:

1. A PostgreSQL transaction acquires an advisory lock for the logical operation.
2. The gift row is pessimistically locked and availability/limited stock is checked.
3. Receiver identities are resolved. When a room gift omits a receiver, the
   persisted room Host is used; placeholder identities are forbidden.
4. Sender and receiver wallet rows are locked in deterministic User-ID order.
5. Sender coins are debited and the sender wallet ledger entry is written.
6. Receiver diamonds are credited and receiver wallet ledger entries are written.
7. Gift transaction rows link to the authoritative sender/receiver wallet ledger
   entries.
8. Limited stock is decremented inside the same database transaction.
9. The database transaction commits.
10. Combo cache, animation queue, and Socket.IO presentation are attempted only
    after commit and cannot change financial state.

Redis is no longer read or written as the source of sender coins or receiver
Diamonds by `GiftingEngineService` or `MultiGiftingService`.

## Idempotency

`SendGiftDto`, combo gift DTOs, and both multi-gift DTOs accept an optional
`operationKey`. Existing clients remain valid when the key is absent.

When supplied, the key becomes the persisted operation group. PostgreSQL
advisory locking serializes concurrent retries, wallet-ledger operation keys are
unique, and each receiver gift transaction receives a unique operation key.
A replay with the same logical request returns the committed result without
re-debiting the sender, re-crediting receivers, re-consuming limited stock, or
rebroadcasting the presentation event. Reusing the key for a different gift,
receiver set, quantity, sender, room, or context is rejected.

## Compatibility

- Existing `/gifts/send`, `/gifts/send-combo`, `/gifts/send-multi`, and
  `/gifts/multi-send` routes are preserved.
- Existing response fields remain available; additive operation/idempotency
  fields are returned where relevant.
- The legacy `pricePerUnit` field remains accepted by `/gifts/multi-send` for
  wire compatibility but is not financial authority. The persisted Gift catalog
  price is authoritative.
- Socket.IO `gift:send` / `send_gift` remains a display-only contract. It does
  not debit or credit money.
- Lucky Box is intentionally unchanged. Reward/VIP authority belongs to
  WP08-03-03.

## Migration

`1700000000010-Phase08AuthoritativeGiftSettlement.ts` adds nullable gift
settlement audit fields and partial unique idempotency protection without
rewriting historical gift transactions. `down()` removes every added index and
column.

## Final acceptance

The delivery is prepared before packaging. The user-facing command is only:

```powershell
npm run wp08:03:02b:check
```

The checker is non-mutating for source/configuration files, reuses a complete
existing `node_modules` tree on reruns, installs locked dependencies only when
needed, collects independent failures, runs the new gift settlement tests plus
all prior accepted WP08 regressions, runs the complete Jest suite, builds the
Backend/Landing/Admin/Creator applications, verifies build artifacts, runs the
compiled runtime smoke, and verifies source immutability.
