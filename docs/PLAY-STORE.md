# Play Store app: checklist

**Decision (Chirag, 2026-11-10):** put the LMS on Google Play, with **no payment inside the app** so Google takes no
commission. The app is the same site (`learn.beyondtatva.in`) inside a Trusted Web Activity (TWA): Chrome without the
address bar. No second codebase; every deploy to Vercel updates the app at once.

## The rule we are working inside
- A course of recorded lessons is a "digital good". Selling it inside an Android app means Google Play Billing
  (commission). India's "alternative billing" still pays Google a fee (about 4 points less), so Razorpay inside the
  app is **not** a way out.
- Google allows a **"consumption-only" app**: people use what they bought elsewhere. The app may not show a pay
  button, and may not say or link to where to pay. So inside the app: no price, no Razorpay, no "Pay via WhatsApp",
  no "buy on our website". Only "You can't buy the course in this app."
- Buying stays where it is today: `/unlock` in a normal browser. Same login, so the course then opens in the app.
- Policy moves (US/EU got external-link programmes in 2025–26, with fees). **Before submitting, re-read Google's
  Payments policy page**: https://support.google.com/googleplay/android-developer/answer/10281818

**Cost of this choice:** someone who finds the app on Play first cannot buy in it. That is fine while sales come from
school workshops and WhatsApp links (which open the browser). The Play listing is for students who already joined,
not a sales channel.

## A. Code (done in this branch)
- [x] App detection: `src/lib/android-app.js` marks the page `in-app` when opened from our package
      (`android-app://in.beyondtatva.app`) or with `/?app=android`. Remembered per tab only, so Chrome on the same
      phone still shows the pay page. Links opened from WhatsApp/Instagram are **not** treated as the app.
- [x] Inside the app, hidden (`web-only`): price, "Pay online" card, coupon, Pay via WhatsApp, "Get the full course",
      "Unlock for ₹…", the "pay on the website" help answer, the "add to home screen" help answer.
      Shown instead (`app-only`): "You can't buy the course in this app." Access keys still work. The pay function
      also refuses to run in the app.
- [x] `/.well-known/assetlinks.json` (public), filled from `ANDROID_SHA256_FINGERPRINTS`.
- [x] `/delete-account` (public, no sign-in): how to ask for account deletion. Linked from Profile and Help.
- [x] Manifest: description, language, category.
- [x] "Get the Beyond Tatva app" card on the student home page for Android phones in the browser (never inside
      the app). Off until `NEXT_PUBLIC_PLAY_STORE_URL` is set in Vercel; it then replaces "Add to home screen".
- [x] Tests: `tests/android-app.test.mjs`.

## How people move between browser and app
- **Paid in the browser, no app yet:** the home page card above, the WhatsApp welcome message and the website
  point to the Play link.
