// The Play Store app is this same site inside a Trusted Web Activity (Chrome without the address bar).
// Google Play does not allow selling a digital course in an app except through Play Billing (which takes
// a commission), so inside the app we show no price, no pay button and no pointer to another way to pay.
// Buying happens only in a normal browser; the app is for learning.
export const ANDROID_PACKAGE = process.env.NEXT_PUBLIC_ANDROID_PACKAGE || "in.beyondtatva.app";

// The app's Play Store page. Empty until the app is public; then Android phones in the browser are offered it.
const playUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "";
export const PLAY_STORE_URL = playUrl.startsWith("https://play.google.com/store/apps/") ? playUrl : null;

// Runs in <head> before first paint. The app is recognised by its referrer on launch (android-app://<package>)
// or by its start URL (/?app=android), then remembered for this tab only. sessionStorage, not a cookie or
// localStorage: those are shared with Chrome on the same phone, and Chrome must keep showing the pay page.
// Elements marked `web-only` / `app-only` (globals.css) then show or hide with no flash.
export const inAppScript = `try{var s=sessionStorage;if(document.referrer.indexOf("android-app://${ANDROID_PACKAGE}")===0||/[?&]app=android(&|$)/.test(location.search))s.setItem("bt-app","1");if(s.getItem("bt-app"))document.documentElement.classList.add("in-app")}catch(e){}`;

// For click handlers in client components.
export const isInApp = () => typeof document !== "undefined" && document.documentElement.classList.contains("in-app");

// Digital Asset Links: proves to Android that the app and this site have the same owner, which removes the
// browser bar. Fingerprints are the SHA-256 of the app signing key (Play Console → App integrity), comma separated.
export function assetLinks(fingerprints = process.env.ANDROID_SHA256_FINGERPRINTS) {
  const prints = (fingerprints || "").split(",").map((f) => f.trim().toUpperCase()).filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  if (!prints.length) return [];
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: prints },
  }];
}
