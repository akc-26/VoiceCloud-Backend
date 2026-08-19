# VC-WEB-PH02-R04 Manual QA

1. Open `/auth/sign-in`; verify Royal Sapphire layout and centralized VoiceCloud logo.
2. Sign in with a valid email/password and valid username/password; verify both use the same consumer account flow.
3. Enter invalid credentials; verify backend error is shown without fake success.
4. Trigger backend lockout/restriction; verify `/auth/restricted` is used.
5. Register with display name, username, email and 8+ character password; verify navigation to onboarding.
6. Open `/auth/phone`, enter E.164 number, send OTP, then verify from `/auth/verify`.
7. In development mode, if the backend returns an OTP code, verify it is shown only as a development note.
8. Continue as Guest; verify header shows `Upgrade Guest` and `/auth/guest/upgrade` requires an authenticated guest.
9. Upgrade a guest through email/password; verify account ceases to be guest and onboarding opens.
10. From `/auth/sign-in`, choose `Creator Sign-In`; verify it goes directly to `/creator/login` (port 3000 when website Vite runs on port 3003), with no intermediate `/auth/creator` page; validate Creator Studio refuses a non-CREATOR account.
11. With Firebase web config absent, verify Google sign-in is disabled rather than fabricated.
12. With valid Firebase web config, verify Google popup returns Firebase ID token and backend completes login.
13. Expire/revoke refresh token, open a protected route, verify `/auth/session-expired` and re-auth path.
14. Complete onboarding interests/profile/language/reminders; verify profile/settings APIs persist data.
15. Run `scripts\website\VC-WEB-PH02-ACCEPTANCE.cmd` and require final PASS.
