# VC-PH08-WP08-03-01 — Economy Audit and Contract Lock

## 1. Purpose

This work package audits the remaining WP08 business flows before any economy, reward, settlement, notification, or recovery implementation is changed.

It does **not** redesign the product or alter production business logic. It records the exact approved WP08-02 baseline, maps the current implementation, identifies verified gaps, and locks the technical rules that WP08-03-02 through WP08-03-04 must follow.

## 2. Authoritative baseline

| Item | Locked value |
| --- | --- |
| Repository | `https://github.com/akc-26/VoiceCloud-Backend` |
| Branch | `VoiceCloud-Backend-VC-PH08-WP08-02-R05` |
| Commit | `5d73fac20e87630b70ca8bfe6711be93d94138f0` |
| Uploaded ZIP SHA-256 | `d71a135342674f9dffb3e59dc382d09bb8156d25fece117861dccb6b4d19b91e` |
| Baseline file count | `793` |
| `package.json` SHA-256 | `b63a30630075f63e6e139649d31fbbc4293f0bb2fd02e993edcdcb23a642161e` |
| `package-lock.json` SHA-256 | `17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a` |

The GitHub archive comment contains the locked commit SHA. The uploaded source contained no `.git`, `node_modules`, `dist`, runtime logs, repair scripts, or nested source archives.

## 3. Scope audited

The audit covers:

- Gift catalog, gift sending, combo and animation queue behavior.
- Wallet balances, immutable ledger entries, transfers, purchases, conversions, refunds, and settlements.
- Creator subscriptions, earnings summaries, payout requests, and payout processing.
- Host earnings, rewards, settlement requests, and Admin completion.
- Daily tasks, achievements, streaks, check-ins, seasonal rewards, and XP rewards.
- VIP membership purchase, renewal, reward claims, and recurring jobs.
- In-app notifications, push delivery, retries, and device registration.
- BullMQ queue producers, processors, retry policy, and recovery behavior.
- Redis wallet keys, cache keys, pub/sub, and Socket.IO gift events.
- Creator Studio and Admin Portal economy screens and API integration.

## 4. Current architecture map

### 4.1 Existing PostgreSQL financial records

- `wallet_balances`
- `wallet_transactions`
- `purchases`
- `refunds`
- `creator_settlements`
- `creator_payout_requests`
- `gift_transactions`
- `host_earnings`
- `host_rewards`
- `reward_audit_logs`
- `vip_transactions`
- `vip_reward_claims`
- `notifications`

### 4.2 Existing Redis responsibilities

Redis is currently used for:

- Realtime pub/sub.
- Room and participant state.
- VIP caches.
- Gift combo windows.
- Gift sender coin balances and receiver diamond balances.

The final item is incompatible with the locked architecture because money is also represented in PostgreSQL wallet tables.

### 4.3 Existing queue responsibilities

BullMQ queues and processors exist for notifications, payouts, gifts, VIP, tasks, subscriptions, Host earnings, Host rewards, analytics, reminders, RTC cleanup, store, and referrals.

Several queue producers are not connected to the corresponding business command, and some processors return success without performing authoritative persistence.

### 4.4 Existing Socket.IO gift contract

`gift:send` and `send_gift` in `ReactionsGateway` are explicitly display-only room events. They validate authentication and room membership, then broadcast presentation events. They do not debit or credit money.

This behavior is retained. Financial gift settlement must occur through an authoritative backend service before any realtime presentation event is emitted.

## 5. Findings

The machine-readable findings and source hashes are stored in:

`docs/wp08/wp08-03-01-economy-contract-lock.json`

### ECO-001 — Critical: split gift and wallet authority

`GiftingEngineService` debits and credits Redis keys directly. When no sender key exists, it assumes `10000` coins. When no receiver is supplied, it uses `host_placeholder`.

The service writes `gift_transactions`, but it does not update `wallet_balances` or `wallet_transactions`.

**Decision:** PostgreSQL wallet balances and ledger transactions are the only financial authority. Redis may cache committed results but cannot own money.

### ECO-002 — Critical: wallet operations are not atomic

Wallet credit, debit, transfer, conversion, earnings, settlement, and refund operations save balances and ledger entries in separate repository calls without a shared database transaction or row lock.

**Decision:** all balance and ledger mutations must commit atomically with pessimistic locking or equivalent database concurrency control.

### ECO-003 — Critical: unsafe wallet bootstrap balances

`getOrCreateWalletBalance` can auto-create a User and seeds non-zero balances, including withdrawable value.

**Decision:** production wallet creation starts at zero and never creates identity records. Any development seed must be explicit and production-disabled.

### ECO-004 — Critical: payout request and settlement paths are disconnected

