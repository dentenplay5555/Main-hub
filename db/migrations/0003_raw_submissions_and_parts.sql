-- Gateway intake for exercise results, one row per submission plus one row per PART of the payload.
-- Replaces 0001 for the "main" project (public.submissions there is the old assignment-based table).
--
--   raw_submissions : the body exactly as received (never lost) + who sent it (from the verified token)
--   submission_parts: every top-level section of the body (info, outline, drafts, journey, ...) as jsonb
--   part_scores     : numeric scores the gateway recognised inside a part (TR/ME/LR/GRA/CC, score, pct)
--
-- Payloads vary from exercise to exercise (and from submission to submission), so nothing here
-- depends on a fixed JSON shape: a new part is just a new row, a missing part is just no row.

create table if not exists public.raw_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null,
  user_email      text        not null,
  exercise_id     text,
  cycle           text,
  score           numeric,
  max_score       numeric,
  raw             jsonb       not null,
  warnings        text[]      not null default '{}',
  client_ts       timestamptz,
  idempotency_key text,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create unique index if not exists raw_submissions_user_idem_uq on public.raw_submissions (user_id, idempotency_key);
create index if not exists raw_submissions_user_created_idx on public.raw_submissions (user_id, created_at desc);
create index if not exists raw_submissions_exercise_idx on public.raw_submissions (exercise_id);

create table if not exists public.submission_parts (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.raw_submissions(id) on delete cascade,
  part_key      text not null,
  data          jsonb,
  is_empty      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (submission_id, part_key)
);
create index if not exists submission_parts_key_idx on public.submission_parts (part_key);

create table if not exists public.part_scores (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.raw_submissions(id) on delete cascade,
  part_key      text not null,
  path          text not null default '',
  criterion     text not null,
  score         numeric not null
);
create index if not exists part_scores_submission_idx on public.part_scores (submission_id);

alter table public.raw_submissions  enable row level security;
alter table public.submission_parts enable row level security;
alter table public.part_scores      enable row level security;
revoke all on public.raw_submissions, public.submission_parts, public.part_scores from anon, authenticated;

-- One atomic call from the gateway: raw row + parts + scores succeed or fail together.
-- Returns {id, duplicate}. A repeated (user_id, idempotency_key) returns the original id and writes nothing.
create or replace function public.ingest_submission(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
  existing_id uuid;
begin
  insert into raw_submissions (user_id, user_email, exercise_id, cycle, score, max_score, raw, warnings,
                               client_ts, idempotency_key, user_agent)
  values ((p->>'user_id')::uuid, p->>'user_email', p->>'exercise_id', p->>'cycle',
          nullif(p->>'score','')::numeric, nullif(p->>'max_score','')::numeric,
          coalesce(p->'raw', 'null'::jsonb),
          coalesce(array(select jsonb_array_elements_text(coalesce(p->'warnings','[]'::jsonb))), '{}'),
          nullif(p->>'client_ts','')::timestamptz, nullif(p->>'idempotency_key',''), p->>'user_agent')
  on conflict (user_id, idempotency_key) do nothing
  returning id into new_id;

  if new_id is null then
    select id into existing_id from raw_submissions
     where user_id = (p->>'user_id')::uuid and idempotency_key = p->>'idempotency_key';
    return jsonb_build_object('id', existing_id, 'duplicate', true);
  end if;

  insert into submission_parts (submission_id, part_key, data, is_empty)
  select new_id, e->>'key', e->'data', coalesce((e->>'is_empty')::boolean, false)
    from jsonb_array_elements(coalesce(p->'parts','[]'::jsonb)) e
  on conflict (submission_id, part_key) do nothing;

  insert into part_scores (submission_id, part_key, path, criterion, score)
  select new_id, e->>'part_key', coalesce(e->>'path',''), e->>'criterion', (e->>'score')::numeric
    from jsonb_array_elements(coalesce(p->'scores','[]'::jsonb)) e;

  return jsonb_build_object('id', new_id, 'duplicate', false);
end;
$$;
revoke all on function public.ingest_submission(jsonb) from public, anon, authenticated;
