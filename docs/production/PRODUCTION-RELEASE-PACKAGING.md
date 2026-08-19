# VoiceCloud Production Source Sanitation & Release Packaging

## Purpose

`VC-PH08-WP08-04-05` separates the complete engineering Git repository from the artifacts that are actually handed to a deployment operator or white-label customer. It does **not** delete engineering history from Git and does **not** alter application behavior.

Accepted parent:

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-04-04-R03`
- Commit: `9f64631803be9f6ec70cf66a48e353998a2e6fbf`

## Generated artifacts

After a successful unified build, run:

```bash
npm run release:production:package
```

Generated output is written under `.release/wp08-04-05/` and is intentionally ignored by Git.

### Production source package

`VoiceCloud-Production-Source.zip` is a buildable source package containing the backend, Landing Website, Admin Portal, Creator Studio, shared contracts/branding, migrations, build configuration, production environment template, operational startup script and white-label documentation.

It excludes:

- `.git`, `node_modules`, `dist`, caches and IDE metadata;
- `.env` and other local environment files;
- logs, uploads, private uploads, database dumps and nested archives;
- test/spec files and the root `test/` folder;
- `src/wp08`, `scripts/wp08`, `docs/wp08` and acceptance-history material;
- backup README/export artifacts.

The source package uses a sanitized `package.json` that retains dependency declarations but exposes only production/build/database operational scripts. The locked `package-lock.json` is copied byte-for-byte.

### Production runtime package

`VoiceCloud-Production-Runtime.zip` contains only the compiled `dist/` application, production startup script, dependency metadata, environment template, release manifest/checksums and deployment README.

It excludes TypeScript source, tests, declarations, source maps, engineering documentation, local data and secrets. Deploy with:

```bash
npm ci --omit=dev
npm run start:prod
```

## Integrity and deterministic packaging

Each package contains:

- `RELEASE-MANIFEST.json` with the accepted parent and SHA-256/size of every payload file;
- `SHA256SUMS.txt` for package verification.

ZIP entries are emitted in stable order with a fixed timestamp and explicit attributes so repeated packaging of unchanged source/build output is byte-identical.

The acceptance command regenerates the packages twice and requires identical source and runtime ZIP hashes.

## Secret protection

Packaging rejects real `.env` files, usable private-key material, credential/service-account JSON files, common token formats, non-placeholder sensitive environment assignments and runtime/private-upload data. Documentation/default configuration may contain explicit non-usable placeholders (for example `CHANGE_ME`, `_DEFAULT`, `_TEST`, or truncated `...` key samples); the scanner distinguishes those from a structurally valid private-key payload instead of accepting or rejecting on PEM markers alone. `.env.example` is allowed only as the production template and must keep placeholder secrets.

## White-label workflow

White-label branding remains centralized in:

```text
shared/branding/index.ts
shared/branding/public/brand/
```

Replace/edit those presentation assets and values in the **production source package**, then rebuild. Do not manually edit compiled runtime JavaScript.

Branding must not automatically change compatibility-sensitive JWT issuer/audience, database names, migration names, persisted keys, payment IDs, RTC/CDN/storage domains or mobile application identifiers.

## Acceptance

Run:

```bash
npm run release:production:check
```

The verifier checks parent/source integrity, frontend TypeScript, full Jest regression, unified build, existing runtime smoke, sanitized package generation, package policy/security/integrity, sanitized runtime browser/API smoke, reproducibility and source immutability. The sanitized runtime smoke extracts the generated runtime ZIP into a clean non-hidden staging directory and validates Landing, Admin root/deep-link, Creator root/deep-link, API isolation and health from the distributable artifact itself. Failure diagnostics include the HTTP response body and captured runtime output.
