# VC-WEB-PH02-R01 Implementation Report

## Protected parent
- Branch: `VoiceCloud-Backend-VC-WEB-PH01-R01`
- Commit: `87007f2b6779288393c71669e3c9b1e8cc82baf8`
- Parent lineage: R11 `a9e581e23cb3554708eaf10741719d28da5c25ef`

## Scope implemented
- Standard email/username + password sign-in using `POST /api/v1/auth/login`.
- Registration using the exact backend-required `username`, `displayName`, `email`, `password` contract.
- Phone OTP send and login using `phone/send-otp` then `phone/login`; the OTP is not consumed through the standalone verify endpoint first.
- Guest login and authenticated guest-account upgrade.
- Optional Google sign-in through Firebase Web Auth only when public `VITE_FIREBASE_*` configuration exists; the backend still verifies the Firebase ID token.
- Creator entry hands off to `/creator/login`, preserving Creator Studio's independent role-gated auth store.
- Authentication bootstrap, refresh failure → session-expired state, restricted/locked account state.
- First-time onboarding using existing profile/settings APIs; no duplicate registration identity fields are required.
- Guest upgrade prompt in the consumer header.
- Royal Sapphire auth/onboarding presentation uses centralized website CSS variables and shared branding authority.

## Explicitly not implemented
- Forgot password / reset password (no canonical consumer API in R11).
- Two-factor authentication.
- Generic account recovery.
- Client-side bypass of backend restrictions.
- Token sharing between consumer website and Creator Studio.

## Google Web configuration
Only public Firebase browser values may be configured as `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Service-account credentials remain backend-only.
