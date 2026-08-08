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

## Admin/Creator redesign rule

The upcoming redesign may change presentation only. Every existing route, page, action, API call, permission gate, business rule and state transition must remain available unless a separately approved functional change is created.
