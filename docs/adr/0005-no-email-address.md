# No email address: login with Nickname, reset with recovery codes

The team does not want to send email. So the app stores no email address at all. Users log in
with Nickname + password. At registration the app shows one-time recovery codes; a password reset
needs the Nickname plus one recovery code, or the current code from the authenticator app (MFA).
A user who loses both cannot recover the account and must register again. Reasons: no email
provider to set up (AWS SES sandbox approval, or one more processor in the privacy policy), and
less personal data stored (DSGVO).

## Consequences

- The app cannot contact users outside the app; all messages are Notifications.
- No email verification, so the captcha (Cloudflare Turnstile) and rate limits are the only
  protection against mass registration.