Creator payout requests validate only the current diamond balance. They do not reserve or freeze diamonds. `PayoutProcessor` changes request status and sends a notification, but it does not settle or release wallet balances. `creator_settlements` is a separate Admin path.

**Decision:** one payout lifecycle must reserve funds, settle once, and release funds on rejection, cancellation, or terminal failure.

### ECO-005 — High: Host settlement lacks ledger reconciliation

Host earnings are mutable aggregates. `completeSettlement` can add a completion amount greater than the pending amount while clamping pending to zero.

**Decision:** Host earnings and settlement must reconcile to immutable source and payout ledger entries. Completion cannot exceed the reserved pending amount.

### ECO-006 — High: reward engine bypasses wallet authority

Task and achievement currency rewards increment legacy `User.coins` and `User.diamonds` fields and separately save audit logs.

**Decision:** currency rewards use the authoritative wallet mutation service and a persistent idempotency key.

### ECO-007 — High: VIP payment and reward gaps

VIP subscription and renewal persist membership and transaction records without an authoritative wallet or external payment charge. VIP reward claims record `coinsClaimed`, but do not credit the wallet. Concurrent claims have no unique database constraint across user, reward, and period.

**Decision:** VIP payment, membership, claim, reward credit, and ledger records must be transactional and idempotent.

### ECO-008 — High: missing idempotency constraints

Gift transactions, wallet transactions, reward audit logs, payout requests, and VIP claims do not provide complete end-to-end duplicate protection.

**Decision:** repeatable HTTP and queue operations require a deterministic operation key protected by a unique database constraint.

### ECO-009 — Critical: economy Admin RBAC gaps

Several Admin economy controllers use `JwtAuthGuard` without `RolesGuard` and explicit Admin roles. Affected areas include Admin Wallet, gift administration, Admin Tasks and Achievements, VIP administration, and Admin notification creation.

**Decision:** all economy administration routes require `ADMIN` or `SUPER_ADMIN`, with negative acceptance tests for Creator and normal User accounts.

### ECO-010 — High: notification retry duplication

`NotificationProcessor` can create a notification record when no `notificationId` is supplied. If push delivery fails after persistence, a retry can create another notification.

**Decision:** persist once, enqueue the persisted notification ID, and record delivery attempts separately.

### ECO-011 — High: queue producers are not integrated

Payout and notification enqueue methods exist, but core payout and notification workflows do not consistently use them.

**Decision:** queues receive persisted operation IDs after commit. A queue job is never the only owner of an uncommitted financial action.

### ECO-012 — Medium: placeholder economy workers

Gift, Host earnings, and Host reward workers can return success without performing authoritative work.

**Decision:** production workers must load persisted operation state, be idempotent, and report success only after completing the intended effect.

### ECO-013 — High: Creator Studio hides backend failures

Creator API methods return fabricated wallet, earnings, profile, and notification data after backend errors. Some economy pages also contain static histories and charts.

**Decision:** acceptance-tested screens must show backend data and explicit failure states. Demo data requires an explicit development-only flag.

### ECO-014 — High: Admin economy pages are not fully API-backed

Admin Wallet, Gifts, and Notifications pages use local static data for core views and actions.

**Decision:** WP08 end-to-end acceptance requires persisted Admin API integration for these areas.

### ECO-015 — Medium: payout and exchange contract mismatch

Creator UI text and controls use a `10,000` diamond minimum, while the backend currently accepts `100`. Conversion assumptions also differ across services and UI text.

**Decision:** thresholds, fees, and conversion rates are backend-authoritative settings returned to clients.

### ECO-016 — Locked existing behavior: Socket.IO gifts remain display-only

The realtime gift handler is not a payment API.

**Decision:** REST/service logic commits the transaction first. Only committed results are broadcast to the room.

## 6. Locked implementation principles

The following rules are mandatory for later WP08-03 packages:

1. PostgreSQL is authoritative for money, rewards, payout state, and immutable audit records.
2. Redis never owns a financial balance.
3. Balance and ledger mutations commit in one database transaction.
4. Financial rows are locked during concurrent mutation.
5. Repeatable operations use persistent idempotency keys and unique constraints.
6. Realtime events occur only after commit.
7. Queue jobs are retry-safe and operate on persisted operation IDs.
8. Notifications are persisted once and delivery attempts are idempotent.
9. Admin economy endpoints enforce explicit Admin roles.
10. UI acceptance uses real backend state and does not hide failures with fabricated data.
11. Existing public endpoint paths remain backward compatible unless a documented security correction requires a change.
12. No package is approved until its non-mutating checker passes on the Windows PostgreSQL and Redis environment.

## 7. Required sequence after this package

### WP08-03-02 — Gifts, wallets, earnings, payouts, and settlement verification

Required coverage:

