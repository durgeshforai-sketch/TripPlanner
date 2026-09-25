-- Memory wall: photos the group shares from past trips, plus a cover photo per
-- trip. Files live in a private Storage bucket; the database only holds paths.
-- Nothing is public: the server hands members short-lived signed URLs after it
-- has checked their session, exactly like every other trip-scoped read.

alter table tripsync.trips
  add column if not exists cover_photo_path text;

create table if not exists tripsync.memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references tripsync.trips(id) on delete cascade,
  member_id uuid references tripsync.members(id) on delete set null,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) <= 140),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0),
  width integer check (width is null or width between 1 and 10000),
  height integer check (height is null or height between 1 and 10000),
  created_at timestamptz not null default now()
);

create index if not exists memories_trip_created_idx
  on tripsync.memories (trip_id, created_at desc);
create index if not exists memories_member_id_idx on tripsync.memories (member_id);

alter table tripsync.memories enable row level security;

grant all privileges on tripsync.memories to service_role;

-- Private bucket. 5 MB hard ceiling per object; the app compresses photos in the
-- browser to well under that before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tripsync-memories',
  'tripsync-memories',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