- **Has the app, has not paid:** the app says nothing about paying (Google's rule). The nudge happens outside the
  app: Studio → **Today** and **Pipeline → "Finished Module 0"** list these families with a WhatsApp button; send
  the browser pay link there. Workshop handouts carry the pay link/QR. School keys work inside the app.

## B. Chirag: accounts and decisions (only you can do these)
- [ ] **Open a Play Console developer account** (one-time US$25; ID + address check takes a few days. Start today.)
      - *Personal* account: before going public, a **closed test with 12 testers for 14 days in a row** is required.
      - *Organisation* account: no tester rule, but needs a D-U-N-S number (free, can take weeks in India).
      - Recommendation: personal account now. The 12 testers are the pilot families + team, and the 14 days double
        as the real-phone testing in `docs/TESTING.md`.
- [ ] **Confirm the package name `in.beyondtatva.app`.** It can never be changed after the first upload.
- [ ] **Confirm the 30-day promise** on `/delete-account` (and that the email on it is right).
- [ ] **Make a reviewer login**: a Google account made only for this (no 2-step verification), signed in once,
      onboarded as a student, full access granted from Studio. Google's reviewer cannot use an email link or
      WhatsApp code. Put the email + password in Play Console → App access.
- [ ] Check the privacy policy (https://www.beyondtatva.in/privacy) covers the LMS: profile, progress, uploaded
      assignment files, parent phone number. Add a line pointing to `learn.beyondtatva.in/delete-account`.

## C. The app file (built 2026-11-11, version 1.0.0)
The Android project is in `android/` (see `android/README.md`). Chirag has the signed `app-release.aab`, a test
`.apk`, and the upload key + password (kept out of git).

- [x] Android project, icons from the dark logo, signed `.aab` for Play and `.apk` for testing.
- [ ] **Chirag: store the upload key file and its password** in a password manager + one offline copy. Losing
      them means asking Google to reset the upload key.
- [ ] Merge and deploy this branch **before** anyone outside the team gets the app (until then the live site
      still shows prices inside it).
- [ ] In Vercel set `ANDROID_SHA256_FINGERPRINTS` to the upload key's SHA-256 and redeploy:
      `E6:D2:57:84:7D:D8:3C:48:2D:CA:C4:CE:65:04:BF:B2:7A:C5:92:93:1B:01:8C:DB:6F:7E:46:47:E1:5D:96:CB`
- [ ] Install the test `.apk` on an Android phone: there must be **no browser bar** at the top.
- [ ] Play Console → Create app → Testing → Closed testing → upload the `.aab`. Accept "Play App Signing".
- [ ] Play Console → Test and release → App integrity → App signing: copy the **SHA-256 of the app signing key**,
      add it to `ANDROID_SHA256_FINGERPRINTS` after the first one (comma separated), redeploy.
- [ ] Check `https://learn.beyondtatva.in/.well-known/assetlinks.json` lists both.

## D. Play Console forms
- [ ] **Store listing:** name "Beyond Tatva"; short description (80 chars) e.g. "AI course for Grades 8–10: lessons,
      quizzes, projects and a certificate."; full description; 512×512 icon (`android/store/play-icon-512.png`); 1024×500 feature graphic; at least 4
      phone screenshots (dashboard, course, lesson, quiz). No prices and no "buy on our website" in the listing text.
- [ ] **Category:** Education. **Ads:** No. **Price:** Free.
- [ ] **Target age:** 13–15, 16–17, 18+. Do **not** tick under 13 (that brings the Families policy). Risk: some
      Grade 8 students are 12; Google may ask. Parent consent at sign-up is already in the LMS.
- [ ] **Content rating** questionnaire: education, no violence; the leaderboard shows first names to classmates
      (answer "users can interact: no", "shares user info with others: limited/name only" as the form words it).
- [ ] **Data safety:** collected: name, email, phone number (parent's), files and photos (assignments), app
      activity (progress, quiz results). Not shared with third parties for ads. Encrypted in transit: yes.
      Deletion: yes, URL `https://learn.beyondtatva.in/delete-account`. Payment info: not collected in the app.
- [ ] **Privacy policy URL:** `https://www.beyondtatva.in/privacy`.
- [ ] **App access:** "All or some functionality is restricted" → the reviewer login from B.
- [ ] **Note to the reviewer:** "This app does not sell anything. Module 0 is free for every account. The other
      modules open for accounts that already have access (for example through a school access key)."

## E. Test before sending for review (on the closed-test build)
- [ ] No browser bar. Google sign-in works. Back button behaves.
- [ ] A free account sees **no price and no pay button anywhere**: home, course, a locked lesson, Unlock, Help.
- [ ] The same phone in Chrome **still shows** the price and Razorpay on `/unlock`.
- [ ] Pay in Chrome → open the app → the course is unlocked.
- [ ] A school access key works inside the app.
- [ ] Video plays full screen; assignment photo upload works.

## F. Release
- [ ] 12 testers opted in for 14 days → apply for production access → send for review (usually a few days).
- [ ] After approval: set `NEXT_PUBLIC_PLAY_STORE_URL` in Vercel and redeploy; put the Play link on the website
      and in the WhatsApp welcome message.

## Known risks
- **Access key box in the app.** Keys from schools are fine. If a reviewer reads it as a way around Play Billing,
  hide the key box in the app too (keys can still be entered in the browser). One-line change.
- **Rejection for "webview of a website / minimal functionality"** happens with thin apps. Ours has login, video,
  quizzes, uploads and certificates, so the risk is low.
- **iPhone:** not covered. Apple's rules are stricter; the "Add to Home Screen" PWA stays the iPhone route.
