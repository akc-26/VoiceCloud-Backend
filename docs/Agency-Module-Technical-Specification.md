# Agency Module Technical Specification & Architecture Manual
**Document Version:** 1.0.0  
**Target Architecture:** VoiceCloud Enterprise Edition  
**Specification Date:** July 30, 2026  
**Status:** Frozen & Archived for Enterprise Re-Integration  

---

## Executive Summary

This document provides a comprehensive technical specification of the VoiceCloud **Agency Module**, which was implemented and validated through Phase 30 and subsequently decoupled from the core Community Edition backend in Phase 31. This specification is designed to serve as an authoritative blueprint for re-integrating Agency, Guild, and Talent Management capabilities into the future **VoiceCloud Enterprise Edition**.

The Agency Module provides a multi-tenant talent agency management framework enabling agency owners (agents), managers, and recruiters to recruit broadcasting hosts, manage agency commission cuts, track revenue performance, execute automated settlement payouts, award performance milestone rewards, and oversee host retention and recruitment metrics.

---

## 1. System Architecture

The Agency Module operates as an integrated NestJS domain module within the modular monolith architecture of VoiceCloud.

```
+-------------------------------------------------------------------------------+
|                             VoiceCloud API Gateway                            |
|                            (NestJS Controllers & REST)                        |
+-------------------------------------------------------------------------------+
                                        |
+---------------------------------------+---------------------------------------+
|                                       |                                       |
v                                       v                                       v
+-------------------------+   +-------------------+   +-------------------------+
|   AgenciesController    |   |  AgenciesService  |   |    AgenciesGateway      |
|  (REST Endpoints & DTOs)|   |  (Domain Logic)   |   |   (WebSocket Events)    |
+-------------------------+   +-------------------+   +-------------------------+
            |                           |                          |
            |                           v                          v
            |             +---------------------------+  +----------------------+
            +------------>| PostgreSQL (TypeORM)      |  | Redis & BullMQ Queues|
                          | - Agency                  |  | - Agency Settlement  |
                          | - AgencyMember            |  | - Agency Analytics   |
                          | - AgencyApplication       |  | - Agency Rewards     |
                          | - AgencyContract          |  | - Agency Verification|
                          | - AgencySettlement        |  +----------------------+
                          | - AgencyReward            |
                          | - AgencyInvitation        |
                          | - AgencyAuditLog          |
                          +---------------------------+
```

### Key Architectural Characteristics
- **Domain Decoupled Design:** High cohesion within the `AgenciesModule`, interfacing with `UsersModule`, `HostsModule`, and `GiftsModule` via contract interfaces and event signals.
- **Asynchronous Task Offloading:** Heavy calculation tasks (monthly revenue settlement calculation, analytics aggregation, reward distribution, document verification) offloaded to dedicated BullMQ processors backed by Redis.
- **Auditability:** Implements an internal append-only audit trail (`AgencyAuditLog`) for security, ownership transfers, role elevation, and financial adjustments.

---

## 2. Database Design & Entity Definitions

The Agency Module consists of eight relational entities defined via TypeORM for PostgreSQL.

### Entity Relationships Diagram (ERD)

```
       +--------------------+
       |       User         |
       +--------------------+
         | 1             1 |
         |                 |
         v N               v N
+------------------+     +------------------------+
|   AgencyMember   |     |   AgencyApplication    |
+------------------+     +------------------------+
         | N               | 1
         | 1               |
         v                 v
+-------------------------------------------------+
|                    Agency                       |
+-------------------------------------------------+
   | 1            | 1          | 1           | 1
   |              |            |             |
   v N            v N          v N           v N
+----------+  +----------+ +-----------+ +------------+
| Contract |  |Settlement| |   Reward  | | AuditLog   |
+----------+  +----------+ +-----------+ +------------+
```

### Entity Specifications

