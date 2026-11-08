import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse, getModuleResources, getNewsletters } from "@/lib/data";
import { nextFirstSunday } from "@/lib/first-sunday";
import NewsletterManager from "./NewsletterManager";
import { createClient } from "@/lib/supabase/server";
import ContentEditor from "./ContentEditor";

export const metadata = { title: "Content · Admin · Beyond Tatva" };

export default async function ContentPage() {
  const [course, supabase, resources, newsletters] = await Promise.all([getCourse(), createClient(), getModuleResources(), getNewsletters()]);
  const next = nextFirstSunday();
  const nextDate = next ? `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}` : "";
  // Admins can read every video link; for anyone else this returns only what they may watch.
  const { data } = await supabase.from("lesson_media").select("lesson_id, video_url");
  const videos = Object.fromEntries((data ?? []).map((r) => [r.lesson_id, r.video_url]));
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Content" subtitle="Modules premiere on their date and time. Changes go live as soon as you save." />
      <NewsletterManager issues={newsletters} defaultDate={nextDate} />
      <ContentEditor course={course} videos={videos} resources={resources} />
    </Shell>
  );
}
