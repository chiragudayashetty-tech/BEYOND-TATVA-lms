"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share, SquarePlus, X } from "lucide-react";
import { useIsClient } from "@/lib/hooks";

const DISMISSED_UNTIL = "beyond-tatva-install-dismissed-until";
const DISMISSED_FOREVER = "beyond-tatva-install-dismissed-forever";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function isInstalled() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  } catch {
    return false;
  }
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const iosDevice = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(ua);
  return iosDevice && safari;
}

function isSuppressed() {
  if (readStorage(DISMISSED_FOREVER) === "yes") return true;
  const until = Number(readStorage(DISMISSED_UNTIL));
  return Number.isFinite(until) && until > Date.now();
}

export default function InstallPrompt() {
  const isClient = useIsClient();
  const [mode, setMode] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isClient) return;
    const visibilityTimer = window.setTimeout(() => {
      if (isInstalled()) setInstalled(true);
      else if (isSuppressed()) setHidden(true);
      else if (isIosSafari()) setMode("ios");
    }, 0);

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (isInstalled() || isSuppressed()) return;
      setDeferredPrompt(event);
      setMode("android");
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.clearTimeout(visibilityTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isClient]);

  if (!isClient || installed || hidden || !mode) return null;

  const dismissForThreeDays = () => {
    writeStorage(DISMISSED_UNTIL, String(Date.now() + THREE_DAYS));
    setHidden(true);
  };
  const dismissForever = () => {
    writeStorage(DISMISSED_FOREVER, "yes");
    setHidden(true);
  };

  async function install() {
    if (!deferredPrompt || busy) return;
    setBusy(true);
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (result?.outcome === "accepted") setInstalled(true);
      else dismissForThreeDays();
    } catch {
      setDeferredPrompt(null);
      dismissForThreeDays();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="install-prompt-title" className="card mb-5 overflow-hidden border-primary/20 bg-primary-soft p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="install-prompt-title" className="font-semibold">Add Beyond Tatva to your home screen</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Open your lessons faster, like an app. It takes just a moment.</p>
        </div>
        <button type="button" onClick={dismissForThreeDays} aria-label="Not now" className="btn-ghost -mr-2 -mt-2 h-9 w-9 shrink-0 p-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === "android" ? (
        <button type="button" disabled={busy} onClick={install} className="btn-primary mt-4 w-full sm:w-auto">
          <Download className="h-4 w-4" /> {busy ? "Opening install…" : "Install"}
        </button>
      ) : (
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <Share aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            <span><b>1.</b> Tap <b>Share</b> in Safari</span>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <SquarePlus aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            <span><b>2.</b> Tap <b>Add to Home Screen</b></span>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
            <span><b>3.</b> Tap <b>Add</b> to finish</span>
          </li>
        </ol>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <button type="button" onClick={dismissForThreeDays} className="font-medium text-muted underline-offset-2 hover:text-fg hover:underline">Not now</button>
        <button type="button" onClick={dismissForever} className="font-medium text-muted underline-offset-2 hover:text-fg hover:underline">Don&apos;t show again</button>
      </div>
    </section>
  );
}