#### 1. `Agency` (`agency`)
- **`id`**: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
- **`name`**: `VARCHAR(255)` (Unique, Required)
- **`slug`**: `VARCHAR(255)` (Unique, Indexed)
- **`ownerId`**: `UUID` (Foreign Key -> `User.id`)
- **`logoUrl`**: `VARCHAR(512)` (Nullable)
- **`bannerUrl`**: `VARCHAR(512)` (Nullable)
- **`description`**: `TEXT` (Nullable)
- **`country`**: `VARCHAR(100)` (Default: `'Global'`)
- **`category`**: `VARCHAR(100)` (Default: `'General Talent'`)
- **`defaultCommissionRate`**: `NUMERIC(5,2)` (Percentage cut taken by agency, Default: `15.00`)
- **`isVerified`**: `BOOLEAN` (Default: `false`)
- **`featured`**: `BOOLEAN` (Default: `false`)
- **`status`**: `ENUM('active', 'suspended', 'pending_review')` (Default: `'active'`)
- **`totalHosts`**: `INT` (Default: `0`)
- **`totalMonthlyRevenue`**: `NUMERIC(14,2)` (Default: `0.00`)
- **`createdAt`**, **`updatedAt`**: `TIMESTAMP WITH TIME ZONE`

#### 2. `AgencyMember` (`agency_member`)
- **`id`**: `UUID` (Primary Key)
- **`agencyId`**: `UUID` (Foreign Key -> `Agency.id`, OnDelete: `'CASCADE'`)
- **`userId`**: `UUID` (Foreign Key -> `User.id`)
- **`role`**: `ENUM('owner', 'admin', 'manager', 'recruiter', 'host')`
- **`joinedAt`**: `TIMESTAMP WITH TIME ZONE`
- **`status`**: `ENUM('active', 'inactive', 'suspended')`

#### 3. `AgencyApplication` (`agency_application`)
- **`id`**: `UUID` (Primary Key)
- **`applicantId`**: `UUID` (Foreign Key -> `User.id`)
- **`agencyName`**: `VARCHAR(255)`
- **`businessRegistrationNumber`**: `VARCHAR(100)`
- **`contactEmail`**: `VARCHAR(255)`
- **`contactPhone`**: `VARCHAR(50)`
- **`documentUrls`**: `JSONB` (Array of verification file URLs)
- **`status`**: `ENUM('pending', 'approved', 'rejected')`
- **`reviewedBy`**: `UUID` (Nullable)
- **`rejectionReason`**: `TEXT` (Nullable)
- **`appliedAt`**, **`reviewedAt`**: `TIMESTAMP WITH TIME ZONE`

#### 4. `AgencyContract` (`agency_contract`)
- **`id`**: `UUID` (Primary Key)
- **`agencyId`**: `UUID` (Foreign Key -> `Agency.id`)
- **`hostUserId`**: `UUID` (Foreign Key -> `User.id`)
- **`commissionShare`**: `NUMERIC(5,2)` (Agency percentage cut for host earnings)
- **`startDate`**: `DATE`
- **`endDate`**: `DATE` (Nullable)
- **`status`**: `ENUM('pending', 'active', 'terminated', 'expired')`
- **`terminationReason`**: `TEXT` (Nullable)

#### 5. `AgencySettlement` (`agency_settlement`)
- **`id`**: `UUID` (Primary Key)
- **`agencyId`**: `UUID` (Foreign Key -> `Agency.id`)
- **`period`**: `VARCHAR(20)` (Format: `YYYY-MM`)
- **`grossRevenue`**: `NUMERIC(14,2)`
- **`agencyCommission`**: `NUMERIC(14,2)`
- **`hostPayoutTotal`**: `NUMERIC(14,2)`
- **`platformFee`**: `NUMERIC(14,2)`
- **`status`**: `ENUM('pending', 'calculating', 'approved', 'paid', 'failed')`
- **`processedAt`**: `TIMESTAMP WITH TIME ZONE` (Nullable)

