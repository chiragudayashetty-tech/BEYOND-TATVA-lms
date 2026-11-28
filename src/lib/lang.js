"use client";

// Language for the sign-in page and the first-time tour: "en" or "kn" (ಕನ್ನಡ). The rest of the LMS is English.
// Same key as the website (bt_lang). A link can also pass ?lang=kn.
const KEY = "bt_lang";

export function readLang() {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "kn" || q === "en") { localStorage.setItem(KEY, q); return q; }
    return localStorage.getItem(KEY) === "kn" ? "kn" : "en";
  } catch { return "en"; }
}

export function saveLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch {}
}
