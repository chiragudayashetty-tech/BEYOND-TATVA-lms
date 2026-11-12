"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share } from "lucide-react";
import { useIsClient } from "@/lib/hooks";
import { isInApp, PLAY_STORE_URL } from "@/lib/android-app";

const DISMISSED_KEY = "bt-install-prompt-dismissed";
const INSTALLED_KEY = "bt-install-prompt-installed";
// Once the Play Store app is live (NEXT_PUBLIC_PLAY_STORE_URL), Android phones are offered that instead of
// "Add to home screen". Its own key, so someone who said "Not now" to the old prompt still hears about the app.
const PLAY_DISMISSED_KEY = "bt-play-prompt-dismissed";

function isPhone() {
  const ua = navigator.userAgent;
  return /Android.*Mobile|iPhone|iPod/i.test(ua);
}

function isInstalled() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function InstallPrompt() {
  const isClient = useIsClient();
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const isIOS = isClient && /iPhone|iPod/i.test(navigator.userAgent);

  const play = isClient && !isIOS && PLAY_STORE_URL ? PLAY_STORE_URL : null;

  useEffect(() => {
    if (!isPhone() || isInApp()) return;
    if (PLAY_STORE_URL && !isIOS) {
      if (isInstalled()) return;
      try { if (localStorage.getItem(PLAY_DISMISSED_KEY)) return; } catch {}
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    if (isInstalled()) {
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
      return;
    }
    try {
      if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(INSTALLED_KEY)) return;
    } catch {}

    const onInstalled = () => {
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
      setVisible(false);
    };
    const onPrompt = (event) => {
      event.preventDefault();
      window.__btInstallPrompt = event;
      setInstallEvent(event);
      setVisible(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (isIOS) {
      const guideTimer = window.setTimeout(() => setVisible(true), 0);
      return () => {
        window.clearTimeout(guideTimer);
        window.removeEventListener("appinstalled", onInstalled);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    } else if (window.__btInstallPrompt) onPrompt(window.__btInstallPrompt);
    else {
      const fallback = window.setTimeout(() => setVisible(true), 3000);
      return () => {
        window.clearTimeout(fallback);
        window.removeEventListener("appinstalled", onInstalled);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, [isIOS]);

  function dismiss() {
    try { localStorage.setItem(play ? PLAY_DISMISSED_KEY : DISMISSED_KEY, "1"); } catch {}
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    window.__btInstallPrompt = null;
    const choice = await installEvent.userChoice;
    if (choice?.outcome === "accepted") {
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
    }
    setInstallEvent(null);
    setVisible(false);
  }

  if (!isClient || !visible) return null;

  if (play) {
    return (
      <section className="card mb-5 flex flex-col gap-4 border-primary/20 bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Get the Beyond Tatva app">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg"><Download className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="font-semibold">Get the Beyond Tatva app</h2>
            <p className="mt-1 text-sm text-muted">Free on Google Play. Sign in with this same login and your course is there.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <a href={play} target="_blank" rel="noopener noreferrer" onClick={() => dismiss()} className="btn-primary">Get the app</a>
          <button type="button" onClick={() => dismiss()} className="btn-secondary">Not now</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card mb-5 flex flex-col gap-4 border-primary/20 bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Install Beyond Tatva">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg"><Download className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="font-semibold">Add Beyond Tatva to your home screen</h2>
          {installEvent ? (
            <p className="mt-1 text-sm text-muted">Open your lessons faster, like an app.</p>
          ) : isIOS ? (
            <ol className="mt-2 space-y-1 text-sm text-muted">
              <li className="flex items-center gap-2"><Share className="h-4 w-4 shrink-0" /> Tap Share in Safari.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" /> Tap Add.</li>
            </ol>
          ) : (
            <p className="mt-1 text-sm text-muted">Open your browser menu ⋮ and tap “Add to Home screen” or “Install app”.</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {installEvent && <button type="button" onClick={install} className="btn-primary">Install</button>}
        <button type="button" onClick={() => dismiss()} className="btn-secondary">Not now</button>
      </div>
    </section>
  );
}
