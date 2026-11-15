"use client";

import { useState } from "react";
import { Check, Download, Share2 } from "lucide-react";

// Download = the browser's "Save as PDF" (globals.css prints only the certificate, A4 landscape).
export default function CertificateActions({ code }) {
  const [copied, setCopied] = useState(false);
  const url = `https://learn.beyondtatva.in/verify/${code}`;
  async function share() {
    const text = "I finished the Beyond Tatva AI course! Check my certificate:";
    if (navigator.share) {
      try { await navigator.share({ title: "My AI Explorer certificate", text, url }); } catch { /* closed */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  return (
    <div className="mt-4 flex gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="btn-primary flex-1"><Download className="h-4 w-4" /> Download PDF</button>
      <button type="button" onClick={share} className="btn-secondary flex-1">
        {copied ? <><Check className="h-4 w-4" /> Link copied</> : <><Share2 className="h-4 w-4" /> Share</>}
      </button>
    </div>
  );
}
