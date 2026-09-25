-- Tripsync initial schema.
-- All access is server-side through the service key, so RLS is enabled with no
-- policies: the publishable/anon key can read nothing even if it leaks.
-- Everything lives in a dedicated `tripsync` schema so the app never
-- collides with other projects sharing the same Supabase instance.

create extension if not exists pgcrypto;
create schema if not exists tripsync;


create table if not exists tripsync.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 400),
  invite_code text not null unique,
  status text not null default 'collecting'
    check (status in ('collecting', 'analyzing', 'deciding', 'confirmed')),
  expected_members integer not null default 5 check (expected_members between 2 and 20),
  owner_member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tripsync.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  role text not null default 'participant' check (role in ('owner', 'participant')),
  status text not null default 'joined' check (status in ('invited', 'joined', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_owner_member_fk') then
    alter table tripsync.trips
      add constraint trips_owner_member_fk
      foreign key (owner_member_id) references tripsync.members(id) on delete set null;
  end if;
end $$;

create table if not exists tripsync.participant_sessions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  member_id uuid not null references tripsync.members(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('owner', 'participant')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists tripsync.preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  member_id uuid not null references tripsync.members(id) on delete cascade,

  travel_scope text not null check (travel_scope in ('domestic', 'international', 'either')),
  destination_mode text not null check (destination_mode in ('specific', 'open')),
  desired_destinations jsonb not null default '[]'::jsonb,

  origin_city text not null,
  origin_place_id text,
  origin_latitude double precision,
  origin_longitude double precision,
  nearest_airport text,

  comfortable_budget numeric(12, 2) not null check (comfortable_budget >= 0),
  maximum_budget numeric(12, 2) not null check (maximum_budget >= 0),
  budget_flexibility text not null check (budget_flexibility in ('low', 'medium', 'high')),

  preferred_dates jsonb not null default '[]'::jsonb,
  possible_dates jsonb not null default '[]'::jsonb,
  unavailable_dates jsonb not null default '[]'::jsonb,

  min_days integer not null check (min_days between 1 and 60),
  preferred_days integer not null check (preferred_days between 1 and 60),
  max_days integer not null check (max_days between 1 and 60),

  trip_styles jsonb not null default '[]'::jsonb,
  must_haves jsonb not null default '[]'::jsonb,
  deal_breakers jsonb not null default '[]'::jsonb,

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint preferences_member_unique unique (trip_id, member_id),
  constraint preferences_budget_order check (maximum_budget >= comfortable_budget),
  constraint preferences_days_order check (min_days <= preferred_days and preferred_days <= max_days)
);

create table if not exists tripsync.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  engine_version text not null,
  snapshot jsonb,
  shortfall_reason text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists tripsync.recommendation_options (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references tripsync.recommendation_runs(id) on delete cascade,
  destination_id text not null,
  destination jsonb not null,
  rank integer not null check (rank between 1 and 10),
  group_score numeric(6, 2) not null,
  members_satisfied integer not null default 0,
  dates jsonb not null,
  duration integer not null,
  estimated_budget jsonb not null,
  flight_summary jsonb,
  travel_summary jsonb,
  activities jsonb not null default '[]'::jsonb,
  itinerary jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  top_styles jsonb not null default '[]'::jsonb,
  compromise text,
  explanation_source text not null default 'deterministic'
    check (explanation_source in ('ai', 'deterministic')),
  source_timestamps jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint recommendation_options_rank_unique unique (run_id, rank)
);

create table if not exists tripsync.option_member_fits (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references tripsync.recommendation_options(id) on delete cascade,
  member_id uuid not null references tripsync.members(id) on delete cascade,
  score numeric(6, 2) not null,
  fit_status text not null check (fit_status in ('strong', 'good', 'partial', 'not-fit')),
  matched_preferences jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  constraint option_member_fits_unique unique (option_id, member_id)
);

create table if not exists tripsync.decisions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  selected_option_id uuid references tripsync.recommendation_options(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'runoff', 'final')),
  round integer not null default 1,
  runoff_option_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_trip_unique unique (trip_id)
);

create table if not exists tripsync.decision_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  option_id uuid not null references tripsync.recommendation_options(id) on delete cascade,
  member_id uuid not null references tripsync.members(id) on delete cascade,
  round integer not null default 1,
  created_at timestamptz not null default now(),
  constraint decision_votes_unique unique (trip_id, member_id, round)
);

create index if not exists members_trip_id_idx on tripsync.members (trip_id);
create index if not exists trips_invite_code_idx on tripsync.trips (invite_code);
create index if not exists participant_sessions_trip_id_idx on tripsync.participant_sessions (trip_id);
create index if not exists participant_sessions_member_id_idx on tripsync.participant_sessions (member_id);
create index if not exists participant_sessions_token_hash_idx on tripsync.participant_sessions (token_hash);
create index if not exists preferences_trip_id_idx on tripsync.preferences (trip_id);
create index if not exists preferences_member_id_idx on tripsync.preferences (member_id);
create index if not exists recommendation_runs_trip_id_idx on tripsync.recommendation_runs (trip_id);
create index if not exists recommendation_options_run_id_idx on tripsync.recommendation_options (run_id);
create index if not exists option_member_fits_option_id_idx on tripsync.option_member_fits (option_id);
create index if not exists option_member_fits_member_id_idx on tripsync.option_member_fits (member_id);
create index if not exists decisions_trip_id_idx on tripsync.decisions (trip_id);
create index if not exists decision_votes_trip_id_idx on tripsync.decision_votes (trip_id);
create index if not exists decision_votes_option_id_idx on tripsync.decision_votes (option_id);
create index if not exists decision_votes_member_id_idx on tripsync.decision_votes (member_id);

alter table tripsync.trips enable row level security;
alter table tripsync.members enable row level security;
alter table tripsync.participant_sessions enable row level security;
alter table tripsync.preferences enable row level security;
alter table tripsync.recommendation_runs enable row level security;
alter table tripsync.recommendation_options enable row level security;
alter table tripsync.option_member_fits enable row level security;
alter table tripsync.decisions enable row level security;
alter table tripsync.decision_votes enable row level security;
