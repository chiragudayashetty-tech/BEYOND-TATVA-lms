// Prints seed SQL for the demo school and the course catalogue in src/lib/catalog.js.
// Usage: node scripts/seed-sql.mjs > supabase/seed.sql
import { courses } from "../src/lib/catalog.js";

const q = (v) => (v == null ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;

const out = [];
out.push(`insert into public.schools (name, city, code, teacher_code) values ('St. Mary''s School', 'Udupi', 'SMS-UDUPI', 'SMS-TEACH-7Q4') on conflict (code) do nothing;`);
out.push(`insert into public.classes (school_id, name, grade)
select id, g.name, g.grade from public.schools, (values ('Grade 8 · A', 8), ('Grade 9 · A', 9), ('Grade 10 · A', 10)) as g(name, grade)
where code = 'SMS-UDUPI' and not exists (select 1 from public.classes c where c.school_id = schools.id and c.grade = g.grade);`);

courses.forEach((c, ci) => {
  out.push(`insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values (${q(c.id)}, ${q(c.title)}, ${q(c.tagline)}, ${q(c.description)}, ${q(c.grade)}, ${q(c.color)}, ${q(c.color2)}, ${arr(c.tags)}, ${q(c.hero)}, true, ${ci})
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, grade = excluded.grade,
  color = excluded.color, color2 = excluded.color2, tags = excluded.tags, hero_url = excluded.hero_url, position = excluded.position;`);
  out.push(`delete from public.chapters where course_id = ${q(c.id)};`);
  c.chapters.forEach((ch, chi) => {
    const lessons = ch.lessons
      .map((l) => `(${q(l.title)}, ${l.n}, ${l.mins}, ${q(c.id === "ai-study-hacks" ? "/media/lesson1.mp4" : null)})`)
      .join(", ");
    out.push(`with ch as (insert into public.chapters (course_id, title, position) values (${q(c.id)}, ${q(ch.title)}, ${chi}) returning id)
insert into public.lessons (course_id, chapter_id, title, position, minutes, video_url)
select ${q(c.id)}, ch.id, v.title, v.position, v.minutes, v.video_url from ch, (values ${lessons}) as v(title, position, minutes, video_url);`);
  });
});

console.log(out.join("\n\n"));
