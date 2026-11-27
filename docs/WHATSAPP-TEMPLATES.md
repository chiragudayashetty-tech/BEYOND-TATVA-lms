# WhatsApp journey: AiSensy templates (v2)

Built 2026-11-27 (migration `20261127000003_whatsapp_journey_v2`, replaces `20261127000002`). Plan reviewed with Chirag.

- `_s` messages go to the **student** (English): their own WhatsApp from sign-up, or the parent's if they gave none.
- `_p` messages go to the **parent** (Kannada).
- Parent on Do not contact → the student gets nothing either.
- Test and duplicate accounts never get messages. Nudges are capped at 2 per number per day.
- The sender runs **every minute**, 9:00–21:00 IST (Leads Tracker Apps Script trigger `sendWhatsApp`).
- Lead broadcasts after a workshop (photo, price, offer ends) and the newsletter text are manual: Studio → Pipeline → "WhatsApp these N".

## Setup (Chirag, once per template)
1. AiSensy → Templates → **New**: name = the key below, the category, language (English for `_s`, Kannada for `_p`), body below.
   Keep `{{1}}`, `{{2}}`… exactly. Buttons: a **URL button** to `https://learn.beyondtatva.in` where noted. Submit.
2. AiSensy → Campaigns → **API campaign** → that template → name it the **same as the key** → Go live.
3. LMS Studio → **WhatsApp** → Auto-send → the rule with that key → set the campaign → **On**.
   Every rule is Off until you switch it on, so you can go one by one.

The LMS fills every `{{n}}` itself. You never type them.

---

## Logged in, not enrolled

### `j_welcome_s` · Utility · 1 min after sign-up · header: Module 0 PDF · button "Watch Module 0"
```
Hi {{1}}, welcome to Beyond Tatva! Your free Module 0 is unlocked.
Watch it, take the quiz, and keep the attached guide handy.
```
### `j_welcome_p` · Utility · 1 min after sign-up
```
ನಮಸ್ಕಾರ! {{1}} ಇಂದು Beyond Tatva ಗೆ ಲಾಗಿನ್ ಆಗಿ ಉಚಿತ Module 0 ಆರಂಭಿಸಿದ್ದಾರೆ.
ಅವರ ಪ್ರಗತಿಯನ್ನು ನಾವು ನಿಮಗೆ ತಿಳಿಸುತ್ತೇವೆ. – Beyond Tatva ತಂಡ
```
### `j_follow1_s` · Marketing · day 2, 6 pm · button "Join now" · {{2}} = status line
```
Knock knock. 🚪 Who's there? Your future self, asking why you haven't levelled up yet, {{1}}. 😄
{{2}}
```
### `j_follow1_p` · Marketing · day 2, 6 pm · button "ಈಗಲೇ ಸೇರಿ" · {{2}} = status (Kannada)
```
ನಿಮ್ಮ ಮಗು AI ಪ್ರಪಂಚದ ಬಾಗಿಲಲ್ಲಿ ನಿಂತಿದೆ! 🚪 {{1}} ಸ್ಥಿತಿ: {{2}}. ಒಂದು ಹೆಜ್ಜೆ ಮುಂದೆ ಇಡಲು ಪ್ರೋತ್ಸಾಹಿಸಿ.
```
### `j_follow2_s` · Marketing · day 4, 6 pm · button "Join now"
```
Real talk, {{1}}. 🎯 Right now someone your age is using AI to finish a week of notes in 10 minutes. The gap starts small and grows fast.
{{2}}
```
### `j_follow2_p` · Marketing · day 4, 6 pm · button "ಈಗಲೇ ಸೇರಿ"
```
ಒಂದು ಸತ್ಯ: ಇಂದು AI ಕಲಿಯದ ಮಕ್ಕಳು ನಾಳೆ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಹಿಂದೆ ಉಳಿಯುತ್ತಾರೆ. 📉 ಹಳೆಯ ರೀತಿಯ ಓದು ಸಮಯ ವ್ಯರ್ಥ. {{1}} ಸ್ಮಾರ್ಟ್ ಆಗಿ ಕಲಿಯಲಿ.
```
### `j_follow3_s` · Marketing · day 7, 6 pm · buttons "Join now", "Call me"
```
Last ping from us, {{1}}. 👋 Your seat in AI Superpowers is still saved. Grab it before the batch fills up. 🎟️
```
### `j_follow3_p` · Marketing · day 7, 6 pm · buttons "ಈಗಲೇ ಸೇರಿ", "ಕರೆ ಮಾಡಿ"
```
{{1}} ಗೆ ಸೀಟು ಇನ್ನೂ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ. 🎟️ ಏನಾದರೂ ಪ್ರಶ್ನೆ ಇದ್ದರೆ ಒಂದು ಕರೆ ಸಾಕು. 📞
```

## Enrolled

### `j_enrolled_s` · Utility · 1 min after enrolling · header: course overview PDF · button "Open course"
```
🎉 You're IN, {{1}}! Welcome to the top 1% of students your age learning AI.
📘 Your guide is attached: modules, XP, leaderboard, how it all works.
📅 Module 1 drops {{2}}. Watch any day after.
```
### `j_enrolled_p` · Utility · 1 min after paying (payments only)
```
ನಮಸ್ಕಾರ! ✅ {{1}} ಅವರ ನೋಂದಣಿ ಯಶಸ್ವಿ. ಪಾವತಿ ₹{{2}}, ರಸೀದಿ {{3}}. ಪ್ರತಿ ವಾರ ಪ್ರಗತಿ ವರದಿ ಕಳುಹಿಸುತ್ತೇವೆ. ನಂಬಿಕೆಗೆ ಧನ್ಯವಾದಗಳು! 🙏
```
### `j_quest_s` · Utility · next day, 6 pm · button "Open course"
```
Quick quest, {{1}}: {{2}} ⚡ Module 1 is coming {{3}}, be ready.
```

