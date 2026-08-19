# Production Source & Branding Audit

## Baseline

- Repository: `akc-26/VoiceCloud-Backend`
- Accepted branch: `VoiceCloud-Backend-VC-PH08-WP08-03-04-R03`
- Accepted commit: `f8c4ff1219797d490d35fd909128367abeceeb38`
- Baseline source/config files: 861
- Protected `package-lock.json` SHA-256: `17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a`

This audit is intentionally non-functional. Routes, APIs, DTO behavior, business logic, financial authority, permissions, state flows and database history are not redesign targets.

## Findings

### 1. Production-facing roadmap/development text

The accepted baseline contained 17 roadmap/development references in the three web applications. These included public labels such as `VC-PH...`, `WP08...`, `Phase 20/22/24/...`, `Authentication Entry`, and `Foundation Ready`.

Locations included the public Landing page, Creator login/sidebar/help metadata, and Admin pages for authentication, rankings, hosts, VIP, RTC, gifts, referrals, store, and tasks/achievements.

**Disposition:** remove or replace the user-facing wording with product language while preserving every page, route and action.

### 2. Vendor-specific development scaffold wording

Two repository text references described a discarded vendor-specific development wrapper/scaffold (`.gitignore` and `README.md`).

**Disposition:** replace those references with vendor-neutral generated-scaffold wording. This does not remove or disable the legitimate Google Gemini provider integration; Gemini is a product capability and is separate from discarded development scaffolding.

### 3. Internal phase/history identifiers

The repository also contains historical phase labels in areas that are not customer-facing. They fall into different risk classes:

- **Immutable migration identities:** migration filenames, migration class names and migration `name` values must remain unchanged because TypeORM migration history depends on them.
- **Compatibility-sensitive technical identifiers:** JWT issuer/audience, development fallback secrets, database names, package/application identifiers, local-storage keys and operational domains must not be silently renamed as part of a visual rebrand.
- **Engineering acceptance history:** `scripts/wp08`, `docs/wp08`, older acceptance commands in `package.json`, and regression filenames are engineering evidence. They should stay in the development repository until a deliberate production packaging step excludes them.
- **Low-risk comments/Swagger labels:** phase-only comments and user-visible Swagger tag labels can be changed to feature terminology without changing runtime contracts.
- **Legacy internal class/file names:** names such as `GiftsPhase18Controller`, `Phase18SecurityController` and `SendMultiGiftPhase22Dto` are not user-facing. Renaming them can affect Swagger schema identity/import history and is therefore deferred to a dedicated source-sanitation change only if there is a demonstrated production benefit.

### 4. Branding fragmentation

The baseline had 44 `VoiceCloud`/`voicecloud` references across frontend/shared source and no centralized brand asset directory. Branding was split between:

- MUI/Lucide icons used as product marks;
- hard-coded browser titles and SVG data-URI favicons;
- Admin theme colors;
- Creator theme colors and inline gradients;
- Landing colors/text;
- hard-coded brand names in login, sidebar, footer and fallback profile copy;
- technical domains/local-storage identifiers mixed with presentation branding.

**Disposition:** introduce one shared presentation branding configuration plus one shared asset directory. Technical identifiers remain separate for backward compatibility.

### 5. Hard-coded color inventory

Baseline frontend presentation literals:

- Admin: 111 color/effect literals, 58 unique values.
- Creator: 157 color/effect literals, 70 unique values.
- Landing: 4 color literals, 4 unique values.

The highest-risk white-label values are the primary/secondary palettes, product mark, favicon, product names and login/sidebar branding. These are centralized in the white-label foundation now.

Special-purpose chart/status/feature colors are intentionally not bulk-rewritten before the approved Admin/Creator redesign. Changing them now would create unnecessary visual drift and risk. The redesign phase should consume the same centralized brand tokens while preserving all behavior.

### 6. Package/release hygiene

