# VoiceCloud Admin — Modern Cloud / Ocean Blue

## Scope

This implementation applies the approved Admin presentation system to the existing VoiceCloud Admin application. It is a UI/presentation change only.

Authoritative parent baseline:

- Branch: `VoiceCloud-Backend-VC-PH08-WP08-04-02-R04`
- Commit: `0d8bb8375b657506f5f6eca74b6a28594e69181a`

## Functional boundary

The implementation does not change backend source, database migrations, APIs, DTOs, Admin routes, Admin service contracts, Creator Studio source, Website source, RBAC, authentication authority, wallet/gift/payout/VIP/reward authority, queues, RTC processing or persisted financial rules.

The Admin route file and Admin service directory remain byte-identical to the accepted parent baseline.

## Visual system

Theme: **Modern Cloud / Ocean Blue**

The Admin interface consumes centralized semantic white-label roles from `shared/branding/index.ts`:

- Primary Brand: `#2563EB`
- Secondary Brand: `#0F4C81`
- Accent: `#38BDF8`
- Background: `#F4F8FC`
- Surface: `#FFFFFF`
- Navigation Background: `#0F5EA8`
- Navigation Selected: `#DCEBFF`
- Text Primary: `#10233F`
- Text Secondary: `#64748B`
- Border: `#DCE5EF`

The Admin MUI theme centralizes button, card, input, table, dialog, menu, chip, alert, tab, switch, pagination, focus and reduced-motion presentation.

## Application shell

The Admin shell now provides:

- grouped navigation without changing route destinations;
- expanded/collapsed desktop navigation;
- independent mobile drawer state;
- compact sticky application header;
- existing notification console routing instead of hard-coded sample notifications;
- no non-functional global-search control;
- responsive content container and consistent page transition treatment;
- restrained light-first presentation with a supported dark semantic remap.

## Login

The login page retains the exact existing authentication service, allowed-role validation, token state and `/dashboard` navigation. Only the visual composition and production copy changed.

## Dashboard

The dashboard now consumes the existing `/admin/dashboard/stats` response through `adminService.getDashboardStats()` and renders the actual nested `overview` and `infrastructure` data shapes.

The previous illustrative fallback totals, fabricated trend percentages and hard-coded sample chart arrays were removed. No new backend endpoint or metric was introduced.

## Shared Admin components

The following existing reusable components were visually reconciled with the approved design system while retaining their public props and behavior:

- DataTable
- StatisticsCards
- SearchBar
- Filters
- Pagination
- StatusBadge
- EmptyState
- ErrorState
- ConfirmationDialog
- ModalForms
- DrawerPanels
- Charts

All other existing Admin pages inherit the new semantic theme and shell without route or business-logic changes.

## Responsive and accessibility requirements

- 1440px+: full desktop navigation and multi-column content.
- 1024–1439px: laptop layout with reduced content density.
- 768–1023px: temporary navigation drawer and responsive grid stacking.
- <768px: stacked content and preserved critical actions.
- Keyboard-visible focus is maintained.
- State is not communicated by color alone in status badges.
- Reduced-motion preference disables decorative transitions.

## Verification

Run in a fresh extracted package:

```powershell
npm run admin:ui-redesign:prepare
npm run admin:ui-redesign:check
```

The acceptance checker is non-mutating. A passing run must report 10 passed stages, zero failures and zero skipped stages.

## Authoritative parent reconstruction note

This candidate is reconstructed from the exact tracked Git archive of `VoiceCloud-Backend-VC-PH08-WP08-04-02-R04` at commit `0d8bb8375b657506f5f6eca74b6a28594e69181a`. Unchanged backend, Creator, Website, Admin route/service, and protected state files retain the exact committed bytes.

The frozen Git archive stores CRLF line endings in tracked files, while the repository Prettier policy requires LF. For this Admin-only package, Stage 3 applies Prettier only to the Admin-redesign-owned files. Stage 4 runs the existing foundation ESLint semantic rules with only the `prettier/prettier` rule disabled so that accepted parent files are not rewritten merely to normalize line endings. This does not relax TypeScript, Jest, build, runtime, or functional-boundary acceptance.

Creator and Website semantic branding values remain unchanged during the Admin-only redesign; Ocean Blue status colors are Admin-scoped tokens.

## Cross-platform lockfile byte stability

`package-lock.json` is protected by a historical exact SHA-256 contract. The repository now includes `.gitattributes` with `package-lock.json text eol=lf`, and the lockfile itself is stored with LF bytes. This prevents Windows/Linux checkout or archive line-ending conversion from changing the protected lockfile hash. Acceptance rejects both a hash mismatch and any CRLF bytes; the historical contract test remains unchanged.
