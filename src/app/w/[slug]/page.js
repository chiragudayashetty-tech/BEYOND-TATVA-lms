import { CalendarDays, MapPin } from "lucide-react";
import Logo from "@/components/Logo";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import WorkshopSignup from "./WorkshopSignup";

export const metadata = { title: "Workshop · Beyond Tatva" };

export default async function WorkshopPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_workshop", { p_slug: slug });
  const workshop = data?.title ? data : null;
  const when = workshop && new Date(workshop.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
  const open = workshop?.open && workshop.seats_left > 0;
  return <main className="mx-auto min-h-screen w-full max-w-xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
    <Logo />
    {!workshop ? <Card><p className="text-sm text-muted">Workshop not found. Check the link you were sent.</p></Card> : <>
      <section className="space-y-3 rounded-3xl bg-primary p-5 text-primary-fg sm:p-6">
        <span className="inline-block rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-[#1e1b3a]">WORKSHOP · GRADES 8–10</span>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{workshop.title}</h1>
        <p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{when}</p>
        {workshop.venue && <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{workshop.venue}</p>}
      </section>
      <div className={`flex items-center gap-3 rounded-2xl p-4 ${open ? "bg-warning-soft" : "bg-surface-2"}`}>
        {open ? <><span className="text-2xl font-bold text-warning">{workshop.seats_left}</span><span className="text-sm font-semibold">seat{workshop.seats_left === 1 ? "" : "s"} left</span></> : <span className="text-sm font-semibold">Registration is closed.</span>}
      </div>
      {error ? <Card><p className="text-sm text-danger">Could not load this workshop. Please try again later.</p></Card> : <WorkshopSignup slug={slug} open={open} />}
    </>}
  </main>;
}
