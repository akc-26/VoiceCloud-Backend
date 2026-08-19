# VC-PH08-WP08-03-03 — Rewards, VIP, Notifications, Queues & Recovery

## Authoritative baseline

- Repository: `https://github.com/akc-26/VoiceCloud-Backend`
- Branch: `VoiceCloud-Backend-VC-PH08-WP08-03-02D-R02`
- Commit: `57d4c99fc90743d07b90ff77fc493e6720834b07`
- Accepted baseline evidence: WP08-03-02D passed 16/16 stages, 72/72 Jest suites and 735/735 tests.
- `package-lock.json` remains byte-identical to the accepted baseline.

## Scope and internal implementation order

WP08-03-03 is delivered as one consolidated package while retaining four controlled internal sequences:

1. Rewards & Lucky Box Authority.
2. VIP Financial Authority.
3. Notification Delivery Authority.
4. BullMQ Queues & Recovery.

WP08-03-04 UI/real-infrastructure acceptance and WP09 Production Certification remain deferred.

## 1. Rewards & Lucky Box Authority

### Task / achievement / streak / seasonal rewards

Currency rewards no longer increment legacy User coin/diamond counters. `RewardEngineService` settles COIN/DIAMOND rewards through the accepted PostgreSQL wallet mutation authority and records:

- deterministic persistent operation keys;
- immutable wallet transaction IDs;
- reward audit rows linked to the financial ledger;
- a settled timestamp;
- replay-safe source identities for task claims, achievements, check-ins, streak milestones, level rewards, seasonal rank rewards and queued reward jobs.

Non-financial reward records remain durable audit evidence and use the same idempotency grouping.

### Lucky Box

Lucky Box no longer reads/writes Redis wallet balances and no production fallback/fabricated balance remains. A Lucky Box opening now executes inside one PostgreSQL transaction:

- pessimistic/advisory operation serialization;
- authoritative coin debit;
- reward roll once;
- authoritative cashback credit where applicable;
- persisted result payload;
- debit/cashback wallet ledger references;
- exact replay of the original result by `operationKey`.

Redis/realtime remains presentation-only; jackpot broadcast happens only after the first committed opening.

### Host rewards

Host COIN/DIAMOND claims now delegate to `HostRewardAuthorityService`, which locks the reward, credits the wallet through the accepted authority, saves the wallet transaction reference and treats a claimed row without ledger evidence as inconsistent.

## 2. VIP Financial Authority

Production VIP subscribe, renew, upgrade and downgrade operations delegate to `VipFinancialAuthorityService`.

Activation requires:

- a supported non-MOCK payment provider;
- validated provider receipt;
- optional signature verification when supplied;
- exact expected tier/cycle price match;
- persistent operation identity;
- immutable external-payment wallet ledger evidence;
- atomic membership + VIP transaction persistence.

The provider receipt/reference has a database uniqueness guard for new financial rows.

VIP periodic COIN rewards are settled through wallet authority and protected by the deterministic operation key `vip-reward:<user>:<reward>:<period>`. Historical duplicate claim rows are preserved; new claim concurrency is protected by the operation-key uniqueness constraint rather than destructive migration cleanup.

## 3. Notification Delivery Authority

Notifications gain durable creation and delivery identity:

- optional unique `operationKey`;
- delivery status (`PENDING`, `SENDING`, `SENT`, `FAILED`, `NO_DEVICE`);
- attempt counter;
- last attempt timestamp;
- delivered timestamp;
- last delivery error.

`createNotification()` replays an existing operation key instead of inserting duplicates. The BullMQ worker delivers an existing persisted notification ID, marks attempts/results and treats a repeated job for an already-SENT notification as idempotent.

Historical notifications are migrated to `SENT` before the new default becomes `PENDING`, preventing deployment from re-sending the existing notification history.

## 4. BullMQ Queues & Recovery

Queues remain orchestration/retry infrastructure, never financial authority.

- Reward jobs require concrete persisted source identity and delegate to `RewardEngineService`.
- Placeholder task `achievement_check`/`xp_calculation` jobs fail explicitly rather than reporting false success.
- VIP reward jobs require user + reward identity and delegate to VIP reward authority.
- Host reward jobs delegate to Host reward authority.
- Host earnings jobs reconcile through `HostFinancialAuthorityService` rather than calculating independent value.
- Gift settlement verification validates the persisted gift rows and the referenced sender/receiver wallet ledger entries.
- Payout worker preserves accepted lifecycle delegation for approve/reject/settle and adds a separate reservation-verification recovery action.
- Notification scheduler queues persisted `PENDING`/retryable `FAILED` notification IDs only.
- Payout scheduler queues verification jobs for already-reserved PENDING/APPROVED payout requests.
- Unknown/incomplete financial recovery jobs fail rather than returning placeholder success.

## Migration

`1700000000013-Phase08RewardsVipNotificationRecovery.ts` is additive and reversible. It adds:

- reward audit operation/wallet evidence;
- `lucky_box_openings`;
- Host reward claim/wallet evidence;
- VIP payment and reward operation evidence;
- notification delivery state and operation identity.

Previously accepted Phase08 migrations are unchanged and `DATABASE_SYNCHRONIZE=false` remains the production rule.

## Backward compatibility

- Existing REST paths are preserved.
- Existing DTO fields remain valid; payment/operation identity fields are additive.
- Existing Creator payout Admin lifecycle remains authoritative.
- Existing gift send APIs remain unchanged.
- Existing Socket.IO gift/reward presentation remains presentation-only.
- No Landing/Admin/Creator frontend implementation is changed in this package.

## Acceptance

Final package acceptance is non-mutating and requires:

1. source/baseline self-check;
2. locked dependency availability;
3. package-owned Prettier;
4. package-owned ESLint;
5. focused WP08-03-03 product tests;
6. WP08-03-02D regressions;
7. WP08-03-02C regressions;
8. WP08-03-02B regressions;
9. WP08-03-02A regressions;
10. WP08-01 regressions;
11. WP08-02 regressions;
12. WP08-03-01 regressions;
13. complete Jest suite;
14. unified Backend/Website/Admin/Creator build;
15. required build artifacts;
16. compiled frontend/API runtime smoke;
17. source immutability verification.

## Deferred

Not implemented here:

- WP08-03-04 consolidated UI and real PostgreSQL/Redis/BullMQ/Socket.IO acceptance;
- WP09 Production Certification and final work-package artifact cleanup;
- unrelated dependency upgrades/security audit remediation.
