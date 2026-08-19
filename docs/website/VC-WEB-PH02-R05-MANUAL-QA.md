# VC-WEB-PH02-R05 Manual QA — OTP Correction

1. Start the accepted local full application and open `/auth/phone`.
2. Submit a valid phone number and continue to `/auth/verify`.
3. Confirm all six OTP fields are visibly empty on first load.
4. Type one numeric digit in the first field; focus must advance to the next field.
5. Continue typing all six digits; each field must contain exactly one digit.
6. Use Backspace on a populated field; that digit must clear.
7. Use Backspace on an empty field; focus must move to the previous field and clear it.
8. Paste a six-digit OTP into the first field; the six digits must distribute across all fields.
9. Non-numeric input must not populate the fields.
10. `Verify & Continue` must remain disabled until six digits are present.
11. In local development/localhost only, the Development OTP note may be shown, but it must not auto-fill the six OTP inputs.
12. Click Resend after the cooldown. All OTP fields must clear and focus must return to the first field.
13. Enter the current valid OTP and verify that `/auth/phone/login` succeeds and the flow continues to onboarding/authenticated state.
14. Confirm the Development OTP note is not rendered when the site is accessed from a non-local production hostname.
