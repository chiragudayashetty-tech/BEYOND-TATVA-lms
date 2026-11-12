# Beyond Tatva Android app (Play Store)

The app is `https://learn.beyondtatva.in` inside a Trusted Web Activity: Chrome without the address bar.
There is no app code, only settings. A deploy of the LMS updates the app at once; a new upload to Play is only
needed to change the name, icon, colours or Android version targets. Full checklist: `docs/PLAY-STORE.md`.

- Package: `in.beyondtatva.app` (permanent once uploaded). Start URL: `/?app=android` (the site then hides prices
  and payment).
- Links to learn.beyondtatva.in do **not** open in the app on purpose: WhatsApp pay links must open the browser.
- Icons: all made from `store/logo-source.png` by `python3 android/make-icons.py` (run from the repo root).
  `store/play-icon-512.png` is the icon for the Play Console listing.

## Build
Needs JDK 17+, Gradle 8.13+ and the Android SDK (platform 36, build-tools 36).

1. `android/local.properties`: `sdk.dir=/path/to/android-sdk`
2. `android/keystore.properties` (never in git):
   ```
   storeFile=/path/to/beyond-tatva-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
3. In `app/build.gradle` add 1 to `versionCode` for every upload.
4. `cd android && gradle :app:bundleRelease` → `app/build/outputs/bundle/release/app-release.aab` (for Play).
   `gradle :app:assembleRelease` → an `.apk` to install straight on a phone for testing.

## Signing
The upload key (`beyond-tatva-upload.jks`) and its password are with Chirag only. Its SHA-256:
`E6:D2:57:84:7D:D8:3C:48:2D:CA:C4:CE:65:04:BF:B2:7A:C5:92:93:1B:01:8C:DB:6F:7E:46:47:E1:5D:96:CB`
Play re-signs the app with its own key; that fingerprint is in Play Console → App integrity. Both go in
`ANDROID_SHA256_FINGERPRINTS` on Vercel (comma separated), or the app shows a browser bar.
