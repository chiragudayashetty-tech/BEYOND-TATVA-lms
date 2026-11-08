-- Modules 1–5 (course overview v2) as locked "Coming soon" placeholders.
-- release_at in 2099 = not premiered, so nobody (free or paid) can watch; the app shows "Coming soon".
-- To launch a module: set its real premiere date in Admin → Content and add lessons.
insert into public.chapters (course_id, title, blurb, position, release_at, is_free)
select 'ai-for-students', v.title, v.blurb, v.pos, '2099-12-31 10:00+05:30', false
from (values
  (1, 'AI Study Buddy', 'Understand difficult subjects, make notes, summaries and quizzes, build a personal study plan and prepare smarter for exams.'),
  (2, 'AI Creativity: Images, Music & Video', 'Create images and artwork, music and sound, videos and animations, and tell stories with AI.'),
  (3, 'AI Life Hacks', 'Practical AI for productivity, organisation, presentations and everyday tasks, plus the most useful AI tools for students.'),
  (4, 'Build with AI', 'Build websites, games and interactive projects with no-code tools, and turn ideas into working digital products.'),
  (5, 'Business & Earn with AI', 'Business ideas, AI-powered freelancing, content creation and digital services: how skills become earning opportunities.')
) as v(pos, title, blurb)
where not exists (select 1 from public.chapters c where c.course_id = 'ai-for-students' and c.position = v.pos);
