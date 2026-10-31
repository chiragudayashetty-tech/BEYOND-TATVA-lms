"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// false while server-rendering and hydrating, true after: for UI that depends on the device
// (local storage, the device's date). Avoids setState-in-effect and hydration mismatches.
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// The current time, ticking every second on the client; null on the server.
const tick = (cb) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
export function useNow() {
  return useSyncExternalStore(tick, () => Math.floor(Date.now() / 1000) * 1000, () => null);
}
