# WhatsApp funnel (AiSensy) — draft for Chirag's approval, 2026-11-16

All messages go to the **parent's WhatsApp** (students are minors). **Kannada first**; every template also gets an
English twin (same campaign, `en`), used only when a parent replies "English" or the lead row says so.
Kannada copy is a draft: **have a native speaker check it before you submit to Meta.**

`{{n}}` = template variables. M = Marketing template (costs more per message, needs opt-in), U = Utility (cheap,
for course notices). Links: website `beyondtatva.in`, LMS `learn.beyondtatva.in`.

## Global rules (apply to every step)
- A step is checked again **at send time**: if its "stop if" is true, it's skipped (logged as skipped).
- Paid → every sales message stops forever. Do not contact / parent replies STOP → everything stops.
- Max **1 marketing message per family per day**; nothing 9 pm–9 am IST.
- "Offer ends" messages only when a **real coupon with a real end date** exists in Studio; otherwise that step is skipped.
  A fake deadline gets caught by parents in a small town like Udupi and costs more trust than it earns.

## Stage A — Workshop lead (row in Leads sheet with a school)
| ID | When | Stop if | Type | Message |
|---|---|---|---|---|
| A1 | Day 0, 7 pm (or when the row is added, if later) | — | M, **photo/video header** (that school's workshop media) | Thanks + workshop recap + free Module 0 + links |
| A2 | Day 2, 6 pm | signed up | M | Reminder: Module 0 is free, 2-minute sign-up |
| A3 | Day 5, 6 pm | signed up | M | Last nudge + what other students made in the workshop |

**A1 (kn):** ನಮಸ್ಕಾರ {{1}} ಅವರೇ 🙏 ಇಂದು {{2}} ಶಾಲೆಯಲ್ಲಿ ನಡೆದ Beyond Tatva AI ಕಾರ್ಯಾಗಾರದಲ್ಲಿ {{3}} ಭಾಗವಹಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು! ಮಕ್ಕಳು AI ಬಳಸಿ ತಮ್ಮದೇ ಆದ ಪ್ರಾಜೆಕ್ಟ್ ಮಾಡಿದರು (ಮೇಲಿನ ವಿಡಿಯೋ ನೋಡಿ).
ಮುಂದಿನ ಹೆಜ್ಜೆ: Module 0 ಸಂಪೂರ್ಣ ಉಚಿತ 👉 learn.beyondtatva.in
ನಮ್ಮ ಬಗ್ಗೆ: beyondtatva.in
_Buttons: "Module 0 ನೋಡಿ" (URL), "ಪ್ರಶ್ನೆ ಕೇಳಿ" (quick reply)_

**A2 (kn):** {{1}} ಅವರೇ, {{2}} ಇನ್ನೂ ಉಚಿತ Module 0 ಆರಂಭಿಸಿಲ್ಲ. ಸೈನ್ ಅಪ್ 2 ನಿಮಿಷ, ಮೊಬೈಲ್‌ನಲ್ಲೇ ನೋಡಬಹುದು 👉 learn.beyondtatva.in

**A3 (kn):** {{2}} ಶಾಲೆಯ ಅನೇಕ ವಿದ್ಯಾರ್ಥಿಗಳು ಈಗಾಗಲೇ Module 0 ಆರಂಭಿಸಿದ್ದಾರೆ. {{3}} ಕೂಡ ಸೇರಲಿ — ಉಚಿತ 👉 learn.beyondtatva.in

## Stage B — Signed up (account created)
| ID | When | Stop if | Type | Message |
|---|---|---|---|---|
| B1 | Immediately | — | U | Welcome + how to log in + start Module 0 |
| B2a | +2 h | paid | M | **If Module 0 ≥ 50% watched:** enroll message (your idea) |
| B2b | +2 h | paid, Module 0 started | U | **If not started:** "start Module 0" nudge (pitching a course before they've seen anything converts badly) |
| B3 | Next day, 6 pm | paid | M | Offer ending (only with a real coupon end date) |
| B4 | Day 3, 6 pm | paid | M | Parent FAQ: price, time per week, what child builds, certificate |
| B5 | Day 6, 6 pm | paid | M | Last call + reply to talk to Chirag |

**B1 (kn):** ಸ್ವಾಗತ {{1}}! 🎉 Beyond Tatva ಖಾತೆ ಸಿದ್ಧವಾಗಿದೆ.
ಲಾಗಿನ್: learn.beyondtatva.in → ಇಮೇಲ್ ಅಥವಾ ಮೊಬೈಲ್ + ಪಾಸ್‌ವರ್ಡ್.
ಮೊದಲು ಉಚಿತ Module 0 ನೋಡಿ (ಸುಮಾರು {{2}} ನಿಮಿಷ).

**B2a (kn):** {{1}} Module 0 ಚೆನ್ನಾಗಿ ನೋಡುತ್ತಿದ್ದಾರೆ 👏 ಪೂರ್ಣ ಕೋರ್ಸ್‌ನಲ್ಲಿ ಪ್ರತಿ ವಾರ ಹೊಸ ಮಾಡ್ಯೂಲ್, ಕ್ವಿಜ್, ಪ್ರಾಜೆಕ್ಟ್ ಮತ್ತು ಪ್ರಮಾಣಪತ್ರ. ಸೇರಲು 👉 learn.beyondtatva.in/unlock

**B3 (kn):** ⏳ ವಿಶೇಷ ಬೆಲೆ ₹{{1}} ಕೇವಲ {{2}} ರವರೆಗೆ ಮಾತ್ರ. ನಂತರ ₹{{3}}. ಈಗಲೇ ಸೇರಿ 👉 learn.beyondtatva.in/unlock

## Stage C — Module 0 completed
| ID | When | Stop if | Type | Message |
|---|---|---|---|---|
| C1 | Immediately | paid | M | Congrats + full-course benefits + enroll |
| C2 | +1 day | paid | M | Parent view: what the child will be able to do after 8 weeks, price, "reply to ask" |

**C1 (kn):** ಅಭಿನಂದನೆಗಳು! 🎉 {{1}} Module 0 ಪೂರ್ಣಗೊಳಿಸಿದ್ದಾರೆ. ಪೂರ್ಣ ಕೋರ್ಸ್‌ನಲ್ಲಿ:
✅ ಪ್ರತಿ ವಾರ ಹೊಸ AI ಮಾಡ್ಯೂಲ್
✅ ನಿಜವಾದ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ಮತ್ತು ಕ್ವಿಜ್‌ಗಳು
✅ ಪ್ರಮಾಣಪತ್ರ (QR ಪರಿಶೀಲನೆಯೊಂದಿಗೆ)
ಸೇರಲು 👉 learn.beyondtatva.in/unlock

## Stage D — Paid
| ID | When | Type | Message |
|---|---|---|---|
| D1 | Immediately | U | Payment confirmed + login steps + course rules |
| D2 | Day before batch start / first module | U | "Tomorrow your first module opens" |

**D1 (kn):** ✅ ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. {{1}} ಈಗ Beyond Tatva ವಿದ್ಯಾರ್ಥಿ!
ಲಾಗಿನ್: learn.beyondtatva.in
ನಿಯಮಗಳು:
1️⃣ ಪ್ರತಿ ಭಾನುವಾರ ಹೊಸ ಮಾಡ್ಯೂಲ್
2️⃣ ವಾರದೊಳಗೆ ವಿಡಿಯೋ + ಕ್ವಿಜ್ ಮುಗಿಸಿ
3️⃣ ಎಲ್ಲಾ ಪಾಠ ನೋಡಿದರೆ ಪ್ರಮಾಣಪತ್ರ
ಸಹಾಯ ಬೇಕೆ? ಇಲ್ಲಿ ಉತ್ತರಿಸಿ.

## Stage E — Weekly course loop (paid students)
| ID | When | Stop if | Type | Message |
|---|---|---|---|---|
| E1 | Sunday 9 am (module opens) | — | U | "Module {{n}} is open: {{title}}" |
| E2 | Wednesday 6 pm | module ≥ 80% watched | U | Watch reminder |
| E3 | Friday 6 pm | quiz attempted | U | Quiz reminder |
| E4 | Saturday 11 am | — | U | **Parent weekly report**: % watched, quiz score, assignment status (highest value to parents; drives renewals and referrals) |
| E5 | 7 days no activity | active again | U | "We miss {{1}}" + link |
| E6 | Certificate issued | — | U | Certificate link + "share it" + referral ask |

**E1 (kn):** 📚 ಹೊಸ ಮಾಡ್ಯೂಲ್ ತೆರೆದಿದೆ! Module {{1}}: {{2}}. ಈ ವಾರ ಮುಗಿಸಿ 👉 learn.beyondtatva.in
**E4 (kn):** 📊 {{1}} ಅವರ ಈ ವಾರದ ವರದಿ: ವಿಡಿಯೋ {{2}}% ನೋಡಿದ್ದಾರೆ, ಕ್ವಿಜ್ {{3}}, ಅಸೈನ್‌ಮೆಂಟ್ {{4}}. ಶಾಭಾಷ್! 👏

## What the system needs (Claude builds after this copy is approved)
1. **Steps with delays + "stop if" checked at send time** (today each rule sends once, immediately).
2. **New events:** Module 0 started/50%/completed, module opens (from Studio weeks), quiz not attempted, inactive 7 days,
   certificate issued, weekly report. A scheduled scan runs with the sheet's 5-minute call.
3. **Workshop media per school** (photo/video URL in School outreach) → A1 header.
4. **Language per family** (default Kannada) → picks the kn or en campaign.
5. **Frequency cap** (1 marketing/day) and STOP handling (AiSensy webhook → do not contact).

## Chirag's steps
1. Get the Kannada checked. 2. Create the templates in AiSensy (category as marked; A1 with a media header).
3. Make an API campaign per template, named `<ID>_kn` / `<ID>_en` (e.g. `B1_kn`). 4. Tell Claude "build funnel".
