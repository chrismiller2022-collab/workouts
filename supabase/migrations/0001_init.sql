-- Kettlebell workouts schema. Run in the Supabase SQL editor (or `supabase db push`).
create extension if not exists pgcrypto;

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('swing','hinge','squat','lunge','press','pull','core','carry','full_body')),
  cues text,
  demo_url text,
  unilateral boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  notes text,
  rounds int not null default 1 check (rounds > 0),
  rest_seconds int not null default 0 check (rest_seconds >= 0),
  round_rest_seconds int not null default 0 check (round_rest_seconds >= 0),
  -- [{ name, exercise_id, category, reps, seconds, notes }]
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- The app talks to Supabase only from the server with the service role key.
-- RLS on with no policies = the public anon key can't read or write anything.
alter table exercises enable row level security;
alter table workouts enable row level security;
