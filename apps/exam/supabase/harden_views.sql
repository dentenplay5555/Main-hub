-- NOT APPLIED YET. Run only after confirming nothing reads these views with the anon key
-- (the Hub API uses service_role, which bypasses RLS and is unaffected).
-- Problem: the views are SECURITY DEFINER-like (owner = postgres) and `anon` has SELECT on them,
-- so anyone with the public anon key can read every student's name, class and scores.

alter view public.writing_assessment_wide  set (security_invoker = true);
alter view public.writing_assessment_items set (security_invoker = true);
alter view public.writing_assessment_final set (security_invoker = true);

revoke all on public.writing_assessment_wide,
              public.writing_assessment_items,
              public.writing_assessment_final
  from anon;
