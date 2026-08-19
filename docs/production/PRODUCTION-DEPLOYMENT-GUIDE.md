# VoiceCloud Production Deployment Guide

## Package types

VoiceCloud production packaging generates two customer/deployment artifacts:

- **Production Source** — buildable Backend + Landing + Admin + Creator + shared branding source.
- **Production Runtime** — compiled application for deployment without TypeScript/application source.

Both packages contain `RELEASE-MANIFEST.json` and `SHA256SUMS.txt` integrity evidence.

## Environment

Copy `.env.example` to `.env` on the deployment host and replace every `CHANGE_ME` value. Never commit or redistribute the real `.env` file.

Production requirements include:

- `NODE_ENV=production`;
- `INFRASTRUCTURE_MODE=real`;
- real PostgreSQL and Redis services;
- `DATABASE_SYNCHRONIZE=false`;
- strong unique JWT/encryption/database credentials.

## Source package

Install and build:

```bash
npm ci
npm run build
```

Start:

```bash
npm run start:prod
```

## Runtime package

Install production dependencies only:

```bash
npm ci --omit=dev
```

Start:

```bash
npm run start:prod
```

## Database

For a completely fresh empty database only:

```bash
npm run database:bootstrap:prod
```

For an existing database:

```bash
npm run migration:status:prod
npm run migration:run:prod
```

Never run the bootstrap against an existing application database and never enable automatic schema synchronization in production.

## White-label source branding

Presentation branding is centralized in:

```text
shared/branding/index.ts
shared/branding/public/brand/
```

Replace the configured names/colors and four standard brand assets in the source package, then rebuild. Do not edit compiled runtime bundles manually.

Technical compatibility identifiers such as JWT issuer/audience, database/migration identity, persisted storage/session keys, payment identifiers and service domains are not presentation branding and must not be changed casually.

## Integrity

Before deployment, validate `SHA256SUMS.txt` against the package files. `RELEASE-MANIFEST.json` records each payload file's SHA-256 hash and byte size together with the product version and source commit used to create the package.
