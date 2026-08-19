# VC-WEB-PH02-R04 Correction Report

## Findings corrected

- The full local VoiceCloud launcher serves the compiled consumer website at `http://localhost:3000`; port `3003` is only available when the Vite website dev server is started separately.
- Removed the redundant consumer `/auth/creator` route and `CreatorSignInPage`.
- `Creator Sign-In` on the consumer sign-in page now hands off directly to Creator Studio `/creator/login`.
- In Vite development (`:3003`) the hand-off targets the local full app at `http://localhost:3000/creator/login`; in compiled/same-origin mode it remains `/creator/login`.
- Added a source regression check that fails if `/auth/creator` is reintroduced or the direct hand-off is lost.

## Local QA recommendation

For integrated functional QA, use `http://localhost:3000` after starting the full local real application. Use `http://localhost:3003` only when `npx vite --config website/vite.config.ts` is running concurrently for frontend hot reload.
