# Creator Studio — Aurora Live / Green

## Scope

This package implements the approved VoiceCloud Creator Studio visual redesign on top of the accepted Admin UI baseline.

Authoritative parent:

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-04-03-R04`
- Commit: `3ab7cb1270ba724411bf65587d6cee2107c8ba34`

The work is presentation-layer only. Existing Creator routes, backend APIs, authentication, permissions, wallet/payout/gift authority, notification delivery, RTC behavior and database contracts remain unchanged.

## Visual system

- Theme: Aurora Live / Green
- Primary: emerald green
- Secondary: deep teal
- Accent: mint/aqua
- Navigation: deep graphite-green
- Main surfaces: soft grey-green with subtle aurora depth
- Typography: Inter-first system stack
- Density: comfortable / slightly spacious
- Motion: restrained and reduced-motion aware

The Creator-specific semantic tokens live in `shared/branding/index.ts` and are consumed by the Creator MUI theme. Admin semantic tokens are preserved.

## Implemented presentation surfaces

- Creator application shell and responsive content container
- Expanded, collapsed and mobile navigation
- Dark atmospheric Creator header
- Realtime connection badge and notification/profile menus
- Creator Login atmospheric authentication surface
- Creator Dashboard identity hero, real KPI summaries, Live Studio entry, wallet/earnings summary, recent activity and notifications
- Live Rooms emerald realtime treatment
- Analytics emerald/teal chart language
- Existing Wallet, Earnings, Gifts, Payouts, Audience, Followers, Subscribers, Schedule, Notifications, Verification, Profile, Settings and Help pages inherit the centralized Creator component language
- Semantic status, input, table, card, dialog, chip, alert, switch, skeleton and focus treatments

## Data and functionality boundary

The design artwork contains sample names, values, trends and room states. These values are not copied into the redesigned Dashboard.

The Dashboard uses the existing Creator profile, dashboard, wallet, activity and notification queries. Where the Dashboard does not have authoritative live-room state, it routes the creator to the existing Live Rooms workspace instead of rendering a fake room or fake stream-health metric.

Existing Creator API/service files remain protected and unchanged. Any older compatibility/fallback behavior inside the accepted service layer is outside this UI-only package and is not rewritten here.

## Future video compatibility

The live visual language uses a stage-oriented surface, live status, presence and action hierarchy that can accommodate a future video frame without adding video APIs, controls or backend behavior now.

## Acceptance requirements

`npm run creator:ui-redesign:check` must prove:

1. Accepted Admin/backend/website boundaries remain unchanged.
2. `package-lock.json` remains on the protected LF-byte identity.
3. Creator Aurora semantic tokens and component overrides exist.
4. All accepted Creator routes remain present.
5. Creator services/auth/notification state remain unchanged.
6. No legacy purple Creator primary palette is reintroduced.
7. The redesigned Dashboard contains no old illustrative hard-coded KPI/room values.
8. Prettier, ESLint, frontend TypeScript, Jest, unified build and runtime smoke pass.
9. Verification does not mutate source.

## Async UI event safety

Creator presentation callbacks must remain void-returning at React/MUI event boundaries. Promise-capable operations such as React Query `refetch()` / `invalidateQueries()`, router navigation, and async action handlers are explicitly awaited or intentionally prefixed with `void`. The Creator source checker and ESLint acceptance gate protect this convention so the same async-handler regression cannot silently return.
