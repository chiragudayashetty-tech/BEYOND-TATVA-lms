-- Security advisor 2026-11-20: the automation trigger functions were still callable by signed-in users
-- at /rest/v1/rpc/automation_on_*. They only work as triggers (calling them errors), but nothing outside
-- the database should reach them. Triggers keep working: they run as the table owner, not the caller.
revoke all on function public.automation_on_lead(), public.automation_on_purchase(), public.automation_on_student()
  from public, anon, authenticated;
