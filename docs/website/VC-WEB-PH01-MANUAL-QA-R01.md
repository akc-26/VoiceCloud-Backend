# VoiceCloud Web PH01 — Manual QA R01

## Acceptance commands (Windows / Android-Studio-style terminal / CMD)
Run from the extracted repository root.

```bat
npm ci
npm run web:ph01:source-check
npm run typecheck:website
npm run build:website
npm run wp09:r11:source-check
npm run build
```

Expected outcome: every command exits with code 0. The final full build must produce the Nest backend plus `dist/website`, `dist/admin` and `dist/creator` bundles.

## Manual QA cases

### VC-WEB-PH01-QA-001 — Central branding authority
1. Open `shared/branding/index.ts`.
2. Confirm the website Royal Sapphire palette, website display typography, gradients, radii, shadows and layout tokens are defined there.
3. Confirm `website/src/branding/index.ts` contains no independent hex colour values and only adapts shared values into CSS variables.
4. Confirm logo paths resolve through the existing shared brand assets.
Expected: one shared white-label source of truth; no page-level brand constants.

### VC-WEB-PH01-QA-002 — Admin/Creator preservation
Run `npm run wp09:r11:source-check`.
Expected: Admin 7/7, Creator 12/12, Backend 14/14, RTC/security 27/27 and API parity PASS.

### VC-WEB-PH01-QA-003 — Website home shell
Run a website dev server after `npm ci` (for example `npx vite --config website/vite.config.ts`) and open `http://localhost:3003/`.
Expected: premium light Royal Sapphire consumer shell, VoiceCloud logo, top navigation, search control, hero section, Live Now room cards and lower consumer panels. It must not look like Admin or Creator Studio.

### VC-WEB-PH01-QA-004 — Responsive behavior
Test approximately 1440px, 1024px, 768px and 390px browser widths.
Expected: no horizontal overflow; room grid collapses 4→2→1; navigation/search simplify for narrow screens; hero stacks on tablet/mobile.

### VC-WEB-PH01-QA-005 — Route foundation
Open `/explore`, `/rooms`, `/communities`, `/people`, `/events`, `/about`, `/search`.
Expected: routes load inside the shared consumer shell. PH01 intentionally uses implementation-phase placeholders until assigned feature phases.

### VC-WEB-PH01-QA-006 — Protected route foundation
While signed out, open `/me`, `/messages`, `/notifications`, `/settings` or `/onboarding`.
Expected: redirect to `/auth/sign-in` with the return path retained in router state.

### VC-WEB-PH01-QA-007 — API foundation
Inspect `website/src/api/client.ts`.
Expected: `/api/v1` base, Bearer access token injection, one-at-a-time refresh rotation against `/auth/refresh`, retry of the original 401 request and auth clear on refresh failure.

### VC-WEB-PH01-QA-008 — Realtime foundation
Inspect `website/src/realtime/socket.client.ts` and `website/vite.config.ts`.
Expected: Socket.IO does not auto-connect; current bearer token is applied before connection; Vite proxies `/socket.io` with `ws: true` to backend port 3000.

### VC-WEB-PH01-QA-009 — Accessibility foundation
Keyboard through header and Home actions; enable reduced motion in OS/browser settings.
Expected: visible focus indicator, semantic nav/main landmarks, button labels, and reduced-motion CSS behavior.

### VC-WEB-PH01-QA-010 — Monolith build preservation
Run `npm run build`.
Expected: backend + website + admin + creator compile successfully with no modification required to Admin/Creator workflows.
