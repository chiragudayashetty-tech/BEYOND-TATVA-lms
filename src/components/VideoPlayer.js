"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, RotateCcw, RotateCw, TriangleAlert, Volume2, VolumeX, Zap } from "lucide-react";
import { parseVideo } from "@/lib/video";

// In-video questions for the demo footage. Admin-authored checkpoints per lesson come later.
const DEMO_VIDEO = "/media/lesson1.mp4";
const DEMO_CHECKPOINTS = [
  {
    at: 58,
    question: "Which AI tool can you use for this study method?",
    options: ["Only ChatGPT", "ChatGPT, or Gemini works too", "Neither, use Google search"],
    answer: 1,
    explain: "Both work. Use whichever one your family already has.",
  },
  {
    at: 125,
    question: "Should you write the rice example in your exam answer?",
    options: ["Yes, examiners love it", "No, it's for your brain, not your answer sheet"],
    answer: 1,
    explain: "Everyday examples help you understand. In the exam, write the textbook definition.",
  },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [1, 1.25, 1.5, 0.75];

function NativePlayer({ src, onAnswer, onProgress }) {
  const CHECKPOINTS = src === DEMO_VIDEO ? DEMO_CHECKPOINTS : [];
  const video = useRef(null);
  const box = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [answered, setAnswered] = useState([]);
  const [failed, setFailed] = useState(false);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v || question) return;
    if (v.paused) v.play(); else v.pause();
  }, [question]);

  const seek = (s) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, s)); };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.code === "Space" || e.key === "k") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight" || e.key === "l") seek((video.current?.currentTime ?? 0) + 10);
      if (e.key === "ArrowLeft" || e.key === "j") seek((video.current?.currentTime ?? 0) - 10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const onTime = () => {
    const v = video.current;
    setT(v.currentTime);
    if (v.duration) onProgress?.(v.currentTime, v.duration);
    const cp = CHECKPOINTS.find((c) => v.currentTime >= c.at && v.currentTime < c.at + 1 && !answered.includes(c.at));
    if (cp) { v.pause(); setQuestion(cp); setPicked(null); }
  };

  const pick = (i) => { setPicked(i); onAnswer?.(question.question, i === question.answer); };
  const resume = () => { setAnswered((a) => [...a, question.at]); setQuestion(null); video.current?.play(); };
  const cycleSpeed = () => { const n = (speed + 1) % SPEEDS.length; setSpeed(n); if (video.current) video.current.playbackRate = SPEEDS[n]; };

  if (failed) return <Notice title="This video won't play" body="Check your internet and reload. If it keeps happening, tell your teacher which lesson it is." />;

  return (
    <div ref={box} className="group relative aspect-video overflow-hidden rounded-2xl bg-black">
      <video
        ref={video}
        src={src}
        poster={src === DEMO_VIDEO ? "/media/lesson1-poster.jpg" : undefined}
        playsInline
        preload="metadata"
        muted={muted}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTime}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />

      {!playing && !question && (
        <button onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white text-[#0f172a] shadow-xl transition hover:scale-105">
          <Play className="ml-1 h-7 w-7" fill="currentColor" />
        </button>
      )}

      {question && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-md animate-[pop_.2s_ease-out] rounded-2xl bg-surface p-5 text-fg shadow-2xl sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Zap className="h-3.5 w-3.5" /> Quick check · +10 XP</div>
            <p className="mt-2 font-semibold sm:text-lg">{question.question}</p>
            <div className="mt-4 space-y-2">
              {question.options.map((o, i) => {
                const state = picked === null ? "border-border hover:border-primary hover:bg-primary-soft"
                  : i === question.answer ? "border-success bg-success-soft"
                  : i === picked ? "border-danger bg-danger-soft" : "border-border opacity-50";
                return (
                  <button key={o} disabled={picked !== null} onClick={() => pick(i)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition ${state}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-semibold">{String.fromCharCode(65 + i)}</span>
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-4 animate-[rise_.2s_ease-out]">
                <p className="text-sm text-muted"><span className="font-semibold text-fg">{picked === question.answer ? "Correct." : "Not quite."}</span> {question.explain}</p>
                <button onClick={resume} className="btn-primary mt-4 w-full">Continue lesson</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-10 text-white transition sm:px-4 [&>*]:pointer-events-auto ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
        <div className="relative h-5 cursor-pointer" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * dur); }}>
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30">
            <div className="h-full rounded-full bg-primary" style={{ width: dur ? `${(t / dur) * 100}%` : 0 }} />
          </div>
          {dur > 0 && CHECKPOINTS.map((c) => (
            <span key={c.at} title="Quick check" className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black/60 ${answered.includes(c.at) ? "bg-success" : "bg-accent"}`} style={{ left: `${(c.at / dur) * 100}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}</button>
          <button onClick={() => seek(t - 10)} aria-label="Back 10 seconds" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15"><RotateCcw className="h-[18px] w-[18px]" /></button>
          <button onClick={() => seek(t + 10)} aria-label="Forward 10 seconds" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15"><RotateCw className="h-[18px] w-[18px]" /></button>
          <button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">{muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</button>
          <span className="ml-1 tabular-nums text-white/80">{fmt(t)} / {fmt(dur)}</span>
          <button onClick={cycleSpeed} className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/15">{SPEEDS[speed]}x</button>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.())} aria-label="Full screen" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15"><Maximize className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  );
}

function Notice({ title, body, icon: Icon = Play }) {
  return (
    <div className="grid aspect-video place-items-center rounded-2xl bg-[#0f172a] p-6 text-center text-white">
      <div>
        <Icon className="mx-auto h-8 w-8 opacity-60" />
        <p className="mt-3 font-semibold">{title}</p>
        <p className="mt-1 text-sm text-white/60">{body}</p>
      </div>
    </div>
  );
}

// ── YouTube (IFrame Player API, so we know how much was watched) ─────────────

let ytReady;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytReady ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { ytReady = undefined; reject(new Error("YouTube failed to load")); };
    document.head.appendChild(s);
  });
  return ytReady;
}

function YouTubePlayer({ id, start, onProgress }) {
  const mount = useRef(null);
  const progress = useRef(onProgress);
  const [failed, setFailed] = useState(false);
  useEffect(() => { progress.current = onProgress; }, [onProgress]);

  useEffect(() => {
    let player;
    let timer;
    let gone = false;
    loadYouTube().then((YT) => {
      if (gone || !mount.current) return;
      player = new YT.Player(mount.current, {
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, start: start || undefined },
        events: {
          onError: () => setFailed(true),
          onStateChange: (e) => {
            clearInterval(timer);
            if (e.data === YT.PlayerState.PLAYING) {
              timer = setInterval(() => {
                const d = player.getDuration?.();
                if (d) progress.current?.(player.getCurrentTime(), d);
              }, 1000);
            }
            if (e.data === YT.PlayerState.ENDED) {
              const d = player.getDuration?.();
              if (d) progress.current?.(d, d);
            }
          },
        },
      });
    }).catch(() => !gone && setFailed(true));
    return () => { gone = true; clearInterval(timer); player?.destroy?.(); };
  }, [id, start]);

  if (failed) return <Notice icon={TriangleAlert} title="This video won't play" body="It may be private or removed. Tell your teacher which lesson it is." />;
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <div className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full"><div ref={mount} /></div>
    </div>
  );
}

// ── Drive, Vimeo, Bunny Stream: their own players in an iframe ───────────────

function EmbedPlayer({ embed, title }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <iframe
        src={embed}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    </div>
  );
}

// Picks the right player for whatever link the admin pasted.
// onProgress(seconds, duration) is called while playing, for players that can report it.
export default function VideoPlayer({ src, title = "Lesson video", onAnswer, onProgress }) {
  if (!src) return <Notice title="Video coming soon" body="This lesson's video hasn't been uploaded yet." />;
  const v = parseVideo(src);
  if (!v) return <Notice icon={TriangleAlert} title="This video link isn't supported" body="Tell your teacher which lesson it is so they can fix the link." />;
  if (v.kind === "file") return <NativePlayer key={v.src} src={v.src} onAnswer={onAnswer} onProgress={onProgress} />;
  if (v.kind === "youtube") return <YouTubePlayer key={v.id} id={v.id} start={v.start} onProgress={onProgress} />;
  return <EmbedPlayer key={v.embed} embed={v.embed} title={title} />;
}
