-- Maps a verified school Google account (email) to exactly one row in public.students.
-- The Hub API (service_role, server side) is the ONLY reader. No policies are created on purpose:
-- with RLS enabled and no policy, anon/authenticated users cannot read or write this table.
-- DO NOT commit the data (emails of students) to a public repository; import it directly in Supabase.

create table if not exists public.student_emails (
  email      text primary key check (email = lower(email) and email like '%@student.nssc.ac.th'),
  student_id uuid not null unique references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.student_emails enable row level security;
revoke all on public.student_emails from anon, authenticated;
