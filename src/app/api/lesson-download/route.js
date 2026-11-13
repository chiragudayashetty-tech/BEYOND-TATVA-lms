import { NextResponse } from "next/server";
import { getLessonVideo } from "@/lib/data";
import { parseVideo } from "@/lib/video";
import { bunnyDownloadUrl } from "@/lib/bunny-download";

// GET /api/lesson-download?lesson=<lesson id>: sends a student who may watch the lesson to a short-lived download link.
// Access is the same as watching: getLessonVideo reads lesson_media under RLS, so anyone without access gets 404.
export async function GET(request) {
  const lesson = new URL(request.url).searchParams.get("lesson") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(lesson)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const video = parseVideo(await getLessonVideo(lesson));
  let url = null;
  if (video?.kind === "file") url = video.src;
  else if (video?.kind === "bunny") url = bunnyDownloadUrl(video.id, { host: process.env.BUNNY_CDN_HOST, tokenKey: process.env.BUNNY_CDN_TOKEN_KEY });
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 302, headers: { location: url, "cache-control": "private, no-store" } });
}