#### 6. `AgencyReward` (`agency_reward`)
- **`id`**: `UUID` (Primary Key)
- **`agencyId`**: `UUID` (Foreign Key -> `Agency.id`)
- **`title`**: `VARCHAR(255)`
- **`rewardType`**: `ENUM('cash_bonus', 'diamond_pool', 'featured_badge', 'custom_gift')`
- **`rewardAmount`**: `NUMERIC(12,2)`
- **`isClaimed`**: `BOOLEAN` (Default: `false`)
- **`claimedAt`**: `TIMESTAMP WITH TIME ZONE` (Nullable)

#### 7. `AgencyInvitation` (`agency_invitation`)
- **`id`**: `UUID` (Primary Key)
- **`agencyId`**: `UUID`
- **`inviterId`**: `UUID`
- **`inviteeEmailOrPhone`**: `VARCHAR(255)`
- **`role`**: `ENUM('admin', 'manager', 'recruiter', 'host')`
- **`status`**: `ENUM('pending', 'accepted', 'rejected', 'expired')`

#### 8. `AgencyAuditLog` (`agency_audit_log`)
- **`id`**: `UUID`
- **`agencyId`**: `UUID`
- **`actorId`**: `UUID`
- **`action`**: `VARCHAR(100)` (e.g. `OWNERSHIP_TRANSFERRED`, `ROLE_UPDATED`, `SETTLEMENT_APPROVED`)
- **`details`**: `JSONB`
- **`createdAt`**: `TIMESTAMP WITH TIME ZONE`

---

## 3. API Specification Summary

