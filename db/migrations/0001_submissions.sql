-- SUPERSEDED by 0003 on the "main" project (name clash with its existing public.submissions). Kept for reference.
-- Submissions written by the gateway (services/gateway). Run in the Supabase SQL editor.
-- The gateway keeps the original payload in `raw` and fills the typed columns when it can read them.

create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null,
  user_email      text        not null,
  exercise_id     text,
  part            text,
  cycle           text,
  score           numeric,
  max_score       numeric,
  answers         jsonb,
  raw             jsonb       not null,
  warnings        text[]      not null default '{}',
  client_ts       timestamptz,
  idempotency_key text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

-- Same Idempotency-Key from the same user = same submission (retries are safe).
-- NULL keys are always distinct in Postgres, so requests without a key all insert normally.
create unique index if not exists submissions_user_idem_uq
  on public.submissions (user_id, idempotency_key);

create index if not exists submissions_user_created_idx on public.submissions (user_id, created_at desc);
create index if not exists submissions_exercise_idx     on public.submissions (exercise_id);

-- Lock the table: with RLS on and no policies, the public anon key and signed-in users can read/write nothing.
-- Only the gateway (service-role key, held as a Worker secret) can touch it.
alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
