-- Remove the demo school and the early sample courses; only real data from here on.
delete from public.schools where code = 'SMS-UDUPI';
delete from public.courses where id <> 'ai-for-students';
