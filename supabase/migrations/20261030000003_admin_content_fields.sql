alter table public.courses add column price_inr int not null default 999;
alter table public.chapters add column thumbnail_url text;
alter table public.lessons add column description text;

update public.chapters c set thumbnail_url = v.url
from (values (0, '/media/frames/v3-0.jpg'), (1, '/media/frames/v1-1.jpg'), (2, '/media/frames/v2-0.jpg'), (3, '/media/frames/v3-6.jpg'),
             (4, '/media/frames/v1-5.jpg'), (5, '/media/frames/v1-7.jpg'), (6, '/media/frames/v3-10.jpg')) as v(pos, url)
where c.course_id = 'ai-for-students' and c.position = v.pos;

-- Real numbers for the admin overview.
create or replace function public.admin_stats() returns json
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then json_build_object(
    'students', (select count(*) from public.profiles where role = 'student'),
    'parents', (select count(*) from public.profiles where role = 'parent'),
    'teachers', (select count(*) from public.profiles where role = 'teacher'),
    'schools', (select count(*) from public.schools),
    'unlocked', (select count(*) from public.course_access),
    'keys_total', (select count(*) from public.access_keys),
    'keys_used', (select count(*) from public.access_keys where redeemed_by is not null),
    'lessons_completed', (select count(*) from public.lesson_progress where completed_at is not null),
    'watch_minutes_7d', (select coalesce(sum(seconds), 0) / 60 from public.activity_sessions where started_at > now() - interval '7 days')
  ) end;
$$;
revoke execute on function public.admin_stats from public, anon;
grant execute on function public.admin_stats to authenticated;
