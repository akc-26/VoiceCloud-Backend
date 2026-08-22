# VC-WEB-PH05-R14 Manual QA — LiveKit Browser SDK Production Loading

Authoritative parent: `VC-WEB-PH05-R13` / `cbaab4b719369d3c0cb6fd7dadaa13ab94058e5b`

## Automated acceptance

Run from the extracted repository root on Windows:

```bat
scripts\website\VC-WEB-PH05-ACCEPTANCE.cmd
```

Required final line:

```text
[PASS] VC-WEB-PH05-R14 acceptance commands completed successfully.
```

## Runtime QA

1. Start/deploy the application using the same production-style configuration used for beta-pi.
2. Sign in to the consumer website with a normal user.
3. Open a room whose Creator host has already started a LiveKit broadcast.
4. Click Join/Enter Room.
5. Expected: the room experience loads without `Unable to load LiveKit browser SDK from https://cdn.jsdelivr.net/...`.
6. Expected: browser Network/Console does not show a CSP refusal for `cdn.jsdelivr.net`.
7. Expected: LiveKit SDK request is permitted by the production CSP and RTC proceeds to the LiveKit server connection stage.
8. Expected: listener audio connects; if browser autoplay blocks playback, VoiceCloud shows the existing Enable Audio control instead of an SDK-load error.
9. Verify Creator Studio can still enter/manage the same live room and host microphone behavior remains unchanged.
10. Verify production response headers still contain Content-Security-Policy and do not contain wildcard script sources or `unsafe-eval`.

## Header spot-check

For a production-served website response, CSP should include:

```text
script-src 'self' https://cdn.jsdelivr.net
```

This correction intentionally does not disable CSP.
