insert into public.schools (name, city, code, teacher_code) values ('St. Mary''s School', 'Udupi', 'SMS-UDUPI', 'SMS-TEACH-7Q4') on conflict (code) do nothing;

insert into public.classes (school_id, name, grade)
select id, g.name, g.grade from public.schools, (values ('Grade 8 · A', 8), ('Grade 9 · A', 9), ('Grade 10 · A', 10)) as g(name, grade)
where code = 'SMS-UDUPI' and not exists (select 1 from public.classes c where c.school_id = schools.id and c.grade = g.grade);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('ai-study-hacks', 'AI Study Hacks', 'Learn smarter, not longer.', 'Turn any textbook chapter into summaries, flashcards and practice tests in minutes. The study toolkit every Grade 8 student wishes they had.', 'Grade 8', '#4F46E5', '#93C5FD', array['Study skills', 'Productivity']::text[], '/media/hero1.mp4', true, 0)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'ai-study-hacks';

with ch as (insert into public.chapters (course_id, title, position) values ('ai-study-hacks', 'Getting started', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-study-hacks', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Why AI changes studying', 1, 6, '/media/lesson1.mp4'), ('Meet your AI study buddy', 2, 8, '/media/lesson1.mp4'), ('Writing your first prompt', 3, 9, '/media/lesson1.mp4'), ('Checking AI for mistakes', 4, 7, '/media/lesson1.mp4')) as v(title, position, minutes, video_url);

with ch as (insert into public.chapters (course_id, title, position) values ('ai-study-hacks', 'Study superpowers', 1) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-study-hacks', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Summarise any chapter in 2 minutes', 5, 10, '/media/lesson1.mp4'), ('Turn summaries into flashcards', 6, 8, '/media/lesson1.mp4'), ('Make your own practice test', 7, 11, '/media/lesson1.mp4'), ('Revision plans that stick', 8, 9, '/media/lesson1.mp4')) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('ai-for-creativity', 'AI for Creativity', 'Design. Draw. Create.', 'Make posters, comics, music and stories with AI as your creative partner, and learn what makes a creation truly yours.', 'Grade 9', '#7C3AED', '#A78BFA', array['Design', 'Creative']::text[], null, true, 1)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'ai-for-creativity';

with ch as (insert into public.chapters (course_id, title, position) values ('ai-for-creativity', 'Visual creation', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-for-creativity', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Images from words', 1, 9, null), ('Designing a poster', 2, 12, null), ('Comics with AI', 3, 10, null)) as v(title, position, minutes, video_url);

with ch as (insert into public.chapters (course_id, title, position) values ('ai-for-creativity', 'Sound and story', 1) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-for-creativity', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Make a song with AI', 4, 11, null), ('Co-writing a short story', 5, 10, null), ('Your creative portfolio', 6, 8, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('exam-mode', 'Exam Mode', 'Same facts. More marks.', 'Knowing it is not the same as scoring it. Use AI to learn how examiners mark, structure 5-mark answers and practise until full marks feel easy.', 'Grade 9', '#E11D48', '#FB7185', array['Exam prep', 'Writing']::text[], '/media/hero2.mp4', true, 2)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'exam-mode';

with ch as (insert into public.chapters (course_id, title, position) values ('exam-mode', 'Think like an examiner', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'exam-mode', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Knowing vs getting marks', 1, 7, null), ('Same facts, different marks', 2, 8, null), ('What the examiner checks', 3, 9, null)) as v(title, position, minutes, video_url);

with ch as (insert into public.chapters (course_id, title, position) values ('exam-mode', 'Write for full marks', 1) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'exam-mode', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Structure a 5-mark answer', 4, 10, null), ('Your full-marks checklist', 5, 8, null), ('Practise with AI as examiner', 6, 11, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('prompt-power', 'Prompt Power', 'Talk to AI like a pro.', 'The art and science of prompting. Roles, examples, step-by-step thinking, and how to get exactly what you want.', 'Grade 10', '#0D9488', '#5EEAD4', array['Core skill']::text[], '/media/hero3.mp4', true, 3)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'prompt-power';

with ch as (insert into public.chapters (course_id, title, position) values ('prompt-power', 'Prompt foundations', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'prompt-power', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('What a prompt really is', 1, 7, null), ('Give AI a role', 2, 8, null), ('Show, don''t tell: examples', 3, 9, null), ('Step-by-step thinking', 4, 10, null), ('Fixing bad answers', 5, 9, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('build-a-chatbot', 'Build a Chatbot', 'Your first AI project.', 'Design, build and launch your own chatbot without heavy coding. Present it to your class at the end.', 'Grade 10', '#CA8A04', '#FDE047', array['Project', 'Build']::text[], null, true, 4)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'build-a-chatbot';

with ch as (insert into public.chapters (course_id, title, position) values ('build-a-chatbot', 'Plan it', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'build-a-chatbot', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('What will your bot do?', 1, 8, null), ('Designing the conversation', 2, 10, null)) as v(title, position, minutes, video_url);

with ch as (insert into public.chapters (course_id, title, position) values ('build-a-chatbot', 'Build it', 1) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'build-a-chatbot', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Your first bot', 3, 12, null), ('Giving it knowledge', 4, 11, null), ('Testing with friends', 5, 9, null), ('Demo day', 6, 10, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('ai-and-me', 'AI & Me', 'Using AI the right way.', 'Bias, privacy, deepfakes and honesty. Become the person who knows how to use AI responsibly.', 'All grades', '#2563EB', '#60A5FA', array['Ethics', 'Safety']::text[], null, true, 5)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'ai-and-me';

with ch as (insert into public.chapters (course_id, title, position) values ('ai-and-me', 'Responsible AI', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-and-me', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Can AI be unfair?', 1, 8, null), ('Your data, your privacy', 2, 9, null), ('Spotting deepfakes', 3, 10, null), ('AI and honesty at school', 4, 7, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('ai-in-science', 'AI in Science', 'Experiments with a robot lab partner.', 'Use AI to explain, simulate and explore science topics from your syllabus.', 'Grade 9', '#059669', '#34D399', array['Science']::text[], null, true, 6)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'ai-in-science';

with ch as (insert into public.chapters (course_id, title, position) values ('ai-in-science', 'Lab partner', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'ai-in-science', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('Explain it like I''m 12', 1, 7, null), ('Simulate an experiment', 2, 10, null), ('Science project ideas', 3, 8, null)) as v(title, position, minutes, video_url);

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('data-detectives', 'Data Detectives', 'Find the story in the numbers.', 'Charts, patterns and predictions. How AI learns from data, and how you can too.', 'Grade 10', '#DB2777', '#F9A8D4', array['Data']::text[], null, true, 7)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;

delete from public.chapters where course_id = 'data-detectives';

with ch as (insert into public.chapters (course_id, title, position) values ('data-detectives', 'Data basics', 0) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select 'data-detectives', ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ('What is data?', 1, 6, null), ('Patterns everywhere', 2, 8, null), ('How AI learns', 3, 10, null), ('Make a prediction', 4, 9, null)) as v(title, position, minutes, video_url);
