# Login setup (Supabase + Google)

LMS address: **https://beyond-tatva-lms.vercel.app** (change these settings again when you move to a custom domain like learn.beyondtatva.in).

## 1. Supabase → Authentication → URL Configuration
- **Site URL:** `https://beyond-tatva-lms.vercel.app`
- **Redirect URLs** (add each):
  - `https://beyond-tatva-lms.vercel.app/**`
  - `http://localhost:3000/**`

## 2. Supabase → Authentication → Emails (templates)
Students type a 6-digit code (works even if they open the email on another phone). Paste into **both**
"Confirm signup" and "Magic Link":

Subject: `Your Beyond Tatva login code: {{ .Token }}`

```html
<h2>Your login code</h2>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Type this code on the Beyond Tatva login screen. It works for 1 hour.</p>
<p>Or tap: <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Log in to Beyond Tatva</a></p>
<p style="color:#64748b;font-size:12px">Didn't ask for this? Ignore this email.</p>
```

## 3. Google sign-in
**Google Cloud Console** (console.cloud.google.com), signed in as chiragudayashetty@gmail.com:
1. Create a project "Beyond Tatva".
2. APIs & Services → **OAuth consent screen**: External; app name "Beyond Tatva"; support email; logo optional;
   authorised domain `supabase.co` (and `beyondtatva.in` later). Scopes: leave the defaults (email, profile).
   Then **Publish app** → "In production" (otherwise only listed test users can sign in).
   Basic scopes need no Google review.
3. APIs & Services → **Credentials → Create credentials → OAuth client ID** → Web application:
   - Authorised JavaScript origins: `https://beyond-tatva-lms.vercel.app`
   - Authorised redirect URIs: `https://fpubcjcqpsjnafnmkkzo.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.

**Supabase → Authentication → Sign In / Providers → Google:** enable, paste the Client ID and secret, save.

## 4. Email sender (testing vs launch)
Supabase's free built-in sender only delivers to **members of your Supabase team** and only a few per hour.
Fine for you to test; students won't receive codes. Before students log in by email, add a custom SMTP sender
(Resend free tier: 3,000/month) under Authentication → Emails → SMTP Settings. Google sign-in has no such limit.

## 5. Phone login
Off until DLT registration (India). Turn on later with Supabase phone provider + `NEXT_PUBLIC_PHONE_LOGIN=1`.

## Test checklist
1. Open the LMS in Chrome (not inside WhatsApp/Instagram) → Continue with Google → chiragudayashetty@gmail.com → you land in **Studio**.
2. Log out → sign in with your email code (chiragshetty@beyondtatva.in) → Studio.
3. Ask a friend (any other Gmail) → Continue with Google → they get "Who are you?" → Student → Module 0 plays.
