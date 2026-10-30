import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import ContentEditor from "./ContentEditor";

export const metadata = { title: "Content · Admin · Beyond Tatva" };

export default async function ContentPage() {
  const [course, supabase] = await Promise.all([getCourse(), createClient()]);
  // Admins can read every video link; for anyone else this returns only what they may watch.
  const { data } = await supabase.from("lesson_media").select("lesson_id, video_url");
  const videos = Object.fromEntries((data ?? []).map((r) => [r.lesson_id, r.video_url]));
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Content" subtitle="Modules premiere on their date and time. Changes go live as soon as you save." />
      <ContentEditor course={course} videos={videos} />
    </Shell>
  );
}
