# Consolidated UI & White-label Acceptance

## Scope

`VC-PH08-WP08-04-06` is the final WP08 consolidation package before WP09 Production Certification. It does not introduce product features, routes, APIs, DTOs, migrations, permissions, economy rules or dependency upgrades.

Authoritative parent:

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-04-05-R02`
- Commit: `6ce1634c292645cb521c8d178adb0a7680ab77bb`
- Authoritative Git archive SHA-256: `07a3f70c501a9564983ec580221761118c5932454a341281c97b9aed8af6334d`

## Consolidation correction

The audit found a small number of presentation-only labels that still embedded the existing product identity directly in TSX. They are now bound to `BRAND_CONFIG`:

- Admin Dashboard platform name;
- Admin login product label;
- Admin backup default presentation note;
- Creator top bar and breadcrumbs product label;
- Creator Dashboard service label;
- Creator login access/product label;
- Website short product label and primary presentation color.

Technical compatibility identifiers remain deliberately unchanged. Examples include persisted local-storage keys and infrastructure domains such as the RTC/CDN endpoints.

### R02 corrective acceptance hardening

The R01 Windows acceptance exposed three presentation/tooling-only defects, all corrected without reopening accepted product behavior:

- Admin Dashboard, Login and Backup Management async UI callbacks now use explicit `void` boundaries so Promise-returning actions are never passed directly to void-returning React/MUI event attributes.
- Synthetic Website color propagation now detects the preserved branding file line ending and patches either CRLF or LF staging content correctly.
- The nested WP08-04-05 release Prettier regression uses `--end-of-line auto`, preserving strict formatting checks while accepting the frozen parent files exactly as checked out on either CRLF or LF platforms.

No backend, API, DTO, migration, RBAC, economy, dependency or lockfile behavior is changed by these corrections.

## White-label authority

Customer-facing branding remains controlled from:

- `shared/branding/index.ts`
- `shared/branding/public/brand/logo-mark.svg`
- `shared/branding/public/brand/logo-horizontal.svg`
- `shared/branding/public/brand/favicon.svg`
- `shared/branding/public/brand/app-icon.svg`

The Admin, Creator and Website builds consume this centralized configuration/assets.

## Synthetic propagation proof

`npm run ui:white-label:propagation-check` is non-mutating with respect to tracked source. It:

1. copies the three frontend applications and shared branding into ignored staging;
2. links the already-installed locked `node_modules` into staging;
3. applies a synthetic alternate brand, alternate product labels and alternate presentation colors only to the staging copy;
4. replaces all four brand SVG assets in staging;
5. builds Website, Admin and Creator from the staging copy;
6. proves each compiled application contains the synthetic brand/product/color values;
7. proves all four compiled brand assets are byte-identical to the centralized synthetic assets;
8. rejects retention of the original customer-facing `VoiceCloud` name in the compiled frontend output;
9. removes the staging directory in a `finally` block.

This tests the actual white-label wiring rather than only checking that a configuration file exists.

## Acceptance command

Preparation may normalize only package-owned WP08-04-06 files:

```powershell
npm run ui:white-label:prepare
```

Final acceptance is non-repairing:

```powershell
npm run ui:white-label:check
```

The 9 stages are:

1. consolidated source and accepted-parent boundary;
2. locked dependency availability;
3. package-owned Prettier check;
4. presentation ESLint gate;
5. production release source contract anchored to the accepted WP08-04-05 parent and the exact approved consolidation delta;
6. synthetic white-label propagation across Website/Admin/Creator;
7. complete WP08-04-05 production release acceptance regression (including typecheck, full Jest, unified build, browser/API smoke, sanitized source/runtime packages, package audits, deterministic ZIPs and runtime ZIP smoke);
8. final consolidated source-contract re-check;
9. source immutability.

Required result:

```text
Passed stages: 9
Failed stages: 0
Skipped stages: 0

CONSOLIDATED UI & WHITE-LABEL ACCEPTANCE PASSED
```

## Boundary

A successful WP08-04-06 result freezes WP08. WP09 then performs production certification, deployment/environment/security/infrastructure/backup/browser acceptance and GO/NO-GO assessment. WP09 must not be used to redesign the UI or add product features.
