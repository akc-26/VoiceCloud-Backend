# VoiceCloud Backend

VoiceCloud is a production-oriented NestJS monolith that serves the REST API, Socket.IO services, background queues, Landing Website, Admin Portal, and Creator Studio from one deployable application.

## Application routes

- `/` — Landing Website
- `/admin` — Admin Portal
- `/creator` — Creator Studio
- `/api` and `/api/v1` — REST API
- `/socket.io` — Socket.IO
- `/health` — Health checks
- `/docs` and `/api/docs` — Swagger when enabled

## Requirements

- Node.js 22 LTS or the project-approved Node.js runtime
- npm 10
- PostgreSQL
- Redis

The application uses npm only. Do not add Bun lockfiles.

## Setup

```bash
npm ci
cp .env.example .env
```

Replace every `CHANGE_ME` value in `.env` before production startup.

## Build

```bash
npm run build
```

The build creates the backend and the three frontend bundles under `dist/`.

## Database initialization and migrations

For a **completely fresh, empty PostgreSQL database**, run the guarded one-time bootstrap after configuring `.env`:

```bash
npm run database:bootstrap
```

The bootstrap refuses to run when application tables already exist. It creates the current entity schema and records the migrations included in this release as applied. Keep `DATABASE_SYNCHRONIZE=false`.

For an **existing VoiceCloud database**, never run the bootstrap. Run only pending migrations:

```bash
npm run migration:status
npm run migration:run
```

After a production build, the equivalent compiled commands are:

```bash
npm run database:bootstrap:prod   # fresh empty database only
npm run migration:status:prod
npm run migration:run:prod       # existing database upgrades
```

Never enable `DATABASE_SYNCHRONIZE` in production startup.

## Production startup

```bash
npm run start:prod
```

`npm run start:prod` forces `NODE_ENV=production`; configure `INFRASTRUCTURE_MODE=real` and all required production secrets in `.env`. Swagger is disabled unless `ENABLE_SWAGGER=true` is explicitly configured.

## Source layout

- `src/` — NestJS backend, modules, queues, sockets, migrations, and scripts
- `shared/` — shared contracts and types
- `website/` — Landing Website
- `admin/` — Admin Portal
- `creator/` — Creator Studio
- `scripts/wp08/` — pre-deployment acceptance tooling
- `docs/` — architecture and migration documentation

## Files intentionally excluded

Google AI Studio wrapper/scaffold files, generated builds, dependencies, runtime uploads, private uploads, environment secrets, logs, caches, nested archives, and historical package verification reports are not part of the clean source package.
