import Link from "next/link";
import Shell from "@/components/shell/Shell";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import WorkshopsStudio from "./WorkshopsStudio";

export const metadata = { title: "Workshops · Studio · Beyond Tatva" };

export default async function WorkshopsPage() {
  const supabase = await createClient();
  const [{ data: workshops }, { data: registrations }, { data: schools }] = await Promise.all([
    supabase.from("workshops").select("id, slug, title, starts_at, venue, school_id, seats, published").order("starts_at", { ascending: false }),
    supabase.from("workshop_registrations").select("id, workshop_id, student_name, grade, parent_name, parent_phone, consent_at, attended_at, created_at").order("created_at", { ascending: false }),
    supabase.rpc("admin_schools"),
  ]);
  return <Shell roles={["admin"]}><PageTitle title="Workshops" subtitle="Create a workshop, share its signup link, and check in students on the day. Public sign-ups also appear in Pipeline.">
    <Link href="/admin/pipeline" className="btn-secondary min-h-11">View leads in Pipeline</Link>
  </PageTitle>
    <div className="space-y-5"><WorkshopsStudio workshops={workshops ?? []} registrations={registrations ?? []} schools={schools ?? []} />
      {!workshops?.length && <Card><Empty title="No workshops yet" body="Create a workshop to get a public signup page." /></Card>}</div>
  </Shell>;
}
