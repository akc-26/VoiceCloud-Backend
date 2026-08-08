# VC-PH08-WP08-03-04 — Consolidated UI + Real-Infrastructure Acceptance

## Authoritative baseline

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-03-R02`
- Commit: `3a34b62e99189ee637819fbc2ab11f239eb0dde3`

WP08-03-04 is an integration and acceptance package. It does not reopen the accepted PostgreSQL financial, reward, VIP, notification or queue authority established in WP08-03-02A through WP08-03-03.

## Scope

### Creator Studio

The Wallet, Earnings, Payout Requests and Notifications surfaces now consume the accepted real APIs without fabricated financial fallbacks. Creator payout presentation is reconciled to the accepted backend lifecycle:

- minimum payout: 100 diamonds;
- payout value: USD 0.005 per diamond;
- payout requests use the accepted reserve/approve/reject/settle lifecycle;
- wallet and ledger values come from `/wallet/summary` and `/wallet/transactions`;
- the existing Creator Dashboard wallet widget is reconciled to the same authoritative wallet summary shape so shared service changes do not reintroduce stale financial fallbacks;
- earnings come from `/creator/earnings`;
- notification reads and mark-all-read operations persist through the notification API, UI filters map only to notification types the backend can actually persist, and the shared top-bar badge starts empty and hydrates from persisted notification state rather than static alerts.

### Admin Portal

The Wallet, Gifts, VIP, Tasks/Achievements and Notifications management surfaces use existing protected backend APIs. WP08-03-04 adds only two read-oriented visibility contracts required by the Admin UI:

- complete persisted gift catalog/categories, including inactive/archived records;
- global persisted notification delivery log for Admin/Super Admin.

No new financial mutation authority is introduced. Gift combo thresholds remain the accepted runtime policy and are displayed read-only rather than pretending to persist a configuration endpoint that does not exist.

## Production migration discovery hardening

R02 narrows the shared TypeORM CLI migration discovery pattern to timestamp-prefixed migration files only. Compiled Jest `*.spec.js` files may still exist in `dist` after the Nest build, but they are test artifacts and are never eligible for TypeORM migration discovery. This preserves the existing migration chain and schema while preventing production migration commands from importing Jest code.

## Real-infrastructure acceptance

The WP08-03-04 real acceptance creates a fresh isolated PostgreSQL database. Because migrations 1700000000000 through 1700000000008 are historical incremental upgrades that intentionally assume the legacy core schema already exists, the acceptance runner first bootstraps the current entity schema **inside the guarded temporary database only**, rewinds the WP08 financial/recovery authority delta, and records migrations 0000-0008 as the accepted historical baseline. It then applies compiled migrations 1700000000009 through 1700000000013, starts the compiled application with `DATABASE_SYNCHRONIZE=false`, and verifies:

1. real `/health` database/Redis status;
2. Admin and Creator authentication;
3. Creator Wallet/Earnings/Payout/Notification APIs;
4. Admin Wallet/Gifts/VIP/Tasks/Notification APIs;
5. authenticated `/realtime` Socket.IO notification delivery scoped to the target user's private `user:<id>` room, including a negative non-target socket check;
6. real Redis connectivity;
7. a real BullMQ notification job using the already-persisted notification ID;
8. one-row PostgreSQL notification identity across delivery/retry processing;
9. Creator persisted notification read state;
10. isolated database/private-storage cleanup.

This bootstrap is acceptance-only and is guarded by the `voicecloud_wp08_03_04_<timestamp>` database-name contract. It never runs against the configured VoiceCloud database. All 14 accepted migration source files remain byte-identical; WP08-03-04 does not rewrite migration history.

BullMQ remains a delivery/recovery mechanism. PostgreSQL remains the authoritative source of financial and notification state.

## Non-goals

- no domain licensing;
- no Android integration;
- no new economy formulas or payout rules;
- no new schema migration unless a verified acceptance defect requires one;
- no frontend visual redesign;
- no WP09 production certification work.

## Acceptance rule

WP08-03-04 becomes authoritative only after its complete non-mutating acceptance passes with zero failed and zero skipped stages on the user's real Windows PostgreSQL/Redis environment. The accepted package must then be committed and pushed before WP09 starts.
