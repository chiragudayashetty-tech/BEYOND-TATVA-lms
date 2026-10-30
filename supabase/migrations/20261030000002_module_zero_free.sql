-- Module 0 "AI 101" becomes the free module; modules 1–6 (positions 1–6) need access.
update public.chapters set position = position + 1 where course_id = 'ai-for-students';
update public.lessons set position = position + 4 where course_id = 'ai-for-students';
update public.chapters set is_free = false where course_id = 'ai-for-students';

with ch as (
  insert into public.chapters (course_id, title, blurb, position, release_at, is_free)
  values ('ai-for-students', 'AI 101', 'What AI is, the two free tools you''ll use, and how to talk to them.', 0, '2026-10-18 18:00+05:30', true)
  returning id
), l as (
  insert into public.lessons (course_id, chapter_id, title, position, minutes)
  select 'ai-for-students', ch.id, v.title, v.pos, v.minutes
  from ch, (values ('What is AI, really?', 1, 6), ('Meet ChatGPT and Gemini', 2, 7), ('Free is enough', 3, 5), ('Your first conversation with AI', 4, 8)) as v(title, pos, minutes)
  returning id
)
insert into public.lesson_media (lesson_id, video_url) select id, '/media/lesson1.mp4' from l;

update public.lessons set title = 'Beyond chat: AI apps that help'
where course_id = 'ai-for-students' and title = 'Your two tools for this course';
update public.lessons set title = 'Research with AI, safely'
where course_id = 'ai-for-students' and title = 'Free is enough'
  and chapter_id = (select id from public.chapters where course_id = 'ai-for-students' and position = 3);

update public.courses
set description = 'Start free with AI 101, then six modules for Grades 8–10, one premiering every Sunday at 6 PM. Short video lessons, quick checks inside every video, a weekly quiz and a project at the end.'
where id = 'ai-for-students';
