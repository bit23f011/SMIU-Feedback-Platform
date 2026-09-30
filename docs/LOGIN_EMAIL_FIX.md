# Fixing "incorrect password" on the live site (email confirmation)

You reported: create an account, then sign in fails with "incorrect password" even
though the student ID and password are correct. Then: no confirmation email
arrived at all.

There were two separate problems. One is now fixed in code. The other is a
Supabase dashboard setup that only you can do, because it involves secrets and
your live domain.

## Problem 1 (fixed in code)

The sign-in action treated every failure as a wrong-password failure. But when an
account exists with the correct password and the email is simply not confirmed
yet, Supabase returns an "Email not confirmed" error, not a success. The old code
turned that into "That student ID and password do not match", which is misleading.

Now, that specific case sends the user to the "check your email" screen with a
clear message ("Your email is not confirmed yet. Your ID and password were
correct."), while genuinely wrong credentials still get one generic message.

You need to rebuild on Windows for this to take effect:

```
npm run build
npm start
```

## Problem 2 (you must set this up in the Supabase dashboard)

No confirmation email is being sent, so no one can finish signing up. The app
cannot send email itself; Supabase sends it, and Supabase needs three things set
correctly. All of this is in the dashboard for your PRODUCTION Supabase project.

### A. Point Supabase at your live domain

Authentication -> URL Configuration:

- Site URL: `https://<your-vercel-domain>`  (no trailing slash)
- Redirect URLs: add `https://<your-vercel-domain>/auth/callback`
  (keep `http://localhost:3000/auth/callback` too for local work)

If the callback URL is not on this allow-list, the confirmation link in the email
fails even when the email is sent.

### B. Make sure "Confirm email" is on

Authentication -> Providers -> Email: "Confirm email" should be enabled. (This is
the intended behaviour for ProfAura; the fix in Problem 1 depends on it.)

### C. Wire up Brevo SMTP so email actually sends

By default Supabase's built-in mailer is heavily rate limited and often does not
deliver at all. Use Brevo:

1. Create a Brevo account and generate an SMTP key.
2. Authentication -> SMTP Settings -> enable custom SMTP and enter:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: your Brevo login
   - Password: your Brevo SMTP key
   - Sender email: a verified from-address (verify the sender/domain in Brevo)
   - Sender name: `ProfAura`
3. Save, then use the "Send test email" option and confirm it arrives.

### D. Set the Vercel environment variable

Vercel -> your project -> Settings -> Environment Variables:

- `NEXT_PUBLIC_SITE_URL` = `https://<your-vercel-domain>`

This must match the Site URL from step A, because the confirmation link the app
requests is built from it. `NEXT_PUBLIC_*` values are baked in at build time, so
after adding it you must trigger a fresh deploy (redeploy), not just save.

## Immediate unblock for testing (no email needed)

While you set up SMTP, you can confirm an account by hand so you can log in now:

Supabase dashboard -> Authentication -> Users -> click the user -> Confirm email
(or use the row's menu). After that, sign-in works for that user immediately.

## How to tell which problem you are hitting

- If sign-in now shows "Your email is not confirmed yet" and an email did arrive:
  click the link, then sign in. Working as intended.
- If sign-in shows the same message but no email ever arrives: that is Problem 2,
  section C (SMTP). Fix that, or use the manual "Confirm email" unblock above.
- If sign-in still says the ID and password do not match after a rebuild, then the
  credentials genuinely do not match a stored account (for example the account was
  created against a different Supabase project than the live one is pointed at).
