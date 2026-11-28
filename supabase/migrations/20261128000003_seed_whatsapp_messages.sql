-- The 31 AiSensy templates from "Beyond Tatva AiSensy template filling guide" (27 Nov 2026), added to Studio → WhatsApp →
-- Messages in one go, so nobody has to type 31 campaign names and blanks by hand.
--
--  * 26 journey messages (j_*): added with NO blanks. The journey fills {{1}}, {{2}}… itself (first name, dates, XP, rank …);
--    a message that has blanks of its own would overwrite those values, so these must stay empty.
--  * 3 broadcasts (bt_workshop_thanks, bt_course_price, bt_offer_ends): blanks pick child name / school, prices are fixed text.
--  * 2 newsletter messages (bt_newsletter_s/_p): no blanks, linked to the j_newsletter_s/_p rules (name + title come from the rule).
-- Message key = AiSensy campaign name = template name. Each journey rule is linked to its message; every rule stays Off.
-- Photos / videos / PDFs (media header) are NOT added: upload them per message in Studio (Upload file).
-- Safe to run again: an existing message keeps its uploaded file, only its blanks, language and type are corrected.

insert into public.wa_templates (key, title, campaign, language, category, params, body, media_url, active)
select v.key, v.title, v.key, v.lang, v.cat, v.params, '', null, true
from (values
  ('bt_workshop_thanks', 'Workshop thank you (add that day''s photo)', 'kn', 'marketing', array['{student_first}', '{school}']),
  ('bt_course_price',    'Course price (add the course video)',       'kn', 'marketing', array['{student_first}', '499', '4999']),
  ('bt_offer_ends',      'Offer ends tonight',                        'kn', 'marketing', array['{student_first}', '499', '4999', '799']),
  ('bt_newsletter_s',    'Newsletter (student, add the PDF)',         'en', 'utility',   '{}'::text[]),
  ('bt_newsletter_p',    'Newsletter (parent, add the PDF)',          'kn', 'utility',   '{}'::text[])
) as v(key, title, lang, cat, params)
on conflict (key) do update set title = excluded.title, campaign = excluded.campaign, language = excluded.language,
  category = excluded.category, params = excluded.params, active = true, updated_at = now();

insert into public.wa_templates (key, title, campaign, language, category, params, body, media_url, active)
select v.key, r.title, v.key, v.lang, v.cat, '{}'::text[], '', null, true
from (values
  ('j_welcome_s', 'en', 'utility'),   ('j_welcome_p', 'kn', 'utility'),
  ('j_follow1_s', 'en', 'marketing'), ('j_follow1_p', 'kn', 'marketing'),
  ('j_follow2_s', 'en', 'marketing'), ('j_follow2_p', 'kn', 'marketing'),
  ('j_follow3_s', 'en', 'marketing'), ('j_follow3_p', 'kn', 'marketing'),
  ('j_enrolled_s', 'en', 'utility'),  ('j_enrolled_p', 'kn', 'utility'),
  ('j_quest_s', 'en', 'utility'),
  ('j_module_open_s', 'en', 'utility'), ('j_module_open_p', 'kn', 'utility'),
  ('j_module_done_s', 'en', 'utility'), ('j_module_done_p', 'kn', 'utility'),
  ('j_nudge_tue_s', 'en', 'utility'), ('j_nudge_thu_s', 'en', 'utility'), ('j_nudge_sat_s', 'en', 'utility'),
  ('j_pending_tue_s', 'en', 'utility'), ('j_pending_thu_s', 'en', 'utility'),
  ('j_parent_digest_p', 'kn', 'utility'),
  ('j_course_done_s', 'en', 'utility'), ('j_course_done_p', 'kn', 'utility'),
  ('j_review_s', 'en', 'utility'), ('j_review_p', 'kn', 'utility'),
  ('j_referral_s', 'en', 'marketing')
) as v(key, lang, cat)
join public.automation_rules r on r.key = v.key
on conflict (key) do update set title = excluded.title, campaign = excluded.campaign, language = excluded.language,
  category = excluded.category, params = '{}', active = true, updated_at = now();

-- Link each rule to its message (only where nothing is chosen yet). The rules stay Off.
update public.automation_rules r set template_key = t.key, updated_at = now()
from public.wa_templates t
where r.template_key is null and not r.custom
  and t.key = case r.key when 'j_newsletter_s' then 'bt_newsletter_s' when 'j_newsletter_p' then 'bt_newsletter_p' else r.key end;
