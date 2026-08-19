# White-label branding

This directory is the single presentation-branding source for the VoiceCloud web surfaces.

## Change a brand

1. Edit `shared/branding/index.ts` for the customer-facing name, product labels, support contact and core Admin/Creator/Website palette.
2. Replace the files under `shared/branding/public/brand/` while keeping their filenames, or update the asset paths in the config.
3. Run the branding checks and the normal full build/tests before release.

The three Vite applications copy the same `public/brand` directory into their own build outputs. The branding layer must not contain API endpoints, authorization rules, financial values, routing rules or persistence settings.

Technical identifiers such as JWT issuer/audience, database names, package names, migration names and compatibility local-storage keys are intentionally not controlled here. Changing those requires a separate compatibility/security migration, not a visual rebrand.
