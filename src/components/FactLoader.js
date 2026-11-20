"use client";

import { useEffect, useState } from "react";

// Mix of fun facts, study tips and a little FOMO, so waiting feels like learning.
const FACTS = [
  "🤖 Fun fact: ChatGPT reached 100 million users in just 2 months. Faster than Instagram!",
  "🧠 Study tip: Explain a topic out loud like you're teaching a friend. You'll remember it 2x better.",
  "🔥 Students who finish one lesson a day finish the course weeks ahead of everyone else.",
  "⏱️ Study tip: 25 minutes focus, 5 minutes break. It's called the Pomodoro trick.",
  "🚀 Fun fact: AI helped scientists predict the shapes of 200 million proteins. That won a Nobel Prize!",
  "📵 Study tip: Phone in another room = up to 20% better focus. Seriously, try it.",
  "👀 Your classmates are learning AI right now. Don't let them get ahead!",
  "🎯 Fun fact: The word 'robot' comes from a Czech word meaning 'forced work'.",
  "💡 Study tip: Test yourself before re-reading. Quizzes beat highlighting every time.",
  "🌏 Fun fact: India has one of the largest numbers of AI learners in the world. Be one of the best.",
  "😴 Study tip: Sleep is when your brain saves what you learned today. Don't skip it!",
  "🏆 Every quiz you finish keeps your streak alive. Don't break the chain!",
  "🎮 Fun fact: An AI beat the world champion at Go, a game with more moves than atoms in the universe.",
  "✍️ Study tip: Write 3 things you learned after every lesson. Takes 1 minute, lasts for weeks.",
  "⚡ Jobs that use AI are growing fast. Starting in Grade 8 puts you years ahead.",
];

// inline: fills its box instead of covering the screen. title: replaces "Loading <label>…".
export default function FactLoader({ label = "page", title, inline = false }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * FACTS.length));
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FACTS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className={inline ? "grid min-h-80 place-items-center px-4 py-10" : "fixed inset-0 z-[55] grid place-items-center bg-bg/80 px-4 backdrop-blur-sm"}>
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="bt-orbit" aria-hidden="true">
          <span className="bt-ring"><i /></span><span className="bt-ring"><i /></span><span className="bt-ring"><i /></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-trim.png" alt="" />
        </div>
        <p className="text-sm font-semibold">{title ?? `Loading ${label}…`}</p>
        <p key={i} className="bt-fact min-h-16 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">{FACTS[i]}</p>
      </div>
    </div>
  );
}
