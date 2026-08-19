# VC-WEB-PH02-R02 Corrective Report

## Parent authority
- Protected website parent: `VoiceCloud-Backend-VC-WEB-PH01-R01`
- Exact parent commit: `87007f2b6779288393c71669e3c9b1e8cc82baf8`
- Backend R11 ancestor: `a9e581e23cb3554708eaf10741719d28da5c25ef`

## Trigger
The first workstation acceptance of PH02-R01 passed the PH01/PH02 source checks but correctly failed at `npm run typecheck:website` with seven TypeScript errors.

## Corrections
1. Added `website/src/vite-env.d.ts` so Vite's `ImportMeta.env` and the public Firebase browser keys are typed by the website TypeScript project.
2. Reworked `OtpVerifyPage.tsx` so nullable React Router navigation state is converted into stable `phoneNumber` / `referralCode` values before asynchronous OTP handlers use them.
3. Extended `web-ph02-source-check.mjs` with durable regression checks for both workstation findings.
4. Updated the acceptance success marker to `VC-WEB-PH02-R02`.

## Scope discipline
No backend controllers/services/entities/migrations, Admin implementation, Creator implementation, authentication API contract, or centralized branding authority was changed by this corrective revision.

## Acceptance required
Run `scripts\website\VC-WEB-PH02-ACCEPTANCE.cmd` on the workstation. R02 is accepted only when the TypeScript check, website build, R11 regression checks, and full monolith build all pass.
