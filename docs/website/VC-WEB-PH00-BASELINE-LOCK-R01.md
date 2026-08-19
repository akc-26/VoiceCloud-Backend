# VoiceCloud Web PH00 — Baseline Lock R01

## Protected parent
- Repository: `akc-26/VoiceCloud-Backend`
- Branch: `VoiceCloud-Backend-VC-PH09-WP09-R11`
- Exact parent commit: `a9e581e23cb3554708eaf10741719d28da5c25ef`
- Parent commit message: `VC-PH09-WP09-R11 Complete QA audit, authority hardening and security fixes`
- Parent of R11: `02ec283` (R10)

## Authorities
1. R11 backend: API, DTO, authorization, realtime, RTC, wallet, business and persistence authority.
2. VoiceCloud Web FINAL R01 (84 designs): consumer-web visual/UI authority.
3. Existing `/creator`: Creator Studio workspace authority; do not duplicate it in the consumer website.
4. Existing `/admin`: administration workspace authority; do not alter its workflows for website delivery.

## Preservation rules
- Do not change API routes/contracts merely to fit UI mocks.
- Do not expose host-only functions without backend role/capability authority.
- Do not optimistically confirm wallet, gift, ticket, moderation, speaker or RTC state before backend authority.
- Keep `DATABASE_SYNCHRONIZE=false` in production.
- Keep `/admin`, `/creator`, `/api`, `/api/v1`, `/socket.io`, `/health`, migrations and operational identifiers intact.
- Customer-facing presentation may change; compatibility-sensitive identifiers may not be rebranded.

## Website branding rule
All customer-facing website brand values are defined in the existing single white-label authority `shared/branding/index.ts`. `website/src/branding/index.ts` is a value-free adapter that exposes those shared values as website CSS variables; components must not scatter brand constants.
