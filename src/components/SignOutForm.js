"use client";

import { createClient } from "@/lib/supabase/client";
import { forgetDevice } from "@/lib/offline";

// Log out: first save unsent offline watch time, then forget this device's downloads and saved Downloads page
// (shared family phones), then the normal server sign-out. If anything fails, sign-out still happens.
export default function SignOutForm({ children, className }) {
  async function onSubmit(e) {
    const form = e.currentTarget;
    if (form.dataset.cleared) return;
    e.preventDefault();
    try { await forgetDevice(createClient()); } catch {}
    form.dataset.cleared = "1";
    form.submit();
  }
  return (
    <form action="/auth/signout" method="post" onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
