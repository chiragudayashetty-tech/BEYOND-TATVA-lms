import Shell from "@/components/shell/Shell";
import { Card, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import WorkshopSignup from "./WorkshopSignup";

export const metadata = { title: "Workshop · Beyond Tatva" };

export default async function WorkshopPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_workshop", { p_slug: slug });
  const workshop = data?.title ? data : null;
  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8 sm:px-6">
    <PageTitle title="Beyond Tatva workshop" subtitle="A hands-on AI workshop for students in Grades 8–10." />
    {!workshop ? <Card><p className="text-sm text-muted">Workshop not found.</p></Card> : <>
      <Card className="mb-4">
        <h2 className="text-xl font-semibold">{workshop.title}</h2>
        <p className="mt-2 text-sm text-muted">{new Date(workshop.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })}</p>
        {workshop.venue && <p className="mt-1 text-sm text-muted">{workshop.venue}</p>}
        <p className="mt-3 text-sm">{workshop.open && workshop.seats_left > 0 ? `${workshop.seats_left} seat${workshop.seats_left === 1 ? "" : "s"} left` : "Registration is closed."}</p>
      </Card>
      {error ? <Card><p className="text-sm text-danger">Could not load this workshop. Please try again later.</p></Card> : <WorkshopSignup slug={slug} open={workshop.open && workshop.seats_left > 0} />}
    </>}
  </main>;
}
