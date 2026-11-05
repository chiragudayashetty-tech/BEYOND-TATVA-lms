-- Module posters (square images in public/media/modules), shown on course and dashboard cards.
-- Module 5 keeps its icon until its poster is ready. Can be changed any time in Studio → Content.
update public.chapters set thumbnail_url = '/media/modules/module-' || position || '.jpg'
where course_id = 'ai-for-students' and position between 0 and 4;

-- Course value on the printed pamphlet: ₹3,000 (shown crossed out next to the price on the website and LMS).
update public.courses set list_price_inr = 3000 where id = 'ai-for-students' and price_inr <= 3000;
