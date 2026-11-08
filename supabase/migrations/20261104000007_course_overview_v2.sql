-- Course overview v2 (Chirag, 2026-11-04): six modules (0–5), recorded classes every Sunday at 10:00 AM IST.
-- Content-only: renames Module 0, moves premieres from 6 PM to 10 AM on the same date, updates the course copy.
update public.chapters
set title = 'Introduction to the AI World (AI 101)',
    blurb = 'What AI is and how it works, how it is changing the world, AI opportunities and responsible use.'
where course_id = 'ai-for-students' and position = 0;

update public.chapters
set release_at = ((release_at at time zone 'Asia/Kolkata')::date + time '10:00') at time zone 'Asia/Kolkata'
where course_id = 'ai-for-students' and release_at is not null;

update public.courses
set tagline = 'Six modules to learn, study, create, build and earn with AI.',
    description = 'Six modules for Grades 8–10: Introduction to the AI World (AI 101, free), AI Study Buddy, AI Creativity (images, music and video), AI Life Hacks, Build with AI, and Business & Earn with AI. A new recorded class every Sunday at 10:00 AM: learn at your own pace and rewatch any time. Includes module-wise PDF textbooks, a WhatsApp doubt helpline and live doubt sessions after the course.'
where id = 'ai-for-students';
