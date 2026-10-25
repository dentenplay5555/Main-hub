-- Applied to Supabase project "main" (uifwhdshcxhqzjhcgzeg) on 2026-10-25 as migration `harden_views_and_grants`.
-- Context: the project already has students / student_emails / assignments / submissions /
-- rubric_criteria / writing_assessments / writing_assessment_scores + 3 report views.
-- NOTE: 0001_submissions.sql (gateway raw intake) clashes with the existing public.submissions
-- (assignment-based). Do NOT run 0001 on this project; the gateway table will be renamed raw_submissions.

alter view public.writing_assessment_wide  set (security_invoker = true);
alter view public.writing_assessment_items set (security_invoker = true);
alter view public.writing_assessment_final set (security_invoker = true);

revoke all on public.writing_assessment_wide, public.writing_assessment_items, public.writing_assessment_final from anon, authenticated;
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
revoke insert, update, delete on public.students, public.assignments, public.rubric_criteria,
  public.writing_assessments, public.writing_assessment_scores from authenticated;
revoke delete on public.submissions from authenticated;

create policy "rubric criteria are viewable by authenticated users"
  on public.rubric_criteria for select to authenticated using (true);

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
