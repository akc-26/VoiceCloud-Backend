# VC-WEB-PH04-R03 Correction Report

## Trigger
During manual QA, a signed-in user's own profile was correctly removed from recommendations but still appeared when that same username/display name was searched on `/search`.

## Root cause
`SearchPage.tsx` called the centralized `visibleConsumerUsers(...)` helper without providing the signed-in user identity. The helper could therefore remove backend-only/guest accounts but had no identity against which to perform self-exclusion.

## Correction
- Search results pass the full authenticated viewer identity into the centralized visibility helper.
- The helper now compares both `id` and normalized `username` for defense in depth.
- `UserCard` independently refuses to render self/backend-only/guest identities so a future caller cannot accidentally expose them by omitting a list-level filter.
- Home, Explore, People, Friends, Followers/Following and Search use the same centralized viewer-aware discovery policy.
- Community member directory uses the non-discovery consumer-visibility rule to hide platform administration/guest identities without hiding the current user's legitimate community membership.

## Consumer visibility rule
- Consumer-visible roles: `USER`, `CREATOR`.
- Backend-only/admin/moderation roles are not consumer people identities.
- Guest identities are not public people identities.
- The signed-in user's own identity is excluded from discovery, recommendation, suggestion and people-search result sets.

## Scope
No new business functionality, schema, migration, Admin UI, Creator UI or branding authority was introduced.
