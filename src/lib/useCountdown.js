"use client";

import { useEffect, useState } from "react";

// Seconds left before an action (like "Resend code") is allowed again. start(60) begins a 60s wait.
export function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}
