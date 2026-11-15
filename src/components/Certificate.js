/* eslint-disable @next/next/no-img-element */
import { Pinyon_Script, Playfair_Display } from "next/font/google";

// The Beyond Tatva certificate: ivory paper, gold foil frame and seal, serif type, a faint circuit pattern.
// Pure HTML/CSS/SVG so it prints to a crisp A4 landscape PDF (Download = the browser's Save as PDF).
// Sizes use cqw (1% of the certificate's width) so phone and print look the same.

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"] });
const script = Pinyon_Script({ subsets: ["latin"], weight: "400" });

const SITE = "learn.beyondtatva.in";
const GOLD = "bg-[linear-gradient(135deg,#8a6a1f,#e9cf7a_30%,#b8913a_50%,#f3e2a0_70%,#8a6a1f)]";
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

function Corner({ className }) {
  return (
    <svg viewBox="0 0 60 60" className={`absolute h-[6cqw] w-[6cqw] ${className}`} aria-hidden>
      <g fill="none" stroke="#b8913a" strokeWidth="1.4">
        <path d="M2 58 V2 H58" /><path d="M8 58 V8 H58" strokeWidth="0.7" />
        <path d="M14 30 Q14 14 30 14" /><circle cx="14" cy="14" r="3" fill="#b8913a" />
      </g>
    </svg>
  );
}

function Seal() {
  return (
    <div className="relative h-[13cqw] w-[13cqw]">
      {/* ribbons */}
      <span className="absolute left-[22%] top-[62%] h-[4.6cqw] w-[2.6cqw] origin-top rotate-[18deg] bg-[#1e2a5a] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]" />
      <span className="absolute right-[22%] top-[62%] h-[4.6cqw] w-[2.6cqw] origin-top -rotate-[18deg] bg-[#1e2a5a] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]" />
      <div className={`absolute inset-0 rounded-full ${GOLD} shadow-[0_0.4cqw_1cqw_rgba(120,90,20,0.35)] [clip-path:polygon(50%_0,57%_6%,66%_3%,70%_11%,80%_10%,81%_19%,90%_22%,87%_31%,95%_37%,90%_45%,97%_50%,90%_55%,95%_63%,87%_69%,90%_78%,81%_81%,80%_90%,70%_89%,66%_97%,57%_94%,50%_100%,43%_94%,34%_97%,30%_89%,20%_90%,19%_81%,10%_78%,13%_69%,5%_63%,10%_55%,3%_50%,10%_45%,5%_37%,13%_31%,10%_22%,19%_19%,20%_10%,30%_11%,34%_3%,43%_6%)]`} />
      <div className="absolute inset-[13%] rounded-full border border-[#8a6a1f]/60" />
      <svg viewBox="0 0 100 100" className="absolute inset-[13%] h-[74%] w-[74%]" aria-hidden>
        <defs><path id="seal-ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
        <text fill="#5c4512" fontSize="8.5" letterSpacing="2" fontWeight="700">
          <textPath href="#seal-ring">BEYOND TATVA ✦ AI CERTIFIED ✦ 2026 ✦</textPath>
        </text>
      </svg>
      <div className={`${serif.className} absolute inset-0 grid place-items-center text-[3.2cqw] font-bold text-[#4a370c]`}>AI</div>
    </div>
  );
}

