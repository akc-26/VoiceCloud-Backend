# White-label Configuration Guide

## Single branding location

Presentation branding is controlled from:

- `shared/branding/index.ts`
- `shared/branding/public/brand/`

The Admin, Creator and Website Vite builds all copy the same brand asset directory into their own output.

## Safe white-label changes

Edit `BRAND_CONFIG` for:

- brand/legal name;
- product display names;
- support contact and login example;
- primary/secondary Admin, Creator and Website colors;
- default presentation labels.

Replace these files to change visual identity without touching application logic:

- `logo-mark.svg`
- `logo-horizontal.svg`
- `favicon.svg`
- `app-icon.svg`

Keep the filenames, or update the corresponding paths in `BRAND_CONFIG.assets`.

## Important compatibility rule

Do not treat technical identifiers as branding. A visual rebrand must not automatically change JWT issuer/audience, database name, migration names, local-storage keys, Android/iOS package IDs, payment product IDs, RTC/CDN/storage domains or persisted usernames. Those can affect authentication, stored sessions, migrations, external integrations and existing customers.

## Admin/Creator presentation rule

Admin and Creator visual themes are presentation-only. Every existing route, page, action, API call, permission gate, business rule and state transition must remain available unless a separately approved functional change is created.

## Production release workflow

In the engineering repository, before generating a customer/white-label delivery:

1. Edit `shared/branding/index.ts`.
2. Replace `shared/branding/public/brand/logo-mark.svg`, `logo-horizontal.svg`, `favicon.svg`, and `app-icon.svg` while keeping the filenames unless the configured asset paths are intentionally changed.
3. Run `npm run build`.
4. Run `npm run release:production:check`.
5. Deliver the generated production **source** package when the customer receives source, or the generated production **runtime** package for compiled deployment.

Do not copy the full engineering repository as the customer release package. The release pipeline removes tests, engineering acceptance history, local data, secrets, caches and development-only artifacts while keeping required product source/migrations/branding assets.

## Consolidated validation

Before freezing a branded release, run:

```powershell
npm run ui:white-label:check
```

The consolidated check builds a synthetic alternate brand in an ignored staging copy and proves that Admin, Creator and Website consume centralized identity/product labels, presentation colors and all four brand assets. It does not mutate the authoritative source tree.

Customer-facing display text must use `BRAND_CONFIG`. Technical compatibility identifiers such as persisted storage keys, authentication/protocol identifiers and infrastructure domains remain intentionally outside presentation branding unless a separately approved migration changes them.