All endpoints require JWT bearer authentication and are routed under `/agencies`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/agencies/apply` | Submit formal agency registration application |
| **GET** | `/agencies/applications/list` | List agency registration applications (Filtered by status) |
| **PATCH** | `/agencies/applications/:id/review` | Approve/reject agency registration application |
| **POST** | `/agencies` | Direct agency creation |
| **GET** | `/agencies` | List active agencies with country/category filter |
| **GET** | `/agencies/rankings` | Fetch agency top rankings by monthly volume |
| **GET** | `/agencies/leaderboard` | Get agency leaderboard (revenue, growth, hosts, engagement) |
| **GET** | `/agencies/:id` | Get agency detail profile |
| **PUT** | `/agencies/:id` | Update core agency details |
| **PATCH** | `/agencies/:id/profile` | Update rich agency profile |
| **POST** | `/agencies/:id/suspend` | Suspend agency account |
| **POST** | `/agencies/:id/reactivate` | Reactivate suspended agency account |
| **PATCH** | `/agencies/:id/verify` | Toggle verification badge |
| **PATCH** | `/agencies/:id/featured` | Toggle featured status |
| **DELETE** | `/agencies/:id` | Delete agency |
| **GET** | `/agencies/:id/members` | List agency members & staff |
| **POST** | `/agencies/:id/invite` | Send agency staff/host invitation |
| **PATCH** | `/agencies/:id/members/:memberId/role` | Elevate/demote member role |
| **DELETE** | `/agencies/:id/members/:memberId` | Remove member from agency |
| **POST** | `/agencies/:id/transfer-ownership` | Transfer agency ownership to another member |
| **POST** | `/agencies/:id/hosts/recruit` | Issue host recruitment contract |
| **POST** | `/agencies/contracts/:id/accept` | Accept host recruitment contract |
| **POST** | `/agencies/contracts/:id/terminate` | Terminate host recruitment contract |
| **GET** | `/agencies/:id/hosts` | List agency managed hosts |
| **POST** | `/agencies/:id/settlements/calculate` | Trigger monthly settlement calculation |
| **GET** | `/agencies/settlements/list` | List agency settlements for accounting review |
| **PATCH** | `/agencies/settlements/:id/process` | Approve and process settlement payout |
| **GET** | `/agencies/:id/analytics` | Fetch real-time analytics & performance metrics |
| **GET** | `/agencies/:id/rewards` | List active rewards and milestone achievements |
| **POST** | `/agencies/:id/rewards/claim` | Claim completed agency reward |
| **POST** | `/agencies/:id/logo` | Upload agency avatar logo |
| **POST** | `/agencies/:id/banner` | Upload agency header banner |

---

## 4. Business Logic Rules

1. **Commission Split Structure:**
   - Platform Revenue Share default breakdown:
     - Host Direct Share: 65%
     - Agency Cut: 15% (Configurable per agency contract between 5% and 25%)
     - VoiceCloud Platform Margin: 20%
2. **Contract Enforcements:**
   - A broadcasting host can belong to at most ONE active agency contract at a time.
   - Contract termination requires 7-day notice period unless terminated by Platform Admin.
3. **Settlement Lifecycle:**
   - Settlement calculation triggers automatically on the 1st day of each month for the preceding period (`YYYY-MM`).
   - Status transition: `pending` -> `calculating` -> `approved` -> `paid`.
4. **Ownership Transfers:**
   - Ownership transfer requires the current owner's security confirmation and automatically reassigns the previous owner to `admin` role.

---

## 5. Queue Processing (BullMQ & Redis)

### Queue Names & Processors

1. **`agency-settlement-queue`** (`AgencySettlementProcessor`)
   - Job: `agency-settlement-calculate`
   - Responsibility: Computes total host gift earnings, calculates agency commission, platform fee deductions, and generates `AgencySettlement` record.
2. **`agency-analytics-queue`** (`AgencyAnalyticsProcessor`)
   - Job: `agency-analytics-refresh`
   - Responsibility: Aggregates monthly active hosts, gift stream volume, retention metrics, and updates leaderboard rankings in Redis.
3. **`agency-rewards-queue`** (`AgencyRewardsProcessor`)
   - Job: `agency-reward-distribute`
   - Responsibility: Evaluates monthly revenue targets and automatically grants milestone rewards (`AgencyReward`).
4. **`agency-verification-queue`** (`AgencyVerificationProcessor`)
   - Job: `agency-verification-process`
   - Responsibility: Processes document validation and background identity checks for business applications.

---

## 6. Redis Keys Strategy

```
agency:rankings:revenue          -> Sorted Set (Score: Revenue, Member: agencyId)
agency:rankings:hosts            -> Sorted Set (Score: Active Hosts, Member: agencyId)
agency:analytics:{agencyId}      -> Hash (Monthly metrics cache, TTL: 3600s)
agency:lock:settlement:{period}  -> String (Distributed Lock, TTL: 300s)
```

---

## 7. WebSocket Events (Socket.IO)

- `agency:application_updated`: Broadcast to applicant user when registration state changes.
- `agency:contract_signed`: Emitted to agency managers when a host signs a contract.
- `agency:settlement_ready`: Emitted to agency owner when monthly payout is ready for review.
- `agency:reward_unlocked`: Emitted when milestone reward is unlocked.

---

## 8. Admin Panel Integration

The Admin Panel includes dedicated Agency management features:
- **Agency Directory Page:** Filter, verify, feature, suspend, or reactivate agencies.
- **Application Review Modal:** Inspect business verification documents and approve/reject agency applications.
- **Settlements & Payouts Panel:** Review calculated agency revenue payouts, approve releases, and audit historical settlement records.
- **Leaderboards & Analytics Card:** Monitor top performing agencies and average host retention rates.

---

## 9. Future Enterprise Extension Strategy

When migrating this module to the VoiceCloud Enterprise Edition:
1. **Multi-Region Tax Compliance:** Add tax withholding calculations and VAT invoice generation within `AgencySettlementProcessor`.
2. **Sub-Agency Hierarchy:** Introduce nested child agency branches (`parentAgencyId`).
3. **Automated Bank/Crypto Wire Payouts:** Integrate Stripe Connect / Wise API directly into `processSettlement` for automated automated teller clearing.

---
*End of Technical Specification.*
