-- Old progress rows had a % estimated from the furthest point reached. Once a student's real played
-- parts start arriving, the real % replaces that estimate (it could be lower); finished lessons stay
-- finished. Rows that already have parts are corrected now. (Chirag, 2026-11-15)
update public.lesson_progress
set watched_pct = least(100, round(100.0 * cardinality(seen) / ceil(video_seconds / 10.0)))::smallint
where cardinality(seen) > 0 and completed_at is null and video_seconds is not null;

create or replace function public.save_progress(p_lesson uuid, p_seconds int default null, p_completed boolean default null,
                                     p_position int default null, p_duration int default null, p_seen int[] default null)
returns int    -- % of the lesson watched (null for staff previews)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_old public.lesson_progress;
  v_len int;
  v_parts int;
  v_cap int;
  v_new int;
  v_pos int;
  v_seen int[];
  v_room int;
  v_pct int;
  v_add int;
  v_done boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then return null; end if;
  if not public.can_watch_lesson(p_lesson) then raise exception 'This lesson isn''t open for you yet'; end if;
  select * into v_old from public.lesson_progress where student_id = v_uid and lesson_id = p_lesson for update;
  -- Length: the player's real duration, else the one stored before, else the minutes typed in Content.
  v_len := case when p_duration between 30 and 14400 then p_duration end;
  v_len := coalesce(v_len, v_old.video_seconds, (select nullif(minutes, 0) * 60 from public.lessons where id = p_lesson));
  v_cap := coalesce(v_len + 600, 14400);
  v_new := least(greatest(coalesce(p_seconds, 0), 0), v_cap);
  v_pos := least(greatest(coalesce(p_position, p_seconds, 0), 0), v_cap);
  v_seen := coalesce(v_old.seen, '{}');

  if p_seen is not null and v_len is not null then
    v_parts := ceil(v_len / 10.0)::int;
    -- Parts can't be played faster than 2× real time: at most (seconds since the last save / 5) + 3 new parts per save.
    v_room := case when v_old.updated_at is null then 9
                   else greatest(extract(epoch from now() - v_old.updated_at)::int / 5, 0) + 3 end;
    v_seen := array(select distinct b from (
                select unnest(v_seen) b
                union all
                (select distinct s from unnest(p_seen) s where s between 0 and v_parts - 1 and not s = any(v_seen) order by s limit v_room)) x
              order by b);
    v_pct := least(100, round(100.0 * cardinality(v_seen) / v_parts))::int;
    v_done := v_pct >= 90;
    v_new := least(cardinality(v_seen) * 10, v_len);         -- seconds actually watched
  else
    -- Older app versions (no parts sent): the old furthest-point rule, until they update.
    v_pct := case when v_len is not null then least(100, round(100.0 * greatest(v_new, coalesce(v_old.seconds_watched, 0)) / v_len))::int end;
    v_done := v_len is not null and greatest(v_new, coalesce(v_old.seconds_watched, 0)) >= v_len * 0.9;
  end if;

  insert into public.lesson_progress as lp (student_id, lesson_id, seconds_watched, last_position_seconds, completed_at, updated_at,
                                            seen, video_seconds, watched_pct)
  values (v_uid, p_lesson, v_new, v_pos, case when v_done then now() end, now(), v_seen,
          case when p_duration between 30 and 14400 then p_duration end, coalesce(v_pct, 0))
  on conflict (student_id, lesson_id) do update set
    seconds_watched = greatest(lp.seconds_watched, excluded.seconds_watched),
    last_position_seconds = case when p_position is null and p_seconds is null then lp.last_position_seconds else excluded.last_position_seconds end,
    completed_at = coalesce(lp.completed_at, excluded.completed_at),
    seen = excluded.seen,
    video_seconds = coalesce(excluded.video_seconds, lp.video_seconds),
    -- The first real parts replace the old estimate (from the furthest point); after that it only goes up.
    watched_pct = case when cardinality(lp.seen) = 0 and cardinality(excluded.seen) > 0 then excluded.watched_pct
                       else greatest(lp.watched_pct, excluded.watched_pct) end,
    updated_at = now();

  v_add := greatest(v_new - coalesce(v_old.seconds_watched, 0), 0);
  if v_old.updated_at is not null then
    v_add := least(v_add, greatest(extract(epoch from now() - v_old.updated_at)::int, 0) + 30);
  else
    v_add := least(v_add, 60);
  end if;
  if v_add > 0 then
    insert into public.learning_days as d (student_id, day, seconds)
    values (v_uid, (now() at time zone 'Asia/Kolkata')::date, least(v_add, 21600))
    on conflict (student_id, day) do update set seconds = least(d.seconds + excluded.seconds, 21600);
  end if;
  return case when cardinality(v_seen) > 0 and coalesce(cardinality(v_old.seen), 0) = 0 then coalesce(v_pct, 0)
              else greatest(coalesce(v_pct, 0), coalesce(v_old.watched_pct, 0)) end;
end;
$$;
revoke execute on function public.save_progress(uuid, int, boolean, int, int, int[]) from public, anon;
grant execute on function public.save_progress(uuid, int, boolean, int, int, int[]) to authenticated;