export default function Certificate({ name, courseTitle, modules = [], code, issuedAt, locked = false }) {
  return (
    <div className="cert-sheet w-full [container-type:inline-size]">
      <div className={`relative aspect-[1.414] w-full overflow-hidden ${GOLD} p-[0.7cqw] shadow-xl print:shadow-none`}>
        <div className="relative h-full w-full overflow-hidden bg-[#fbf7ec] text-[#1b2140]">
          {/* paper glow + faint circuit pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#fffdf6_0%,#f6efdc_100%)]" />
          <svg viewBox="0 0 1414 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.13]" aria-hidden>
            <g fill="none" stroke="#9c7a2a" strokeWidth="1.5">
              <path d="M0 220 H140 L190 270 H300 L330 240 H380" /><path d="M0 780 H160 L210 730 H320" /><path d="M0 500 H90 L130 460 H210" />
              <path d="M1414 230 H1260 L1210 280 H1100 L1070 250 H1030" /><path d="M1414 770 H1250 L1200 720 H1090" /><path d="M1414 520 H1320 L1280 480 H1200" />
            </g>
            <g fill="#9c7a2a"><circle cx="380" cy="240" r="5" /><circle cx="320" cy="730" r="5" /><circle cx="210" cy="460" r="5" /><circle cx="1030" cy="250" r="5" /><circle cx="1090" cy="720" r="5" /><circle cx="1200" cy="480" r="5" /></g>
          </svg>
          {/* frames */}
          <div className="absolute inset-[2.2cqw] border-[0.25cqw] border-[#b8913a]" />
          <div className="absolute inset-[2.9cqw] border border-[#b8913a]/60" />
          <Corner className="left-[1.6cqw] top-[1.6cqw]" />
          <Corner className="right-[1.6cqw] top-[1.6cqw] rotate-90" />
          <Corner className="bottom-[1.6cqw] right-[1.6cqw] rotate-180" />
          <Corner className="bottom-[1.6cqw] left-[1.6cqw] -rotate-90" />

          <div className="relative flex h-full flex-col items-center justify-between px-[9%] pb-[8%] pt-[5.5%] text-center">
            <div className="flex flex-col items-center">
              <img src="/brand/mark-trim.png" alt="" className="h-[4cqw] w-auto" />
              <img src="/brand/wordmark-black.png" alt="Beyond Tatva" className="mt-[0.8cqw] h-[1.5cqw] w-auto" />
              <div className={`${serif.className} mt-[2cqw] text-[4.6cqw] font-semibold uppercase leading-none tracking-[0.12em] text-[#1b2140]`}>Certificate</div>
              <div className="mt-[0.8cqw] flex items-center gap-[1.2cqw] text-[1.3cqw] font-semibold uppercase tracking-[0.45em] text-[#9c7a2a]">
                <span className="h-px w-[6cqw] bg-[#b8913a]" />of Completion<span className="h-px w-[6cqw] bg-[#b8913a]" />
              </div>
            </div>

            <div className="flex w-full flex-col items-center">
              <div className={`${serif.className} text-[1.6cqw] italic text-[#55607f]`}>This is proudly presented to</div>
              <div className={`${script.className} mt-[0.4cqw] max-w-full truncate px-[2cqw] text-[6.6cqw] leading-[1.25] text-[#1b2140]`}>{name}</div>
              <div className="h-px w-[50%] bg-[linear-gradient(90deg,transparent,#b8913a,transparent)]" />
              <p className={`${serif.className} mt-[1.4cqw] max-w-[78%] text-[1.6cqw] leading-relaxed text-[#3b4466]`}>
                for watching every lesson of all {modules.length || "the"} modules of <b className="font-semibold text-[#1b2140]">{courseTitle}</b>,
                and becoming an <b className="font-semibold text-[#9c7a2a]">AI Explorer</b>, ready to learn, create and build with artificial intelligence.
              </p>
              {modules.length > 0 && (
                <div className="mt-[1.4cqw] flex max-w-[86%] flex-wrap justify-center gap-x-[1.6cqw] gap-y-[0.4cqw] text-[1.15cqw] uppercase tracking-[0.12em] text-[#6b6447]">
                  {modules.map((m, i) => <span key={m}><span className="text-[#b8913a]">✦</span> {String(i).padStart(2, "0")} {m}</span>)}
                </div>
              )}
            </div>

            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-[3cqw]">
              <div className="text-center">
                <div className={`${script.className} text-[3.4cqw] leading-none text-[#1b2140]`}>Chirag Shetty</div>
                <div className="mt-[0.5cqw] border-t border-[#b8913a] pt-[0.5cqw] text-[1.1cqw] uppercase tracking-[0.2em] text-[#6b6447]">Founder, Beyond Tatva</div>
              </div>
              <Seal />
              <div className="text-center">
                <div className={`${serif.className} text-[1.9cqw] font-semibold leading-none text-[#1b2140]`}>{issuedAt ? fmt(issuedAt) : "On completion"}</div>
                <div className="mt-[0.5cqw] border-t border-[#b8913a] pt-[0.5cqw] text-[1.1cqw] uppercase tracking-[0.2em] text-[#6b6447]">Date of issue</div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-[3.4cqw] left-0 right-0 text-center text-[0.95cqw] tracking-[0.15em] text-[#8b8468]">
            CERTIFICATE ID <span className="font-mono font-semibold text-[#1b2140]">{code ?? "BT-XXXX-XXXX"}</span> · VERIFY AT {SITE}/verify/{code ?? "…"}
          </div>
          {locked && <div className="absolute inset-0 bg-[#fbf7ec]/30 backdrop-blur-[0.6cqw]" />}
        </div>
      </div>
    </div>
  );
}