The accepted repository contains 57 WP08-specific npm script entries plus engineering acceptance scripts/docs. These are useful development evidence and regression tooling, but they do not belong in a minimal production deployment artifact.

No accidental backup/archive/log/temp source files were found in the accepted source package; files whose names contain `backup` belong to the actual Backup & Disaster Recovery feature.

**Production recommendation:** keep engineering tests/tooling in Git, but create a later release-packaging step that includes only runtime-required artifacts/config templates and excludes tests, acceptance history, docs, `.git`, development caches, local uploads, secrets and generated verification artifacts.

### 7. Route/page preservation baseline

The accepted UI route surfaces are frozen for the upcoming redesign:

- Admin: 33 declared routes including login, unauthorized, all protected pages and wildcard fallback.
- Creator: 19 declared routes including login, all protected pages and wildcard fallback.

A durable route-preservation test is added with the white-label foundation so future visual work cannot silently remove an accepted page.

## White-label boundary

The white-label layer owns presentation identity only:

- customer-facing brand name and legal name;
- Admin/Creator/Website product names;
- core brand palette;
- typography family;
- logo mark, horizontal logo, favicon and app icon;
- presentation contact/default creator labels.

It explicitly does **not** own:

- API routes or DTOs;
- RBAC/permissions;
- wallet/gift/payout/reward/VIP authority;
- database table/migration identities;
- JWT issuer/audience;
- application package IDs;
- operational CDN/RTC/storage domains;
- compatibility local-storage keys.

Those require separate migration/configuration decisions if they ever need to change.

## Result of this package

The white-label foundation removes roadmap text from the customer-facing Admin, Creator and Landing source, removes phase-only Swagger labels/comments where safe, centralizes the primary presentation identity, and adds guardrails for route preservation. No feature/page/function is intentionally removed or changed.

## Additional production-copy corrections made during the audit

The audit also found several presentation strings that were not phase labels but were misleading or stale in a production-facing UI:

- Creator Help still described the former 10,000-diamond / $100 payout threshold. It now reflects the accepted wallet authority: 100-diamond minimum, equivalent to $0.50 at $0.005 per diamond.
- Creator Footer exposed a local development port status (`Gateway Active (3000)`). It now uses product-facing connectivity language.
- Creator Login previously presented password-reset assistance as if a reset email had been sent even though that flow is not backed by a reset-email API. The copy now directs the creator to administrator/support assistance without inventing functionality.

These are text corrections only. No payout rule, transport, authentication behavior or API was changed.

## Existing controls intentionally not expanded in this package

The audit identified baseline UI controls whose complete behavior depends on separate functional scope (for example, a true self-service password-reset workflow and some content-management/search conveniences). This package does not invent or alter those functions. They remain candidates for explicit future functional work if required; the current package only prevents misleading production copy.

## Frontend TypeScript production-cleanliness finding

The stricter production UI gate exposed technical debt that the existing Vite production build did not previously enforce. The accepted R03 baseline contained 82 Creator TypeScript errors across 16 files while still producing a valid Vite bundle.

The complete error inventory was closed as one compatibility pass rather than one failure at a time:

- 51 removed MUI Grid breakpoint props (`xs`/`sm`/`md`/`lg`) migrated to the MUI v9 `size` API with identical responsive values;
- 14 `import.meta.env` typing errors resolved by adding the standard Vite client type surface to the Creator TypeScript project;
- 8 optional analytics presentation fields reconciled with the existing analytics response type;
- 6 Creator dashboard profile-shape accesses normalized across the persisted Creator profile and authenticated user-profile response;
- 1 gift-query AbortSignal argument corrected to the existing service signature;
- 1 room `paused` presentation status reconciled with the room summary type;
- 1 subscription-plan backend title alias represented in the Creator presentation type.

These corrections do not add or remove a route, page, API, DTO, permission, financial rule, or business workflow. They make the existing UI source compatible with the already-locked MUI/Vite/TypeScript toolchain and are now guarded by the production source checker.