- Authoritative gift debit and receiver credit.
- Atomic sender, receiver, gift, stock, and ledger settlement.
- Idempotency and concurrent spending protection.
- Creator and Host earnings reconciliation.
- Payout reservation, approval, rejection, settlement, and release.
- Admin RBAC for all affected routes.
- Migration and rollback for new constraints and operation fields.

### WP08-03-03 — Rewards, VIP, notifications, queues, and recovery

Required coverage:

- Task, achievement, streak, check-in, Host, and VIP reward idempotency.
- VIP payment and claim settlement.
- Notification persistence and delivery separation.
- BullMQ retry, replay, worker restart, Redis failure, and external-service failure handling.
- Reconciliation after partial or retried operations.

### WP08-03-04 — Consolidated UI and real-infrastructure acceptance

Required coverage:

- Creator Studio wallet, earnings, payouts, and notifications using real data.
- Admin Wallet, Gifts, VIP, Tasks, payout review, and notifications using real APIs.
- Real PostgreSQL, Redis, BullMQ, Socket.IO, and failure recovery workflows.
- WP08-01 and WP08-02 regression acceptance.
- Full Jest, lint, format check, builds, migrations, cleanup, and route smoke tests.

## 8. Validation strategy for WP08-03-01

The accepted R05 package exposes this consolidated checker:

`npm run wp08:03:01:check`

R05 was a recovery release after repeated formatting/lint delivery defects. Its checker therefore performs a narrowly scoped Prettier write and ESLint `--fix` normalization before immediately verifying the same files. This is historical behavior of R05, not the validation model for later work packages. WP08-03-02A and later packages separate mutating development preparation from non-mutating final acceptance.

The checker performs:

1. Dependency-free manifest and source-snapshot self-check.
2. Locked dependency installation including development tooling.
3. Package-scoped Prettier normalization followed immediately by Prettier verification.
4. Package-scoped ESLint normalization followed immediately by non-mutating ESLint verification.
5. WP08-01 focused regression tests.
6. WP08-02 focused regression tests.
7. WP08-03-01 contract and hosting tests.
8. Complete Jest suite.
9. Unified Backend, Website, Admin, and Creator build.
10. Required build-artifact verification.
11. Compiled runtime smoke tests for Landing, Admin, Creator, their assets, and `/health`.

Independent formatting, lint, regression, full-test, and build stages continue after a failure and are summarized together at the end. Runtime smoke testing is skipped only when valid build artifacts are unavailable. This prevents a first-error-only repair cycle and provides one consolidated defect report.

The approved WP08-02 Git baseline contains 17 known formatting-drift files. They are recorded in `baselineFormattingDebt` and remain byte-for-byte locked because this audit package must not rewrite unrelated production behavior. The accepted R05 checker invokes Prettier write mode and ESLint `--fix` only on its explicitly owned recovery files, then verifies them. It never invokes `npm audit fix`, database mutation, or a production runtime seed. Later work packages must not repeat the self-repair pattern: development uses a separate `prepare` command and final acceptance is source-immutable.

## 9. R03 runtime hosting correction

R02 proved the audit, regression, and build contracts, but its checker stopped after confirming that the four build artifacts existed. A real Windows startup then showed that the Nest process returned JSON 404 responses for `/admin/`, `/admin/index.html`, and `/creator/`.

R03 corrects that acceptance gap without changing economy business logic:

- frontend middleware is registered directly on the underlying Express adapter before Nest maps controllers and its 404 handler;
- the compiled `dist` root is resolved from an explicit environment override, the project working directory, or the compiled module location;
- startup fails with a clear build-artifact error instead of silently running an API-only server when frontend files are missing;
- `npm run start:full` builds and starts the complete local application on port 3000 with memory infrastructure;
- the final checker starts the compiled server on an isolated port and requires HTML plus a loadable compiled asset for Landing, Admin, and Creator, while `/health` remains JSON.


## 10. R04 consolidated verification correction

R04 removes the remaining first-failure delivery gap. It corrects the unnecessary Express adapter type assertion, reconciles the stale Jest contract with the R03 hosting scope, makes acceptance formatting checks non-mutating, aggregates all independent verification failures in one run, and tightens reserved-route matching so unrelated paths such as `/apiary`, `/administer`, and `/creator-tools` continue to reach the Landing SPA rather than being misclassified.

## 11. Production cleanup boundary

The `src/wp08` contract specification and `scripts/wp08` acceptance utilities are development and release-evidence files. They are not imported by the NestJS runtime, are not emitted into `dist/src`, and are not served by Landing, Admin, or Creator hosting. They remain during WP08 so regressions can be reproduced and audited. WP09 production certification must consolidate durable behavior coverage under product-oriented test names and remove superseded work-package or revision-only scripts, reports, and duplicate acceptance wrappers before the final production source package is issued.

