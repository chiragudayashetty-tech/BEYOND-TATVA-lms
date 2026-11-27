# WhatsApp course journey: AiSensy templates

Built 2026-11-27 (migration `20261127000002_course_whatsapp_journey`). Every message goes to the **parent's WhatsApp**.
Test accounts never get them. Reminders are capped at 2 per number per day. Sending runs 9:00–21:00 IST only.

## Setup (Chirag, once per template)
1. AiSensy → Manage → Templates → **New**. Paste the name, category, language **English** and the body below.
   `{{1}}`, `{{2}}`… must stay exactly as written (same order). Submit; Meta approves in minutes to a day.
2. AiSensy → Campaigns → **API campaign** → pick the approved template → name it the **same as the template** → Go live.
3. LMS Studio → **WhatsApp** → Messages → **Add**: the campaign name, **no placeholders** (the LMS fills them).
   Then Auto-send → pick that message for the rule → **On**.
   Each rule stays silent until it is On, so you can switch them on one by one.

Links are sent as text inside the message (no button setup needed).

---

### 1. `m0_welcome` · Utility · right after sign-up (not bought)
```
Hi! {{1}} has joined Beyond Tatva 🎉

Module 0 is free and ready now (about 20 minutes). Ask {{1}} to start here:
{{2}}

Liked it? Unlock all 5 modules here: {{3}}

ಮಾಡ್ಯೂಲ್ 0 ಉಚಿತ, ಈಗಲೇ ನೋಡಿ.
```

### 2. `m0_nudge_offer` · Marketing · 24 h later, only while a coupon with an end date is active
```
Hi! Has {{1}} watched Module 0 yet?

The full AI course is ₹{{2}} with code {{3}} till {{4}}. After that it goes back to the normal price.
Enroll: {{5}}

ಆಫರ್ {{4}} ವರೆಗೆ ಮಾತ್ರ.
```

### 3. `enrolled_congrats` · Utility · right after payment
```
Congratulations! 🎉 {{1}} is now enrolled in the Beyond Tatva AI course.

Open the course: {{2}}

Always sign in with this same WhatsApp number to watch.
ಅಭಿನಂದನೆಗಳು! ಕೋರ್ಸ್ ಈಗ ತೆರೆದಿದೆ.
```

### 4. `course_overview` · Utility · 2 h after payment
```
Here is how {{1}}'s course works 📚

• 5 modules, one opens every Sunday at 10 AM
• Each module: short videos, a quiz and one small assignment
• Every Saturday you get a progress report here
• Finish all 5 → certificate

First module opens: {{2}}
Course: {{3}}

ಪ್ರತಿ ಭಾನುವಾರ ಬೆಳಿಗ್ಗೆ 10ಕ್ಕೆ ಹೊಸ ಮಾಡ್ಯೂಲ್.
```

### 5. `module_open` · Utility · Sunday 10 AM, each module
```
Module {{2}} is open now: {{3}} 🚀

{{1}} can watch it here: {{4}}

ಮಾಡ್ಯೂಲ್ {{2}} ಈಗ ತೆರೆದಿದೆ.
```

### 6. `module_reminder_1` · Utility · same day 8 PM, under 20 % watched
```
Reminder: {{1}} hasn't started Module {{2}} yet.
20 minutes tonight is enough to begin 👉 {{3}}

ಇಂದು ರಾತ್ರಿ 20 ನಿಮಿಷ ಸಾಕು.
```

### 7. `module_reminder_2` · Utility · next day 7 PM, still under 20 %
```
{{1}} is a little behind on Module {{2}}. A short session today keeps them on track for Sunday's next module.
Watch: {{3}}

ಮುಂದಿನ ಭಾನುವಾರದ ಮೊದಲು ಮುಗಿಸಿ.
```

### 8. `parent_progress` · Utility · Saturday 6 PM, enrolled only
```
Weekly report for {{1}} 📊

Modules finished: {{2}}
This week's module watched: {{3}}
Quizzes passed: {{4}}

See details: {{5}}

ವಾರದ ಪ್ರಗತಿ ವರದಿ.
```

### 9. `work_due` · Utility · the next Sunday 12 PM, if pending
```
{{1}} still has the Module {{2}} {{3}} to finish ✍️
It takes about 15 minutes: {{4}}

ಕ್ವಿಜ್ / ಅಸೈನ್‌ಮೆಂಟ್ ಬಾಕಿ ಇದೆ.
```

### 10. `certificate_ready` · Utility · all modules finished
```
🎓 {{1}} has finished the Beyond Tatva AI course!

Claim the certificate here: {{2}}

ಅಭಿನಂದನೆಗಳು! ಪ್ರಮಾಣಪತ್ರ ಪಡೆಯಿರಿ.
```

### 11. `newsletter` · Marketing · when you upload a newsletter in Studio → Content (enrolled only)
```
This month's Beyond Tatva newsletter is out: {{2}} 📰

{{1}} can read it here: {{3}}

ಈ ತಿಂಗಳ ಸುದ್ದಿಪತ್ರ ಬಂದಿದೆ.
```

---

Turn **off** the old rule "New student: how to log in" (`student_welcome`) once `m0_welcome` and `enrolled_congrats` are on, or parents get two welcomes.
