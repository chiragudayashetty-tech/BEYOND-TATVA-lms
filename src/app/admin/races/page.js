import { Flag } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { EndRaceButton, SchoolBatchRow, StartRaceForm } from "./RaceForms";

export const metadata = { title: "Class races · Admin · Beyond Tatva" };

const when = (d) => new Date(d).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const TONE = { live: "success", upcoming: "primary", ended: "neutral" };
const LABEL = { live: "Live", upcoming: "Upcoming", ended: "Ended (result shown 3 days)" };

export default async function RacesPage() {
  const supabase = await createClient();
  const [{ data: races, error }, { data: schools }, { data: batches }] = await Promise.all([supabase.rpc("admin_races"), supabase.rpc("admin_schools"), supabase.rpc("admin_school_batches")]);
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Races and batches" subtitle="After a workshop: set the school&apos;s batch start and start a class race. Its students see which class leads on Module 0 watched and on enrolments." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Start a race"><StartRaceForm schools={schools ?? []} /></Card>
        <Card title="Races" pad={false}>
          {error && <p role="alert" className="m-5 text-sm text-danger">Races could not load. Try again.</p>}
          {races?.length ? (
            <ul className="divide-y divide-border">
              {races.map((r) => (
                <li key={r.school_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{r.school} <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge></p>
                    <p className="text-sm text-muted">{when(r.starts_at)} → {when(r.ends_at)}</p>
                  </div>
                  <EndRaceButton schoolId={r.school_id} live={r.status === "live"} />
                </li>
              ))}
            </ul>
          ) : !error && <div className="p-5"><Empty icon={Flag} title="No races yet" body="Start one for the school you just ran a workshop at." /></div>}
        </Card>
      </div>
      <Card title="School batches" className="mt-6" pad={false}
        action={<span className="text-xs text-muted">Module 1 opens at this time (IST), then one module every week</span>}>
        <p className="px-5 pt-4 text-sm text-muted">One school = one batch. Every student of the school gets the same dates, however late they join. Clear the date to go back to weekly batches by join date.</p>
        {batches?.length ? <div className="divide-y divide-border">{batches.map((s) => <SchoolBatchRow key={s.id} school={s} />)}</div>
          : <div className="p-5"><Empty title="No schools yet" body="Add a school in Schools and people." /></div>}
      </Card>
    </Shell>
  );
}
