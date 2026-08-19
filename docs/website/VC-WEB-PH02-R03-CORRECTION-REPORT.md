# VC-WEB-PH02-R03 Correction Report

## Trigger
Runtime browser QA identified two separate conditions:

1. Consumer auth API requests from the website Vite server returned proxy `ECONNREFUSED` when the backend on port 3000 was not running. The UI surfaced Axios' raw `Request failed with status code 500` text.
2. Creator Studio hand-off used a relative `/creator/login` URL. During website Vite development on port 3003 this was incorrectly handled by the consumer SPA and rendered its 404 page.

## Corrections

- Added `website/src/config/app-targets.ts` as the central cross-app target resolver.
- Creator Studio hand-off defaults to `http://localhost:3000/creator/login` in website development and `/creator/login` in production/same-origin deployment.
- Added optional `VITE_CREATOR_APP_URL` and `VITE_ADMIN_APP_URL` overrides.
- Added `envDir` to the website Vite config so repository-root public `VITE_*` values (including Firebase web config) are actually loaded by the website build/dev server.
- Improved API error normalization so backend-unavailable/proxy failures do not expose the raw Axios 500 message.
- Added durable PH02 source checks for cross-app routing, root Vite environment loading, and backend-unavailable UX.

## Operational requirement
Authentication is backend-connected functionality. During Vite website development (`:3003`), the local VoiceCloud backend/full application must also be running on `:3000`.
