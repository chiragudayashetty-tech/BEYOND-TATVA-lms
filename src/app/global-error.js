"use client";

import { useEffect } from "react";

// Last-resort screen when the root layout itself fails. It replaces the layout, so it carries its own
// <html>, <body> and inline styles (globals.css and fonts may not have loaded).
export default function GlobalError({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a", padding: 16 }}>
        <title>Something went wrong · Beyond Tatva</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#475569", margin: "0 0 24px" }}>Beyond Tatva couldn&apos;t load. Check your internet and try again.</p>
          {error?.digest && <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 12 }}>Error code {error.digest}</p>}
          <button onClick={() => unstable_retry()} style={{ background: "#4F46E5", color: "#fff", border: 0, borderRadius: 12, padding: "12px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
