-- Road, rail and coach travel alongside flights, plus the modes each member is
-- willing to use. Flying a 200 km hop is neither cheaper nor faster once
-- airport time is counted, so options now carry every practical mode.

alter table tripsync.recommendation_options
  add column if not exists transport_summary jsonb;

alter table tripsync.preferences
  add column if not exists transport_modes jsonb not null default '["fly","train","bus","drive"]'::jsonb;
