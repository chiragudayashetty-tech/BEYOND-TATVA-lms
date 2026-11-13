import { NextResponse } from "next/server";
import { bunnyMp4Url, offlineQualities } from "@/lib/bunny";
import { parseVideo } from "@/lib/video";
import { createClient, isPreview } from "@/lib/supabase/server";

// GET /api/lesson-download?lesson=<id>[&check=1]
// The link a signed-in student's app downloads a lesson from, to watch it without internet.
// Access is the same rule as watching: lesson_media is only readable when can_watch_lesson() says yes.
// Bunny links are signed here and last 6 hours; the app asks again when one runs out.
// check=1 only answers "may this student still keep the lesson?" (used to clear downloads after access ends).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

// Size of the file, or null when it isn't there (or the CDN doesn't say).
async function sizeOf(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return Number(res.headers.get("content-length")) || 0;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const lessonId = params.get("lesson") ?? "";
  const checkOnly = params.get("check") === "1";
  if (!UUID.test(lessonId)) return json({ error: "bad_request" }, 400);

  // Local design preview has no real student: hand out the demo clip so the screens can be tried.
  if (isPreview) return json(checkOnly ? { ok: true } : { url: "/media/lesson1.mp4", size: 0, quality: 720 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return json({ error: "signed_out" }, 401);

  const { data, error } = await supabase.from("lesson_media").select("video_url").eq("lesson_id", lessonId).maybeSingle();
  if (error) return json({ error: "try_again" }, 503);
  if (!data?.video_url) return json({ error: "no_access" }, 403);
  if (checkOnly) return json({ ok: true });

  const video = parseVideo(data.video_url);
  if (video?.kind === "file") {
    const size = video.src.startsWith("/") ? 0 : await sizeOf(video.src);
    return json({ url: video.src, size: size ?? 0, quality: null });
  }
  const host = process.env.BUNNY_CDN_HOST;
  if (video?.kind !== "bunny" || !host) return json({ error: "not_ready" }, 409);

  // Without a token key the MP4 link is public and permanent, so one shared link would leak a paid module.
  // Only free modules may be downloaded that way.
  const key = process.env.BUNNY_CDN_TOKEN_KEY;
  if (!key) {
    const { data: lesson } = await supabase.from("lessons").select("chapters(is_free)").eq("id", lessonId).maybeSingle();
    if (!lesson?.chapters?.is_free) return json({ error: "not_ready" }, 409);
  }

  for (const quality of offlineQualities(process.env.OFFLINE_VIDEO_QUALITY)) {
    const url = bunnyMp4Url({ host, videoId: video.id, quality, key });
    if (!url) break;
    const size = await sizeOf(url);
    if (size !== null) return json({ url, size, quality });
  }
  return json({ error: "not_ready" }, 409);
}