## Weekly loop (same templates for all 5 modules)

### `j_module_open_s` · Utility · module opens (Sunday 10 am) · header: module thumbnail · button "Watch now"
```
🎬 New episode alert! Module {{2}} "{{3}}" just dropped, {{1}}. Watch any day this week, finish quiz + assignment for up to {{4}} XP. Current rank: #{{5}} 🏆
```
### `j_module_open_p` · Utility · same time
```
📢 ಹೊಸ Module {{2}} "{{3}}" ಬಿಡುಗಡೆ! ಈ ವಾರ {{1}} ಕಲಿಯುವುದು: {{4}}.
```
### `j_module_done_s` · Utility · instead of module_open when last week's module is fully done
```
Boss level cleared! 🏆 Module {{2}} done, {{1}}. Module {{3}} "{{4}}" is live. Keep the streak 🔥
```
### `j_module_done_p` · Utility
```
ಅಭಿನಂದನೆಗಳು! 🎉 {{1}} Module {{2}} ಪೂರ್ಣಗೊಳಿಸಿದ್ದಾರೆ (ವೀಡಿಯೊ, ಕ್ವಿಜ್, ಅಸೈನ್‌ಮೆಂಟ್). ಹೊಸ Module {{3}} ಇಂದು ಬಿಡುಗಡೆ.
```
### `j_nudge_tue_s` · Utility · Tuesday 6 pm, video not finished · button "Continue"
```
Psst {{1}}... 👀 Module {{2}} is still waiting for you. 40 minutes, go!
```
### `j_nudge_thu_s` · Utility · Thursday 6 pm
```
📊 {{3}} classmates have already finished Module {{2}}. You're one video away from catching up, {{1}}.
```
### `j_nudge_sat_s` · Utility · Saturday 6 pm
```
⏰ Final whistle this week, {{1}}! Finish Module {{2}} today, a new module drops tomorrow.
```
### `j_pending_tue_s` · Utility · Tuesday 6 pm, watched but quiz/assignment left
```
Video ✅ Nice, {{1}}! Now the fun part of Module {{2}}: finish {{4}} for +{{3}} XP. 🧠
```
### `j_pending_thu_s` · Utility · Thursday 6 pm
```
So close, {{1}}! 🔥 Just {{3}} left on Module {{2}}. Finish it and climb the leaderboard.
```
### `j_parent_digest_p` · Utility · 7 pm, only on days the child finished something
```
📊 ಇಂದು {{1}} ಅವರ ಪ್ರಗತಿ (Module {{2}}): ವೀಡಿಯೊ {{3}} | ಕ್ವಿಜ್ {{4}} | ಅಸೈನ್‌ಮೆಂಟ್ {{5}}
```

## Course end

### `j_course_done_s` · Utility · all modules finished · header: certificate image · button "Get certificate"
```
🏅 ACHIEVEMENT UNLOCKED: AI Superpowers Graduate
{{1}}, you passed {{2}} quizzes and handed in {{3}} assignments, finishing with {{4}} XP (rank #{{5}}).
You now use AI for studies, creativity, life and building. Your certificate is ready. Be proud. 🎓
```
### `j_course_done_p` · Utility
```
🏅 ಹೆಮ್ಮೆಯ ಕ್ಷಣ!
{{1}} AI Superpowers ಕೋರ್ಸ್ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದ್ದಾರೆ: 5 ಮಾಡ್ಯೂಲ್, {{2}} ಕ್ವಿಜ್, {{3}} ಅಸೈನ್‌ಮೆಂಟ್.
ಓದು, ಸೃಜನಶೀಲತೆ ಮತ್ತು ಭವಿಷ್ಯಕ್ಕೆ ಬೇಕಾದ AI ಕೌಶಲ್ಯ ಈಗ ಅವರ ಕೈಯಲ್ಲಿದೆ. 🎓
```
### `j_review_s` / `j_review_p` · Utility · next day, 6 pm · button "Give feedback"
```
One last quest, {{1}}: rate the course in 2 minutes ⭐
```
```
{{1}} ಅವರ ಕೋರ್ಸ್ ಬಗ್ಗೆ ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ನಮಗೆ ಮುಖ್ಯ 🙏
```
### `j_referral_s` · Marketing · 3 days after finishing · keep **Off** until referral rewards exist
```
Final boss, {{1}}: bring your squad. 🤝 Share your invite code {{2}} with friends and climb to #1 on the leaderboard together. 🏆
```

## Newsletter (sent when a newsletter is uploaded in Studio → Content; enrolled only)
### `j_newsletter_s` / `j_newsletter_p` · Utility · button "Read now"
```
📰 Fresh from the AI world, {{1}}: {{2}}
```
```
📰 {{1}} ಗಾಗಿ ಈ ತಿಂಗಳ Beyond Tatva AI ನ್ಯೂಸ್‌ಲೆಟರ್: {{2}}
```
